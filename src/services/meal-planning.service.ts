import { inventoryService } from '@/services';
import { MealPlan, MealPlanDay, MealPlanMeal, MealPlanningPreferences } from '@/types/meal-plan';
import { RecipeSuggestion } from '@/types/recipe';
import { getCurrentISOString } from '@/utils/date';
import { generateUUID } from '@/utils/id';
import { RecipeProvider } from './ai/recipe.provider';
import { mealPlanningPreferencesSchema, recipeSuggestionSchema } from './meal-plan.schemas';
import { CandidateEvaluation } from './meal-planning/candidate-scoring';
import { createInventoryFingerprint } from './meal-planning/inventory-fingerprint';
import { buildInventorySnapshot, PlanningInventoryItem } from './meal-planning/inventory-snapshot';
import { rankMealCandidates, selectMealCandidates } from './meal-planning/meal-plan-generator';

export class MealPlanningService {
  constructor(private recipeProvider: RecipeProvider) {}

  async getCandidates(preferences: MealPlanningPreferences): Promise<RecipeSuggestion[]> {
    const validatedPreferences = mealPlanningPreferencesSchema.parse(preferences);
    const inventory = await inventoryService.getItems();
    const snapshot = buildInventorySnapshot(inventory);
    return this.getCandidatesFromSnapshot(snapshot, validatedPreferences);
  }

  async getCurrentInventoryFingerprint(): Promise<string> {
    const inventory = await inventoryService.getItems();
    return createInventoryFingerprint(inventory);
  }

