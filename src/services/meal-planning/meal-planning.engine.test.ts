import { InventoryItem } from '@/types/inventory';
import { MealPlanningPreferences } from '@/types/meal-plan';
import { RecipeSuggestion } from '@/types/recipe';
import { evaluateCandidate } from './candidate-scoring';
import { matchIngredient } from './ingredient-matcher';
import { buildInventorySnapshot, normalizeIngredientName } from './inventory-snapshot';
import { selectMealCandidates } from './meal-plan-generator';

const referenceDate = new Date('2026-08-19T12:00:00.000Z');
const preferences: MealPlanningPreferences = {
  people: 2,
  days: 7,
  mealType: 'dinner',
  prioritizeExpiring: true,
};

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inventory-1',
    name: 'Milk',
    category: 'dairy',
    location: 'fridge',
    quantity: 1,
    unit: 'l',
    purchaseDate: '2026-08-01T00:00:00.000Z',
    expiryDate: '2026-08-21T00:00:00.000Z',
    purchasePrice: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function recipe(id: string, ingredients: RecipeSuggestion['ingredients']): RecipeSuggestion {
  return {
    id,
    title: id,
    summary: 'A useful dinner.',
    servings: 2,
    preparationMinutes: 30,
    ingredients,
    steps: ['Prepare the ingredients.', 'Cook and serve.'],
    expiryPriority: 'normal',
    confidence: 0.8,
  };
}

