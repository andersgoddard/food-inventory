import { MealPlanMeal } from '@/types/meal-plan';
import { getMealAvailability } from './meal-plan-presentation';

function meal(overrides: Partial<MealPlanMeal> = {}): MealPlanMeal {
  return {
    id: 'meal-1',
    dayIndex: 0,
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeSnapshot: {
      id: 'recipe-1',
      title: 'Dinner',
      summary: 'A dinner.',
      servings: 2,
      preparationMinutes: 20,
      ingredients: [],
      steps: ['Cook'],
      expiryPriority: 'none',
      confidence: 1,
    },
    coveragePercent: 100,
    missingIngredients: [],
    usesExpiringIngredients: false,
    reasons: ['Uses inventory.'],
    ...overrides,
  };
}

describe('meal-plan presentation state', () => {
  it.each([
    [{ coveragePercent: 100, missingIngredients: [] }, 'available'],
    [{ coveragePercent: 50, missingIngredients: ['Rice'] }, 'partial'],
    [{ coveragePercent: 0, missingIngredients: ['Rice'] }, 'missing'],
  ])('classifies %o as %s', (overrides, expected) => {
    expect(getMealAvailability(meal(overrides))).toBe(expected);
  });

  it('does not mutate the meal model while classifying it', () => {
    const current = meal({ missingIngredients: ['Rice'] });
    const before = JSON.parse(JSON.stringify(current));

    getMealAvailability(current);

    expect(current).toEqual(before);
  });
});