  async generatePlan(preferences: MealPlanningPreferences): Promise<MealPlan> {
    const validatedPreferences = mealPlanningPreferencesSchema.parse(preferences);
    const mealTypes = validatedPreferences.mealTypes?.length ? validatedPreferences.mealTypes : [validatedPreferences.mealType];
    const referenceDate = new Date();
    const inventory = await inventoryService.getItems();
    const snapshot = buildInventorySnapshot(inventory, referenceDate);
    const meals: MealPlanMeal[] = [];
    for (const mealType of mealTypes) {
      const mealPreferences = { ...validatedPreferences, mealType };
      const candidates = await this.getCandidatesFromSnapshot(snapshot, mealPreferences);
      const selected = selectMealCandidates(candidates, snapshot, mealPreferences);
      meals.push(...selected.map((evaluation, dayIndex) => this.toMeal(dayIndex, mealPreferences, evaluation)));
    }
    const now = getCurrentISOString();
    const startDate = new Date(now);
    const days: MealPlanDay[] = Array.from({ length: validatedPreferences.days }, (_, dayIndex) => {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + dayIndex);
      return { date: date.toISOString(), meals: meals.filter((meal) => meal.dayIndex === dayIndex) };
    });
    const endDate = days[days.length - 1]?.date || now;
    return {
      id: generateUUID(),
      title: mealTypes.length === 1
        ? meals.length === validatedPreferences.days
          ? `${validatedPreferences.days}-day ${validatedPreferences.mealType} plan`
          : `${meals.length} of ${validatedPreferences.days}-day ${validatedPreferences.mealType} plan`
        : meals.length === validatedPreferences.days * mealTypes.length
          ? `${validatedPreferences.days}-day meal plan`
          : `${meals.length} of ${validatedPreferences.days * mealTypes.length}-meal plan`,
      version: 1,
      startDate: days[0]?.date || now,
      endDate,
      preferences: validatedPreferences,
      days,
      meals,
      inventorySnapshotAt: now,
      inventoryFingerprint: createInventoryFingerprint(inventory),
      createdAt: now,
      updatedAt: now,
      status: 'draft',
    };
  }

  async getReplacementCandidates(
    plan: MealPlan,
    dayIndex: number,
    rejectedRecipeIds: string[] = [],
    limit = 3
  ): Promise<MealPlanMeal[]> {
    const validatedPreferences = mealPlanningPreferencesSchema.parse(plan.preferences);
    const inventory = await inventoryService.getItems();
    const snapshot = buildInventorySnapshot(inventory);
    const candidates = await this.getCandidatesFromSnapshot(snapshot, validatedPreferences);
    const currentRecipeId = plan.days
      .flatMap((day) => day.meals)
      .find((meal) => meal.dayIndex === dayIndex)?.recipeId;
    const ranked = rankMealCandidates(
      candidates,
      snapshot,
      validatedPreferences,
      [currentRecipeId, ...rejectedRecipeIds].filter((id): id is string => Boolean(id))
    );

    return ranked
      .slice(0, limit)
      .map((evaluation) => this.toMeal(dayIndex, validatedPreferences, evaluation));
  }

  replaceMeal(plan: MealPlan, dayIndex: number, candidate: MealPlanMeal | RecipeSuggestion): MealPlan {
    const currentMeal = plan.days
      .flatMap((day) => day.meals)
      .find((meal) => meal.dayIndex === dayIndex);
    if (!currentMeal) return plan;

    const replacement = this.toReplacementMeal(dayIndex, plan.preferences, currentMeal.id, candidate);
    const days = plan.days.map((day) => {
      if (!day.meals.some((meal) => meal.dayIndex === dayIndex)) return day;
      return {
        ...day,
        meals: day.meals.map((meal) => meal.dayIndex === dayIndex ? replacement : meal),
      };
    });
    const meals = days.flatMap((day) => day.meals);

    return {
      ...plan,
      days,
      meals,
      status: 'draft',
      updatedAt: getCurrentISOString(),
    };
  }

  private toReplacementMeal(
    dayIndex: number,
    preferences: MealPlanningPreferences,
    existingMealId: string,
    candidate: MealPlanMeal | RecipeSuggestion
  ): MealPlanMeal {
    if ('recipeSnapshot' in candidate) {
      return { ...candidate, id: existingMealId, dayIndex };
    }

    return this.toMealFromRecipe(dayIndex, preferences, candidate, existingMealId);
  }

  private async getCandidatesFromSnapshot(
    snapshot: PlanningInventoryItem[],
    preferences: MealPlanningPreferences
  ): Promise<RecipeSuggestion[]> {
    const candidates = await this.recipeProvider.generate({
      inventory: snapshot.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      })),
      servings: preferences.people,
      prioritizeExpiring: preferences.prioritizeExpiring,
      maxMinutes: 45,
      planning: {
        days: preferences.days,
        mealType: preferences.mealType,
        useSoonInventoryItemIds: snapshot.filter((item) => item.useSoon).map((item) => item.inventoryItemId),
      },
      prompt: [
        preferences.includeIngredients?.length ? `Include: ${preferences.includeIngredients.join(', ')}` : '',
        preferences.excludeIngredients?.length ? `Exclude: ${preferences.excludeIngredients.join(', ')}` : '',
        preferences.fixedExclusions?.length ? `Fixed exclusions (allergies/dislikes): ${preferences.fixedExclusions.join(', ')}` : '',
        preferences.includeSavedRecipes ? 'Prefer saved household recipes where suitable.' : '',
      ].filter(Boolean).join(' '),
    });

    return candidates
      .map((candidate) => recipeSuggestionSchema.safeParse(candidate))
      .filter((result): result is { success: true; data: RecipeSuggestion } => result.success)
      .map((result) => result.data);
  }

  private toMeal(dayIndex: number, preferences: MealPlanningPreferences, evaluation: CandidateEvaluation): MealPlanMeal {
    return {
      id: generateUUID(),
      dayIndex,
      mealType: preferences.mealType,
      recipeId: evaluation.recipe.id,
      recipeSnapshot: evaluation.recipe,
      coveragePercent: evaluation.coveragePercent,
      missingIngredients: evaluation.missingIngredients,
      usesExpiringIngredients: evaluation.usesExpiringIngredients,
      reasons: evaluation.reasons,
    };
  }

  private toMealFromRecipe(dayIndex: number, preferences: MealPlanningPreferences, recipe: RecipeSuggestion, id = generateUUID()): MealPlanMeal {
    const available = recipe.ingredients.filter((ingredient) => ingredient.status === 'available').length;
    const missingIngredients = recipe.ingredients
      .filter((ingredient) => ingredient.status !== 'available')
      .map((ingredient) => ingredient.name);
    const coveragePercent = recipe.ingredients.length
      ? Math.round((available / recipe.ingredients.length) * 100)
      : 0;
    const reasons = [
      coveragePercent >= 75 ? 'Uses ingredients already in inventory.' : 'Provides a practical way to use available food.',
      ...(recipe.expiryPriority === 'high' && preferences.prioritizeExpiring ? ['Uses food approaching expiry.'] : []),
      ...(missingIngredients.length <= 1 ? ['Requires few additional ingredients.'] : []),
      ...(recipe.preparationMinutes === null || recipe.preparationMinutes <= 30 ? ['Has a reasonable preparation time.'] : []),
    ];
    return {
      id,
      dayIndex,
      mealType: preferences.mealType,
      recipeId: recipe.id,
      recipeSnapshot: recipe,
      coveragePercent,
      missingIngredients,
      usesExpiringIngredients: recipe.expiryPriority === 'high',
      reasons,
    };
  }

}
