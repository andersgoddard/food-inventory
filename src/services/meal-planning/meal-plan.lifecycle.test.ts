import { inventoryService } from '@/services';
import { MealPlanRepository } from '@/services/meal-plan.repository';
import { MealPlanningService } from '@/services/meal-planning.service';
import { StorageAdapter } from '@/services/storage/storage-adapter';
import { MealPlan } from '@/types/meal-plan';
import { RecipeSuggestion } from '@/types/recipe';
import { prepareSavedMealPlan } from './persistence';

jest.mock('@/services', () => ({
  inventoryService: {
    getItems: jest.fn().mockResolvedValue([{
      id: 'milk-1',
      name: 'Milk',
      category: 'dairy',
      location: 'fridge',
      quantity: 1,
      unit: 'l',
      purchaseDate: '2026-08-18T00:00:00.000Z',
      expiryDate: '2026-08-20T00:00:00.000Z',
      purchasePrice: 2,
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    }]),
  },
}));

class MemoryAdapter implements StorageAdapter {
  private values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> { return (this.values.get(key) as T | undefined) ?? null; }
  async set<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
  async remove(key: string): Promise<void> { this.values.delete(key); }
  async clear(): Promise<void> { this.values.clear(); }
  async has(key: string): Promise<boolean> { return this.values.has(key); }
}

function candidate(id: string): RecipeSuggestion {
  return {
    id,
    title: id,
    summary: 'Saved recipe snapshot',
    servings: 2,
    preparationMinutes: 20,
    ingredients: [{ name: 'milk', quantity: 1, unit: 'l', status: 'missing', matchedInventoryItemIds: [], substitution: null }],
    steps: ['Cook and serve.'],
    expiryPriority: 'normal',
    confidence: 0.9,
  };
}

describe('meal-plan persistence lifecycle', () => {
  it('generates, saves, reloads, edits, versions, and reloads without changing inventory', async () => {
    const service = new MealPlanningService({
      generate: async () => [candidate('recipe-a'), candidate('recipe-b'), candidate('recipe-c')],
    });
    const repository = new MealPlanRepository(new MemoryAdapter());
    const beforeInventory = JSON.parse(JSON.stringify(await inventoryService.getItems()));
    const generated = await service.generatePlan({ people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true });
    const savedV1 = await repository.savePlan(prepareSavedMealPlan(generated, null, '2026-08-19T00:00:00.000Z'));
    const reloadedV1 = await repository.getPlan(savedV1.id);
    const alternative = (await service.getReplacementCandidates(reloadedV1 as MealPlan, 1))[0];
    const editedDraft = service.replaceMeal(reloadedV1 as MealPlan, 1, alternative);
    const savedV2 = await repository.savePlan(prepareSavedMealPlan(editedDraft, savedV1, '2026-08-20T00:00:00.000Z'));
    const reloadedV2 = await repository.getPlan(savedV2.id);

    expect(reloadedV1?.version).toBe(1);
    expect(reloadedV2?.version).toBe(2);
    expect(reloadedV2?.status).toBe('saved');
    expect(reloadedV2?.days[1].meals[0].recipeId).toBe(alternative.recipeId);
    expect(reloadedV2?.days[0]).toEqual(savedV1.days[0]);
    expect(reloadedV2?.days[2]).toEqual(savedV1.days[2]);
    expect(reloadedV2?.days[1].meals[0].recipeSnapshot).toEqual(alternative.recipeSnapshot);
    expect(await inventoryService.getItems()).toEqual(beforeInventory);
  });
});