describe('deterministic meal-planning engine', () => {
  it('normalizes case, punctuation, and reasonable singular/plural forms', () => {
    expect(normalizeIngredientName('Fresh, TOMATOES!')).toBe('fresh tomato');
    expect(normalizeIngredientName('Chicken breasts')).toBe('chicken breast');
  });

  it('builds use-soon and expiry signals without treating invalid or expired dates as desirable', () => {
    const snapshot = buildInventorySnapshot([
      inventoryItem({ id: 'expired', expiryDate: '2026-08-18T00:00:00.000Z' }),
      inventoryItem({ id: 'today', expiryDate: '2026-08-19T23:59:59.000Z' }),
      inventoryItem({ id: 'later', expiryDate: '2026-08-30T00:00:00.000Z' }),
      inventoryItem({ id: 'unknown', expiryDate: 'not-a-date' }),
      inventoryItem({ id: 'none', expiryDate: null }),
    ], referenceDate);

    expect(snapshot.find((item) => item.inventoryItemId === 'expired')).toMatchObject({ isExpired: true, useSoon: false });
    expect(snapshot.find((item) => item.inventoryItemId === 'today')).toMatchObject({ isExpired: false, useSoon: true });
    expect(snapshot.find((item) => item.inventoryItemId === 'later')).toMatchObject({ isExpired: false, useSoon: false });
    expect(snapshot.find((item) => item.inventoryItemId === 'unknown')).toMatchObject({ expiryDateValid: false, useSoon: false });
    expect(snapshot.find((item) => item.inventoryItemId === 'none')).toMatchObject({ expiryDateValid: false, useSoon: false });
  });

  it('matches exact names and quantities conservatively', () => {
    const snapshot = buildInventorySnapshot([
      inventoryItem({ id: 'milk', quantity: 500, unit: 'ml' }),
      inventoryItem({ id: 'tomatoes', name: 'Tomatoes', quantity: 2, unit: 'unit', category: 'fruit' }),
    ], referenceDate);

    expect(matchIngredient({ name: 'milk', quantity: 500, unit: 'ml', status: 'missing', matchedInventoryItemIds: [] }, snapshot)).toMatchObject({
      status: 'available',
      matchedInventoryItemIds: ['milk'],
    });
    expect(matchIngredient({ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }, snapshot)).toMatchObject({
      status: 'partial',
      availableQuantity: 0.5,
    });
    expect(matchIngredient({ name: 'tomato', quantity: 1, unit: 'unit', status: 'missing', matchedInventoryItemIds: [] }, snapshot).status).toBe('available');
    expect(matchIngredient({ name: 'red onion', quantity: 1, unit: 'unit', status: 'missing', matchedInventoryItemIds: [] }, snapshot).status).toBe('missing');
  });

  it('marks incompatible units as partial rather than inventing a conversion', () => {
    const snapshot = buildInventorySnapshot([inventoryItem({ quantity: 2, unit: 'unit' })], referenceDate);
    const match = matchIngredient({ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }, snapshot);

    expect(match.status).toBe('partial');
    expect(match.availableQuantity).toBe(0);
    expect(match.matchedInventoryItemIds).toEqual(['inventory-1']);
    expect(match.incompatibleUnitInventoryItemIds).toEqual(['inventory-1']);
  });

  it('reports only the incompatible-unit rows separately when some matches are compatible and some are not', () => {
    const snapshot = buildInventorySnapshot([
      inventoryItem({ id: 'compatible-milk', quantity: 500, unit: 'ml' }),
      inventoryItem({ id: 'incompatible-milk', quantity: 2, unit: 'unit' }),
    ], referenceDate);
    const match = matchIngredient({ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }, snapshot);

    expect(match.status).toBe('partial');
    expect(match.availableQuantity).toBe(0.5);
    expect(match.matchedInventoryItemIds).toEqual(['compatible-milk', 'incompatible-milk']);
    expect(match.incompatibleUnitInventoryItemIds).toEqual(['incompatible-milk']);
  });

  it('keeps unknown recipe units partial when a quantity is requested', () => {
    const snapshot = buildInventorySnapshot([inventoryItem({ quantity: 2, unit: 'unit' })], referenceDate);
    const match = matchIngredient({ name: 'milk', quantity: 1, unit: null, status: 'missing', matchedInventoryItemIds: [] }, snapshot);

    expect(match.status).toBe('partial');
  });

  it('does not count expired stock as covering a requirement, but still reports it as matched', () => {
    const snapshot = buildInventorySnapshot([
      inventoryItem({ id: 'expired-milk', quantity: 1, unit: 'l', expiryDate: '2026-08-01T00:00:00.000Z' }),
    ], referenceDate);
    const match = matchIngredient({ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }, snapshot);

    expect(match.status).toBe('partial');
    expect(match.availableQuantity).toBe(0);
    expect(match.matchedInventoryItemIds).toEqual(['expired-milk']);
    expect(match.useSoonInventoryItemIds).toEqual([]);
  });

  it('counts only usable stock when both expired and fresh stock match', () => {
    const snapshot = buildInventorySnapshot([
      inventoryItem({ id: 'expired-milk', quantity: 1, unit: 'l', expiryDate: '2026-08-01T00:00:00.000Z' }),
      inventoryItem({ id: 'fresh-milk', quantity: 0.5, unit: 'l', expiryDate: '2026-08-30T00:00:00.000Z' }),
    ], referenceDate);
    const match = matchIngredient({ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }, snapshot);

    expect(match.status).toBe('partial');
    expect(match.availableQuantity).toBe(0.5);
    expect(match.matchedInventoryItemIds).toEqual(['expired-milk', 'fresh-milk']);
  });

  it('calculates coverage from actual full ingredient matches and expiry use', () => {
    const snapshot = buildInventorySnapshot([inventoryItem({ id: 'milk', expiryDate: '2026-08-20T00:00:00.000Z' })], referenceDate);
    const evaluated = evaluateCandidate(recipe('milk-dinner', [
      { name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] },
      { name: 'rice', quantity: 1, unit: 'package', status: 'available', matchedInventoryItemIds: [] },
    ]), snapshot, preferences);

    expect(evaluated).toMatchObject({
      availableCount: 1,
      missingCount: 1,
      coveragePercent: 50,
      usesExpiringIngredients: true,
      expiryPriority: 'high',
    });
    expect(evaluated?.missingIngredients).toEqual(['rice']);
  });

  it('ranks deterministically, prefers coverage, and avoids duplicate recipes', () => {
    const snapshot = buildInventorySnapshot([inventoryItem({ id: 'milk', expiryDate: '2026-08-20T00:00:00.000Z' })], referenceDate);
    const candidates = [
      recipe('missing-dinner', [{ name: 'rice', quantity: 1, unit: 'package', status: 'missing', matchedInventoryItemIds: [] }]),
      recipe('milk-dinner', [{ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }]),
      recipe('second-milk-dinner', [{ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }]),
    ];

    const first = selectMealCandidates(candidates, snapshot, { ...preferences, days: 3 });
    const second = selectMealCandidates(candidates, snapshot, { ...preferences, days: 3 });

    expect(first.map((selection) => selection.recipe.id)).toEqual(['milk-dinner', 'second-milk-dinner']);
    expect(second.map((selection) => selection.recipe.id)).toEqual(first.map((selection) => selection.recipe.id));
    expect(new Set(first.map((selection) => selection.recipe.id)).size).toBe(first.length);
  });

  it('returns only valid candidates when there are not enough recipes for all days', () => {
    const snapshot = buildInventorySnapshot([inventoryItem()], referenceDate);
    const selected = selectMealCandidates([
      recipe('only-dinner', [{ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] }]),
      recipe('invalid-dinner', []),
    ], snapshot, preferences);

    expect(selected).toHaveLength(1);
    expect(selected[0].recipe.id).toBe('only-dinner');
  });

  it('returns no selections when every candidate requires entirely missing ingredients', () => {
    const snapshot = buildInventorySnapshot([inventoryItem()], referenceDate);
    const selected = selectMealCandidates([
      recipe('missing-dinner', [{ name: 'rice', quantity: 1, unit: 'package', status: 'missing', matchedInventoryItemIds: [] }]),
    ], snapshot, preferences);

    expect(selected).toEqual([]);
  });

  it.each([3, 5, 7] as const)('selects exactly %d unique meals when enough candidates exist', (days) => {
    const snapshot = buildInventorySnapshot([inventoryItem()], referenceDate);
    const candidates = Array.from({ length: 7 }, (_, index) => recipe(`dinner-${index}`, [
      { name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [] },
    ]));

    const selected = selectMealCandidates(candidates, snapshot, { ...preferences, days });

    expect(selected).toHaveLength(days);
    expect(new Set(selected.map((selection) => selection.recipe.id)).size).toBe(days);
  });
});