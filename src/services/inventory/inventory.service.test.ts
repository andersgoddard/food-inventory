import { StorageAdapter } from '@/services/storage/storage-adapter';
import { InventoryItem } from '@/types/inventory';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

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

const input = (
  name: string,
  location: 'fridge' | 'freezer' = 'fridge',
  expiryDate: string | null = null
) => ({
  name,
  category: 'dairy' as const,
  location,
  quantity: 1,
  unit: 'unit' as const,
  purchaseDate: '2026-08-18T00:00:00.000Z',
  expiryDate,
  purchasePrice: null,
});

describe('InventoryService', () => {
  it('persists CRUD operations through the repository adapter', async () => {
    const adapter = new MemoryAdapter();
    const service = new InventoryService(new InventoryRepository(adapter));
    const created = await service.addItem(input('Milk'));

    expect(await service.getItem(created.id)).toMatchObject({ name: 'Milk' });

    const updated = await service.updateItem(created.id, { quantity: 2 });
    expect(updated.quantity).toBe(2);

    await service.deleteItem(created.id);
    expect(await service.getItem(created.id)).toBeNull();
  });

  it('filters and sorts items using business logic', async () => {
    const adapter = new MemoryAdapter();
    const repository = new InventoryRepository(adapter);
    const service = new InventoryService(repository);
    await service.addItem(input('Zucchini', 'freezer'));
    await service.addItem(input('Apples'));

    const filtered = await service.getItems({ location: 'freezer', sortBy: 'name' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Zucchini');

    const persisted = await repository.getItems();
    expect(persisted as InventoryItem[]).toHaveLength(2);
  });

  it('returns items that need using soon in expiry order', async () => {
    const adapter = new MemoryAdapter();
    const service = new InventoryService(new InventoryRepository(adapter));
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const later = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();

    await service.addItem(input('Later item', 'fridge', later));
    await service.addItem(input('Soon item', 'fridge', soon));

    const expiring = await service.getExpiringItems(7);
    expect(expiring.map((item) => item.name)).toEqual(['Soon item']);
  });
});
