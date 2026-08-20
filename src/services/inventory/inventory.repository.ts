/**
 * Inventory Repository
 * Data access layer - abstracts storage details from business logic
 *
 * This is the adapter pattern. The repository knows how to do CRUD operations
 * on a StorageAdapter, but doesn't care whether it's AsyncStorage, Supabase, etc.
 *
 * Responsibilities:
 * - Get/create/update/delete items in storage
 * - No business logic (validation, filtering happens in Service)
 * - No UI concerns
 * - All methods return Promises
 */

import { StorageAdapter } from '@/services/storage/storage-adapter';
import { InventoryItem, CreateInventoryItemInput, UpdateInventoryItemInput } from '@/types/inventory';
import { INVENTORY_STORAGE_KEY } from '@/constants/inventory';
import { getCurrentISOString } from '@/utils/date';
import { generateUUID } from '@/utils/id';

export class InventoryRepository {
  constructor(private storageAdapter: StorageAdapter) {}

  /**
   * Get all inventory items from storage
   * @returns Array of all items (empty array if none exist)
   */
  async getItems(): Promise<InventoryItem[]> {
    try {
      const items = await this.storageAdapter.get<InventoryItem[]>(INVENTORY_STORAGE_KEY);
      return items || [];
    } catch (error) {
      console.error('Failed to fetch items from storage', error);
      throw new Error('Failed to load inventory items');
    }
  }

  /**
   * Get a single item by ID
   * @param id Item ID
   * @returns Item if found, null otherwise
   */
  async getItem(id: string): Promise<InventoryItem | null> {
    try {
      const items = await this.getItems();
      return items.find((item) => item.id === id) || null;
    } catch (error) {
      console.error(`Failed to fetch item ${id}`, error);
      throw new Error('Failed to load inventory item');
    }
  }

  /**
   * Create a new inventory item
   * @param input Item data (without id, timestamps)
   * @returns Created item with id and timestamps
   */
  async createItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    try {
      const now = getCurrentISOString();
      const newItem: InventoryItem = {
        ...input,
        id: generateUUID(),
        createdAt: now,
        updatedAt: now,
      };

      const items = await this.getItems();
      items.push(newItem);
      await this.storageAdapter.set(INVENTORY_STORAGE_KEY, items);

      return newItem;
    } catch (error) {
      console.error('Failed to create item', error);
      throw new Error('Failed to create inventory item');
    }
  }

  /**
   * Update an existing inventory item
   * @param id Item ID
   * @param input Partial update data
   * @returns Updated item
   */
  async updateItem(id: string, input: UpdateInventoryItemInput): Promise<InventoryItem> {
    try {
      const items = await this.getItems();
      const index = items.findIndex((item) => item.id === id);

      if (index === -1) {
        throw new Error(`Item with id ${id} not found`);
      }

      const now = getCurrentISOString();
      const updatedItem: InventoryItem = {
        ...items[index],
        ...input,
        id: items[index].id, // Prevent ID from being changed
        createdAt: items[index].createdAt, // Prevent createdAt from being changed
        updatedAt: now,
      };

      items[index] = updatedItem;
      await this.storageAdapter.set(INVENTORY_STORAGE_KEY, items);

      return updatedItem;
    } catch (error) {
      console.error(`Failed to update item ${id}`, error);
      throw new Error('Failed to update inventory item');
    }
  }

  /**
   * Delete an inventory item
   * @param id Item ID
   */
  async deleteItem(id: string): Promise<void> {
    try {
      const items = await this.getItems();
      const filtered = items.filter((item) => item.id !== id);

      if (filtered.length === items.length) {
        throw new Error(`Item with id ${id} not found`);
      }

      await this.storageAdapter.set(INVENTORY_STORAGE_KEY, filtered);
    } catch (error) {
      console.error(`Failed to delete item ${id}`, error);
      throw new Error('Failed to delete inventory item');
    }
  }

  /**
   * Delete all inventory items
   * USE WITH CAUTION - this clears all data
   */
  async clearAll(): Promise<void> {
    try {
      await this.storageAdapter.remove(INVENTORY_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear all items', error);
      throw new Error('Failed to clear inventory');
    }
  }
}
