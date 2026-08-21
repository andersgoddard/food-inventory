import { inventoryService } from '@/services';
import { MealPlan } from '@/types/meal-plan';
import { InventoryService } from './inventory/inventory.service';
import { MealPlanRepository } from './meal-plan.repository';
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
      sourceMealTitles: ['Milk dinner'],
    });
    expect(list.items.find((item) => item.normalizedName === 'rice')).toMatchObject({
      requiredQuantity: 500, missingQuantity: 500, unit: 'g',
    });
    expect(await inventory.getItems()).toEqual(before);
  });

  it('keeps a requirement on the list when its quantity is unknown, even if some inventory matches by name', async () => {
    const saltPlan = plan({
      ...testPlan,
      days: [{ date: '2026-08-19T00:00:00.000Z', meals: [{
        id: '22222222-2222-4222-8222-222222222222', dayIndex: 0, mealType: 'dinner', recipeId: 'recipe-1',
        recipeSnapshot: {
          id: 'recipe-1', title: 'Salt dinner', summary: 'Dinner', servings: 2, preparationMinutes: 20,
          ingredients: [{ name: 'salt', quantity: null, unit: null, status: 'missing', matchedInventoryItemIds: [] }],
          steps: ['Cook'], expiryPriority: 'none', confidence: 1,
        }, coveragePercent: 0, missingIngredients: ['salt'], usesExpiringIngredients: false, reasons: [],
      }] }],
    });
    const inventory = { getItems: jest.fn().mockResolvedValue([{
      id: 'salt-1', name: 'Salt', category: 'other', location: 'cupboard', quantity: 1, unit: 'unit',
      purchaseDate: '2026-08-18T00:00:00.000Z', expiryDate: null, purchasePrice: null,
      createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z',
    }]) };
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventory as unknown as InventoryService);
    const list = await service.generateList(saltPlan);

    expect(list.items.find((item) => item.normalizedName === 'salt')).toMatchObject({
      quantityConfidence: 'unknown', missingQuantity: null, priority: 'required',
    });
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

  it('removes an item from the list', async () => {
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    const withManual = service.addManualItem(list, 'Coffee', null, null);
    const manual = withManual.items.find((item) => item.source === 'manual');
    const withoutManual = service.removeItem(withManual, manual?.id || '');

    expect(withoutManual.items.find((item) => item.id === manual?.id)).toBeUndefined();
    expect(withoutManual.items).toHaveLength(withManual.items.length - 1);
  });

  it('preserves manual items when regenerating a meal-plan list', async () => {
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    const withManual = service.addManualItem(list, 'Coffee', null, null);
    const regenerated = await service.generateList(testPlan, withManual);

    expect(regenerated.items.filter((item) => item.source === 'manual')).toHaveLength(1);
    expect(regenerated.items.find((item) => item.source === 'manual')).toMatchObject({ name: 'Coffee' });
  });

  it('preserves meal-item completion state when regenerating the same plan', async () => {
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    const milk = list.items.find((item) => item.normalizedName === 'milk');
    const purchased = service.updateItemStatus(list, milk?.id || '', 'purchased');
    const regenerated = await service.generateList(testPlan, purchased);

    expect(regenerated.items.find((item) => item.normalizedName === 'milk')?.status).toBe('purchased');
  });

  it('recovers manual items and completion state from storage when no in-memory list is held', async () => {
    const repository = new ShoppingRepository(new MemoryAdapter());
    const service = new ShoppingService(repository, undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    const withManual = service.addManualItem(list, 'Coffee', null, null);
    const milk = withManual.items.find((item) => item.normalizedName === 'milk');
    const purchased = service.updateItemStatus(withManual, milk?.id || '', 'purchased');
    await service.saveList(purchased);

    const regenerated = await service.generateListForPlan(testPlan);

    expect(regenerated.items.filter((item) => item.source === 'manual')).toHaveLength(1);
    expect(regenerated.items.find((item) => item.normalizedName === 'milk')?.status).toBe('purchased');
  });

  it('recalculates meal-derived items through the plan repository when a meal is edited, without losing manual items', async () => {
    const mealPlanRepository = new MealPlanRepository(new MemoryAdapter());
    const shoppingRepository = new ShoppingRepository(new MemoryAdapter());
    const service = new ShoppingService(shoppingRepository, mealPlanRepository, inventoryService as never);

    await mealPlanRepository.savePlan(testPlan);
    const initialList = await service.generateListForPlanId(testPlan.id);
    const withManual = service.addManualItem(initialList, 'Coffee', null, null);
    await service.saveList(withManual);

    const editedPlan: MealPlan = {
      ...testPlan,
      version: 2,
      days: [{ date: '2026-08-19T00:00:00.000Z', meals: [{
        id: '22222222-2222-4222-8222-222222222222', dayIndex: 0, mealType: 'dinner', recipeId: 'recipe-2',
        recipeSnapshot: {
          id: 'recipe-2', title: 'Pasta dinner', summary: 'Dinner', servings: 2, preparationMinutes: 20,
          ingredients: [{ name: 'pasta', quantity: 400, unit: 'g', status: 'missing', matchedInventoryItemIds: [] }],
          steps: ['Cook'], expiryPriority: 'none', confidence: 1,
        }, coveragePercent: 0, missingIngredients: ['pasta'], usesExpiringIngredients: false, reasons: [],
      }] }],
    };
    await mealPlanRepository.savePlan(editedPlan);

    const regenerated = await service.generateListForPlanId(editedPlan.id);

    expect(regenerated.items.find((item) => item.normalizedName === 'pasta')).toMatchObject({
      requiredQuantity: 400, missingQuantity: 400, unit: 'g', sourceMealTitles: ['Pasta dinner'],
    });
    expect(regenerated.items.find((item) => item.normalizedName === 'milk')).toBeUndefined();
    expect(regenerated.items.find((item) => item.normalizedName === 'rice')).toBeUndefined();
    expect(regenerated.items.find((item) => item.source === 'manual')).toMatchObject({ name: 'Coffee' });
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

  it('flags incompatible-unit inventory matches and use-soon stock on generated items', async () => {
    const soonExpiry = new Date(Date.now() + 2 * 86400000).toISOString();
    const inventory = { getItems: jest.fn().mockResolvedValue([
      { id: 'milk-soon', name: 'Milk', category: 'dairy', location: 'fridge', quantity: 0.5, unit: 'l',
        purchaseDate: '2026-08-18T00:00:00.000Z', expiryDate: soonExpiry, purchasePrice: 2,
        createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z' },
      { id: 'rice-wrong-unit', name: 'Rice', category: 'grains_cereals', location: 'cupboard', quantity: 2, unit: 'unit',
        purchaseDate: '2026-08-18T00:00:00.000Z', expiryDate: null, purchasePrice: null,
        createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z' },
    ]) };
    const service = new ShoppingService(new ShoppingRepository(new MemoryAdapter()), undefined, inventory as unknown as InventoryService);
    const list = await service.generateList(testPlan);

    expect(list.items.find((item) => item.normalizedName === 'milk')).toMatchObject({ hasUseSoonInventory: true, hasIncompatibleUnitInventory: false });
    expect(list.items.find((item) => item.normalizedName === 'rice')).toMatchObject({ hasIncompatibleUnitInventory: true, hasUseSoonInventory: false });
  });

  it('confirms a Shopping item purchased through the shared intake path, tolerating a missing list', async () => {
    const repository = new ShoppingRepository(new MemoryAdapter());
    const service = new ShoppingService(repository, undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    await service.saveList(list);
    const milk = list.items.find((item) => item.normalizedName === 'milk');

    const updated = await service.confirmItemPurchased(list.id, milk?.id || '');
    expect(updated?.items.find((item) => item.id === milk?.id)?.status).toBe('purchased');

    const missing = await service.confirmItemPurchased('99999999-9999-4999-8999-999999999999', milk?.id || '');
    expect(missing).toBeNull();
  });

  it('detaches a Shopping list from its meal plan when the plan is deleted, preserving items', async () => {
    const repository = new ShoppingRepository(new MemoryAdapter());
    const service = new ShoppingService(repository, undefined, inventoryService as never);
    const list = await service.generateList(testPlan);
    const withManual = service.addManualItem(list, 'Coffee', null, null);
    await service.saveList(withManual);

    const detached = await service.detachFromMealPlan(testPlan.id);
    expect(detached?.mealPlanId).toBeNull();
    expect(detached?.items).toHaveLength(withManual.items.length);
    expect(detached?.items.find((item) => item.source === 'manual')).toMatchObject({ name: 'Coffee' });

    const stored = await repository.getList(list.id);
    expect(stored?.mealPlanId).toBeNull();

    expect(await service.detachFromMealPlan('99999999-9999-4999-8999-999999999999')).toBeNull();
  });
});