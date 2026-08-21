import { MealPlan } from '@/types/meal-plan';
import { RecipeIngredient } from '@/types/recipe';
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

function planWithIngredients(mealIngredients: RecipeIngredient[][]): MealPlan {
  const meals = mealIngredients.map((ingredients, index) => ({
    id: `meal-${index + 1}`,
    dayIndex: 0,
    mealType: 'dinner' as const,
    recipeId: `recipe-${index + 1}`,
    recipeSnapshot: {
      id: `recipe-${index + 1}`,
      title: `recipe-${index + 1}`,
      summary: 'test',
      servings: 2,
      preparationMinutes: 20,
      ingredients,
      steps: ['Cook'],
      expiryPriority: 'none' as const,
      confidence: 1,
    },
    coveragePercent: 0,
    missingIngredients: [],
    usesExpiringIngredients: false,
    reasons: [],
  }));
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Test plan',
    version: 1,
    startDate: '2026-08-21T00:00:00.000Z',
    endDate: '2026-08-23T00:00:00.000Z',
    preferences: { people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true },
    days: [{ date: '2026-08-21T00:00:00.000Z', meals }],
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
      mealTitles: ['meal-1', 'meal-2'],
      quantityConfidence: 'exact',
    })]);
  });

  it('combines compatible-but-different units into a single requirement', () => {
    const requirements = deriveMealRequirements(planWithIngredients([
      [{ name: 'Milk', quantity: 500, unit: 'ml', status: 'missing', matchedInventoryItemIds: [] }],
      [{ name: 'Milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }],
    ]));

    expect(requirements).toEqual([expect.objectContaining({
      normalizedName: 'milk',
      quantity: 1500,
      unit: 'ml',
      quantityConfidence: 'exact',
    })]);
  });

  it('marks quantity as unknown when no contributing meal has a known quantity', () => {
    const requirements = deriveMealRequirements(planWithIngredients([
      [{ name: 'Salt', quantity: null, unit: null, status: 'missing', matchedInventoryItemIds: [] }],
      [{ name: 'Salt', quantity: null, unit: null, status: 'missing', matchedInventoryItemIds: [] }],
    ]));

    expect(requirements).toEqual([expect.objectContaining({
      normalizedName: 'salt',
      quantity: null,
      quantityConfidence: 'unknown',
    })]);
  });

  it('marks quantity as approximate when some but not all contributions are reconcilable', () => {
    const requirements = deriveMealRequirements(planWithIngredients([
      [{ name: 'Rice', quantity: 200, unit: 'g', status: 'missing', matchedInventoryItemIds: [] }],
      [{ name: 'Rice', quantity: null, unit: null, status: 'missing', matchedInventoryItemIds: [] }],
    ]));

    expect(requirements).toEqual([expect.objectContaining({
      normalizedName: 'rice',
      quantity: 200,
      quantityConfidence: 'approximate',
    })]);
  });

  it('marks quantity as approximate when units are incompatible', () => {
    const requirements = deriveMealRequirements(planWithIngredients([
      [{ name: 'Eggs', quantity: 2, unit: 'unit', status: 'missing', matchedInventoryItemIds: [] }],
      [{ name: 'Eggs', quantity: 100, unit: 'g', status: 'missing', matchedInventoryItemIds: [] }],
    ]));

    expect(requirements).toEqual([expect.objectContaining({
      normalizedName: 'egg',
      quantity: 2,
      unit: 'unit',
      quantityConfidence: 'approximate',
    })]);
  });
});