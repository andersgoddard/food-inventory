import { MealPlan } from '@/types/meal-plan';
import { MealPlanRepository } from './meal-plan.repository';
import { StorageAdapter } from './storage/storage-adapter';

class MemoryAdapter implements StorageAdapter {
  private values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clear(): Promise<void> {
    this.values.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.values.has(key);
  }
}

const plan: MealPlan = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Dinner plan',
  version: 1,
  startDate: '2026-08-18T00:00:00.000Z',
  endDate: '2026-08-20T00:00:00.000Z',
  preferences: {
    people: 2,
    days: 3,
    mealType: 'dinner',
    prioritizeExpiring: true,
  },
  days: [],
  meals: [],
  inventorySnapshotAt: '2026-08-18T00:00:00.000Z',
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
  status: 'saved',
};

describe('MealPlanRepository', () => {
  it('validates, persists, loads, and deletes meal plans', async () => {
    const repository = new MealPlanRepository(new MemoryAdapter());

    await repository.savePlan(plan);
    expect(await repository.getPlan(plan.id)).toEqual(plan);

    await repository.deletePlan(plan.id);
    expect(await repository.getPlans()).toEqual([]);
  });

  it('loads the latest plan and persists across repository instances', async () => {
    const adapter = new MemoryAdapter();
    const firstRepository = new MealPlanRepository(adapter);
    const older = { ...plan, id: '22222222-2222-4222-8222-222222222222', updatedAt: '2026-08-18T00:00:00.000Z' };
    const newer = { ...plan, id: '33333333-3333-4333-8333-333333333333', updatedAt: '2026-08-20T00:00:00.000Z', version: 2 };

    await firstRepository.savePlan(older);
    await firstRepository.savePlan(newer);

    const secondRepository = new MealPlanRepository(adapter);
    expect(await secondRepository.getLatestPlan()).toEqual(newer);
    expect(await secondRepository.getPlan(older.id)).toEqual(older);
  });

  it('treats malformed persisted collections as empty and allows recovery', async () => {
    const adapter = new MemoryAdapter();
    await adapter.set('meal_plans', [{ invalid: true }]);
    const repository = new MealPlanRepository(adapter);

    expect(await repository.getPlans()).toEqual([]);
    await repository.savePlan(plan);
    expect(await repository.getPlans()).toEqual([plan]);
  });

  it('rejects plans without canonical date and version fields', async () => {
    const repository = new MealPlanRepository(new MemoryAdapter());
    const invalidPlan = { ...plan, version: undefined, startDate: undefined };

    await expect(repository.savePlan(invalidPlan as unknown as MealPlan)).rejects.toThrow();
  });
});
