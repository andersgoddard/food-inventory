import { MealPlan } from '@/types/meal-plan';
import { deriveMealRequirements } from './meal-requirements';

function plan(): MealPlan {
  const meal = (id: string, quantity: number): MealPlan['days'][number]['meals'][number] => ({
    id,
    dayIndex: 0,
    mealType: 'dinner',
    recipeId: id,
    recipeSnapshot: {
      id,
      title: id,
      summary: 'test',
      servings: 2,
      preparationMinutes: 20,
      ingredients: [{ name: 'Chicken', quantity, unit: 'g', status: 'missing', matchedInventoryItemIds: [] }],
      steps: ['Cook'],
      expiryPriority: 'none',
      confidence: 1,
    },
    coveragePercent: 0,
    missingIngredients: ['Chicken'],
    usesExpiringIngredients: false,
    reasons: [],
  });
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Test plan',
    version: 1,
    startDate: '2026-08-21T00:00:00.000Z',
    endDate: '2026-08-23T00:00:00.000Z',
    preferences: { people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true },
    days: [{ date: '2026-08-21T00:00:00.000Z', meals: [meal('meal-1', 250), meal('meal-2', 400)] }],
    meals: [],
    inventorySnapshotAt: '2026-08-21T00:00:00.000Z',
    createdAt: '2026-08-21T00:00:00.000Z',
    updatedAt: '2026-08-21T00:00:00.000Z',
    status: 'draft',
  };
}

describe('meal requirements', () => {
  it('aggregates equivalent ingredients deterministically across meals', () => {
    expect(deriveMealRequirements(plan())).toEqual([expect.objectContaining({
      normalizedName: 'chicken',
      quantity: 650,
      unit: 'g',
      mealIds: ['meal-1', 'meal-2'],
    })]);
  });
});