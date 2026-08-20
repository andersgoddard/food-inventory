import { PLANNING_MAX_PREPARATION_MINUTES } from '@/constants/meal-planning';
import { MealPlanningPreferences } from '@/types/meal-plan';
import { RecipeSuggestion } from '@/types/recipe';
import { IngredientMatch, matchIngredient } from './ingredient-matcher';
import { PlanningInventoryItem, normalizeIngredientName } from './inventory-snapshot';

export interface CandidateEvaluation {
  recipe: RecipeSuggestion;
  matches: IngredientMatch[];
  availableCount: number;
  partialCount: number;
  missingCount: number;
  coveragePercent: number;
  missingIngredients: string[];
  usesExpiringIngredients: boolean;
  expiryPriority: RecipeSuggestion['expiryPriority'];
  dominantIngredient: string | null;
  score: number;
  reasons: string[];
}

function isMeaningfulRecipe(recipe: RecipeSuggestion): boolean {
  return recipe.id.trim().length > 0
    && recipe.title.trim().length > 0
    && recipe.ingredients.length > 0
    && recipe.steps.some((step) => step.trim().length > 0);
}

export function evaluateCandidate(
  recipe: RecipeSuggestion,
  inventory: PlanningInventoryItem[],
  preferences: MealPlanningPreferences,
  recentIngredients: string[] = []
): CandidateEvaluation | null {
  if (!isMeaningfulRecipe(recipe)) return null;

  const matches = recipe.ingredients.map((ingredient) => matchIngredient(ingredient, inventory));
  const availableCount = matches.filter((match) => match.status === 'available').length;
  const partialCount = matches.filter((match) => match.status === 'partial').length;
  const missingCount = matches.filter((match) => match.status === 'missing').length;
  if (availableCount + partialCount === 0) return null;
  const coveragePercent = Math.round((availableCount / matches.length) * 100);
  const missingIngredients = matches
    .filter((match) => match.status !== 'available')
    .map((match) => match.name);
  const usesExpiringIngredients = preferences.prioritizeExpiring
    && matches.some((match) => match.useSoonInventoryItemIds.length > 0 && match.status !== 'missing');
  const expiryPriority = usesExpiringIngredients
    ? 'high'
    : availableCount + partialCount > 0 ? 'normal' : 'none';
  const dominantIngredient = matches.find((match) => match.status !== 'missing')?.normalizedName
    || normalizeIngredientName(recipe.ingredients[0]?.name || '');
  const repeatedIngredientPenalty = dominantIngredient && recentIngredients.includes(dominantIngredient) ? 8 : 0;
  const preparationPenalty = recipe.preparationMinutes !== null
    && recipe.preparationMinutes > PLANNING_MAX_PREPARATION_MINUTES
    ? Math.min(20, recipe.preparationMinutes - PLANNING_MAX_PREPARATION_MINUTES)
    : 0;
  const servingPenalty = recipe.servings < preferences.people ? 15 : 0;
  const score = coveragePercent
    + (usesExpiringIngredients ? 15 : 0)
    - (missingCount * 8)
    - (partialCount * 4)
    - repeatedIngredientPenalty
    - preparationPenalty
    - servingPenalty;
  const reasons = [
    `Uses ${availableCount + partialCount} ingredients already in your inventory.`,
    ...(usesExpiringIngredients ? ['Uses food approaching its use-by date.'] : []),
    ...(missingCount === 0 && partialCount === 0
      ? ['All required ingredients are available.']
      : [`Only ${missingCount + partialCount} ingredient${missingCount + partialCount === 1 ? '' : 's'} need attention.`]),
    ...(repeatedIngredientPenalty === 0 && recentIngredients.length > 0 ? ['Adds variety compared with recent meals.'] : []),
    ...(preparationPenalty === 0 ? ['Fits the practical preparation-time limit.'] : ['Takes longer than the practical preparation-time limit.']),
    ...(servingPenalty > 0 ? [`Makes fewer than ${preferences.people} servings.`] : []),
  ];

  return {
    recipe: {
      ...recipe,
      expiryPriority,
    },
    matches,
    availableCount,
    partialCount,
    missingCount,
    coveragePercent,
    missingIngredients,
    usesExpiringIngredients,
    expiryPriority,
    dominantIngredient: dominantIngredient || null,
    score,
    reasons,
  };
}