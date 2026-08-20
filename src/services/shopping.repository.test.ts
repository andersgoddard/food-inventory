import { ShoppingList } from '@/types/shopping';
import { ShoppingRepository } from './shopping.repository';
import { StorageAdapter } from './storage/storage-adapter';

class MemoryAdapter implements StorageAdapter {
  private values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> { return (this.values.get(key) as T | undefined) ?? null; }
  async set<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
  async remove(key: string): Promise<void> { this.values.delete(key); }
  async clear(): Promise<void> { this.values.clear(); }
  async has(key: string): Promise<boolean> { return this.values.has(key); }
}

const list: ShoppingList = {
  id: '11111111-1111-4111-8111-111111111111', title: 'Shopping', mealPlanId: null, items: [],
  createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z', status: 'open',
};

describe('ShoppingRepository', () => {
  it('persists and deletes lists through the storage adapter', async () => {
    const adapter = new MemoryAdapter();
    const repository = new ShoppingRepository(adapter);
    await repository.saveList(list);
    expect(await repository.getList(list.id)).toEqual(list);
    await repository.deleteList(list.id);
    expect(await repository.getLists()).toEqual([]);
  });

  it('treats malformed stored lists as empty', async () => {
    const adapter = new MemoryAdapter();
    await adapter.set('shopping_lists', [{ bad: true }]);
    expect(await new ShoppingRepository(adapter).getLists()).toEqual([]);
  });
});