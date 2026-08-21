import { inventoryService } from '@/services';
import { RecipeSuggestion } from '@/types/recipe';
import { MockRecipeProvider } from './ai/mock-recipe.provider';
import { MealPlanningService } from './meal-planning.service';

jest.mock('@/services', () => ({
  inventoryService: {
    getItems: jest.fn().mockResolvedValue([
      {
        id: 'milk-1',
        name: 'Milk',
        category: 'dairy',
        location: 'fridge',
        quantity: 1,
        unit: 'l',
        purchaseDate: '2026-08-18T00:00:00.000Z',
        expiryDate: '2026-08-22T00:00:00.000Z',
        purchasePrice: null,
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      },
    ]),
  },
}));

function candidate(id: string, title = id): RecipeSuggestion {
  return {
    id,
    title,
    summary: `${title} summary`,
    servings: 2,
    preparationMinutes: 20,
    ingredients: [{
      name: 'milk',
      quantity: 1,
      unit: 'l',
      status: 'missing',
      matchedInventoryItemIds: [],
      substitution: null,
    }],
    steps: ['Cook the meal.'],
    expiryPriority: 'normal',
    confidence: 0.9,
  };
}

describe('MealPlanningService', () => {
  it('generates a multi-day dinner plan from inventory context', async () => {
    const service = new MealPlanningService(new MockRecipeProvider());
    const plan = await service.generatePlan({
      people: 2,
      days: 7,
      mealType: 'dinner',
      prioritizeExpiring: true,
    });

    expect(plan.meals).toHaveLength(1);
    expect(plan.title).toBe('1 of 7-day dinner plan');
    expect(plan.meals.every((meal) => meal.mealType === 'dinner')).toBe(true);
    expect(plan.meals.some((meal) => meal.usesExpiringIngredients)).toBe(true);
    expect(inventoryService.getItems).toHaveBeenCalledTimes(1);
  });

  it('replaces only the requested day and leaves inventory untouched', async () => {
    const service = new MealPlanningService(new MockRecipeProvider());
    const plan = await service.generatePlan({
      people: 2,
      days: 3,
      mealType: 'dinner',
      prioritizeExpiring: false,
    });
    const originalOtherMeal = plan.meals.find((meal) => meal.dayIndex === 1);
    const replacement = new MockRecipeProvider();
    const candidates = await replacement.generate({
      inventory: [],
      servings: 2,
      prioritizeExpiring: false,
    });
    const updated = service.replaceMeal(plan, 0, candidates[1]);

    expect(updated.meals.find((meal) => meal.dayIndex === 0)?.recipeId).toBe(candidates[1].id);
    expect(updated.days.find((day) => day.meals[0]?.dayIndex === 0)?.meals[0]?.recipeId).toBe(candidates[1].id);
    expect(updated.meals.find((meal) => meal.dayIndex === 1)?.recipeId).toBe(originalOtherMeal?.recipeId);
    expect(inventoryService.getItems).toHaveBeenCalledTimes(2);
  });

  it('does not fabricate a plan when the provider returns malformed candidates', async () => {
    const service = new MealPlanningService({
      generate: async () => [{ id: '', title: '', ingredients: [] } as never],
    });

    const plan = await service.generatePlan({
      people: 2,
      days: 3,
      mealType: 'dinner',
      prioritizeExpiring: true,
    });

    expect(plan.meals).toEqual([]);
    expect(plan.title).toBe('0 of 3-day dinner plan');
  });

  it('leaves inventory data deeply unchanged while generating a plan', async () => {
    const before = JSON.parse(JSON.stringify(await inventoryService.getItems()));
    const service = new MealPlanningService(new MockRecipeProvider());

    await service.generatePlan({
      people: 2,
      days: 3,
      mealType: 'dinner',
      prioritizeExpiring: true,
    });

    expect(await inventoryService.getItems()).toEqual(before);
  });

  it('returns ranked alternatives excluding the current recipe and rejected IDs', async () => {
    let providerInventory: unknown[] = [];
    const service = new MealPlanningService({
      generate: async (request) => {
        providerInventory = request.inventory;
        return [candidate('aaa-current'), candidate('alternative-a'), candidate('alternative-b')];
      },
    });
    const plan = await service.generatePlan({ people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true });

    const alternatives = await service.getReplacementCandidates(plan, 0, ['alternative-a']);

    expect(providerInventory).toEqual([
      expect.objectContaining({ inventoryItemId: 'milk-1', name: 'Milk', quantity: 1, unit: 'l' }),
    ]);
    expect(alternatives.map((meal) => meal.recipeId)).toEqual(['alternative-b']);
    expect(alternatives[0]).toMatchObject({
      coveragePercent: 100,
      missingIngredients: [],
      usesExpiringIngredients: true,
      reasons: expect.any(Array),
    });
  });

  it('sends meal-planning context to the provider', async () => {
    const generate = jest.fn().mockResolvedValue([candidate('planning-candidate')]);
    const service = new MealPlanningService({ generate });

    await service.generatePlan({ people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true });

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      servings: 2,
      planning: expect.objectContaining({
        days: 3,
        mealType: 'dinner',
        useSoonInventoryItemIds: ['milk-1'],
      }),
    }));
  });

  it('replaces only one canonical day and preserves evaluated metadata as a draft', async () => {
    const service = new MealPlanningService({
      generate: async () => [candidate('one'), candidate('two'), candidate('three')],
    });
    const plan = await service.generatePlan({ people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true });
    const originalDays = plan.days.filter((day) => day.meals[0]?.dayIndex !== 1);
    const alternative = (await service.getReplacementCandidates(plan, 1))[0];
    const updated = service.replaceMeal(plan, 1, alternative);

    expect(updated.status).toBe('draft');
    expect(updated.days.find((day) => day.meals[0]?.dayIndex === 1)?.meals[0]).toMatchObject({
      recipeId: alternative.recipeId,
      coveragePercent: alternative.coveragePercent,
      missingIngredients: alternative.missingIngredients,
      reasons: alternative.reasons,
    });
    expect(updated.days.filter((day) => day.meals[0]?.dayIndex !== 1)).toEqual(originalDays);
  });

  it('uses canonical days even when the compatibility meals projection is incomplete', async () => {
    const service = new MealPlanningService({
      generate: async () => [candidate('one'), candidate('two'), candidate('three')],
    });
    const plan = await service.generatePlan({ people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true });
    const planWithIncompleteProjection = {
      ...plan,
      meals: plan.meals.filter((meal) => meal.dayIndex !== 1),
    };
    const alternative = (await service.getReplacementCandidates(plan, 1))[0];
    const updated = service.replaceMeal(planWithIncompleteProjection, 1, alternative);

    expect(updated.days.find((day) => day.meals[0]?.dayIndex === 1)?.meals[0]?.recipeId).toBe(alternative.recipeId);
    expect(updated.meals).toHaveLength(updated.days.flatMap((day) => day.meals).length);
  });

  it('keeps the current meal unchanged when no alternative exists', async () => {
    const service = new MealPlanningService({
      generate: async () => [candidate('only-recipe')],
    });
    const plan = await service.generatePlan({ people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true });
    const alternatives = await service.getReplacementCandidates(plan, 0);

    expect(alternatives).toEqual([]);
    expect(plan.days[0].meals[0].recipeId).toBe('only-recipe');
  });

  it('propagates provider errors without changing the plan', async () => {
    const service = new MealPlanningService({
      generate: async () => [candidate('only-recipe')],
    });
    const plan = await service.generatePlan({ people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true });
    const before = JSON.parse(JSON.stringify(plan));
    const failingService = new MealPlanningService({
      generate: async () => { throw new Error('provider unavailable'); },
    });

    await expect(failingService.getReplacementCandidates(plan, 0)).rejects.toThrow('provider unavailable');
    expect(plan).toEqual(before);
  });
});
