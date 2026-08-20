import { inventoryService } from '@/services';
import { MealPlan } from '@/types/meal-plan';
import { InventoryService } from './inventory/inventory.service';
import { ShoppingRepository } from './shopping.repository';
import { ShoppingService } from './shopping.service';
import { StorageAdapter } from './storage/storage-adapter';

jest.mock('@/services', () => ({
  inventoryService: {
    getItems: jest.fn().mockResolvedValue([
      {
        id: 'milk-1', name: 'Milk', category: 'dairy', location: 'fridge', quantity: 0.5, unit: 'l',
        purchaseDate: '2026-08-18T00:00:00.000Z', expiryDate: null, purchasePrice: 2,
        createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
      },
    ]),
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

const plan = (mealPlan: MealPlan): MealPlan => mealPlan;
const testPlan = plan({
  id: '11111111-1111-4111-8111-111111111111', title: 'Dinner plan', version: 1,
  startDate: '2026-08-19T00:00:00.000Z', endDate: '2026-08-20T00:00:00.000Z',
  preferences: { people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true },
  days: [{ date: '2026-08-19T00:00:00.000Z', meals: [{
    id: '22222222-2222-4222-8222-222222222222', dayIndex: 0, mealType: 'dinner', recipeId: 'recipe-1',
    recipeSnapshot: {
      id: 'recipe-1', title: 'Milk dinner', summary: 'Dinner', servings: 2, preparationMinutes: 20,
      ingredients: [
        { name: 'milk', quantity: 2, unit: 'l', status: 'missing', matchedInventoryItemIds: [] },
        { name: 'milk', quantity: 0.5, unit: 'l', status: 'missing', matchedInventoryItemIds: [] },
        { name: 'rice', quantity: 500, unit: 'g', status: 'missing', matchedInventoryItemIds: [] },
      ],
      steps: ['Cook'], expiryPriority: 'none', confidence: 1,
    }, coveragePercent: 0, missingIngredients: ['milk', 'rice'], usesExpiringIngredients: false, reasons: ['Uses inventory'],
  }] }],
  meals: [], inventorySnapshotAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z', status: 'saved',
});

describe('ShoppingService', () => {
  it('aggregates requirements and subtracts compatible inventory without mutation', async () => {
    const inventory = { getItems: jest.fn().mockResolvedValue([{
      id: 'milk-1', name: 'Milk', category: 'dairy', location: 'fridge', quantity: 0.5, unit: 'l',
      purchaseDate: '2026-08-18T00:00:00.000Z', expiryDate: null, purchasePrice: 2,
      createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
    }]) };
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventory as unknown as InventoryService);
    const before = JSON.parse(JSON.stringify(await inventory.getItems()));
    const list = await service.generateList(testPlan);

    expect(list.items).toHaveLength(2);
    expect(list.items.find((item) => item.normalizedName === 'milk')).toMatchObject({
      requiredQuantity: 2.5, availableQuantity: 0.5, missingQuantity: 2,
      unit: 'l', quantityConfidence: 'exact', sourceMealPlanMealIds: ['22222222-2222-4222-8222-222222222222'],
    });
    expect(list.items.find((item) => item.normalizedName === 'rice')).toMatchObject({
      requiredQuantity: 500, missingQuantity: 500, unit: 'g',
    });
    expect(await inventory.getItems()).toEqual(before);
  });

  it('supports manual items and shopping status transitions', async () => {
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    const withManual = service.addManualItem(list, 'Coffee', null, null);
    const manual = withManual.items.find((item) => item.source === 'manual');
    const purchased = service.updateItemStatus(withManual, manual?.id || '', 'purchased');

    expect(manual).toMatchObject({ name: 'Coffee', quantityConfidence: 'unknown', status: 'needed' });
    expect(purchased.items.find((item) => item.id === manual?.id)?.status).toBe('purchased');
    expect(list.items).not.toHaveLength(withManual.items.length);
  });

  it('classifies fixture prices deterministically', async () => {
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    const item = list.items[0];

    expect(service.classifyItemPrice(item, 4.5, 6).priceStatus).toBe('good_price');
    expect(service.classifyItemPrice(item, 6, 6).priceStatus).toBe('normal');
    expect(service.classifyItemPrice(item, 7.5, 6).priceStatus).toBe('expensive');
    expect(service.classifyItemPrice(item, 8.1, 6).priceStatus).toBe('very_expensive');
  });
});