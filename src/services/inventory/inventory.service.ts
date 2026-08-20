/**
 * Inventory Service
 * Business logic layer - handles validation, filtering, and orchestration
 *
 * Responsibilities:
 * - Validate input using Zod schemas
 * - Apply business rules (filtering, sorting)
 * - Coordinate with repository for data operations
 * - Provide meaningful errors to UI
 * - No storage details (that's repository's job)
 * - No UI concerns
 */

import { InventoryRepository } from './inventory.repository';
import { validateCreateItem, validateUpdateItem } from './inventory.validator';
import { InventoryItem, CreateInventoryItemInput, UpdateInventoryItemInput, InventoryFilters, InventoryLocation } from '@/types/inventory';
import { daysUntilDate } from '@/utils/date';

export class InventoryService {
  constructor(private repository: InventoryRepository) {}

  /**
   * Add a new inventory item
   * Validates input before creating
   * @param input Item data to create
   * @returns Created item
   * @throws Error if validation fails
   */
  async addItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    // Validate input
    const validation = validateCreateItem(input);
    if (!validation.success) {
      const errorMessage = Object.values(validation.errors || {}).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Delegate to repository
    return this.repository.createItem(input);
  }

  /**
   * Update an existing inventory item
   * Validates partial input before updating
   * @param id Item ID
   * @param input Partial item data to update
   * @returns Updated item
   * @throws Error if validation fails or item not found
   */
  async updateItem(id: string, input: UpdateInventoryItemInput): Promise<InventoryItem> {
    // Validate input
    const validation = validateUpdateItem(input);
    if (!validation.success) {
      const errorMessage = Object.values(validation.errors || {}).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Delegate to repository
    return this.repository.updateItem(id, input);
  }

  /**
   * Delete an inventory item
   * @param id Item ID
   * @throws Error if item not found
   */
  async deleteItem(id: string): Promise<void> {
    return this.repository.deleteItem(id);
  }

  /**
   * Get a single inventory item
   * @param id Item ID
   * @returns Item if found, null otherwise
   */
  async getItem(id: string): Promise<InventoryItem | null> {
    return this.repository.getItem(id);
  }

  /**
   * Get all inventory items with optional filtering and sorting
   * @param filters Optional filters to apply
   * @returns Filtered and sorted items
   */
  async getItems(filters?: InventoryFilters): Promise<InventoryItem[]> {
    let items = await this.repository.getItems();

    // Apply filters
    if (filters) {
      items = this.applyFilters(items, filters);
    }

    return items;
  }

  /**
   * Get items by location
   * @param location Storage location (fridge, freezer, cupboard, other)
   * @returns Items in that location
   */
  async getItemsByLocation(location: InventoryLocation): Promise<InventoryItem[]> {
    return this.getItems({ location, sortBy: 'name' });
  }

  /**
   * Get items expiring within specified days
   * @param daysUntilExpiry Number of days to look ahead (0 = today or expired)
   * @returns Items expiring soon, sorted by expiry date
   */
  async getExpiringItems(daysUntilExpiry: number = 7): Promise<InventoryItem[]> {
    const items = await this.repository.getItems();

    const expiring = items.filter((item) => {
      if (!item.expiryDate) {
        return false; // Items without expiry date are not "expiring"
      }
      const daysLeft = daysUntilDate(item.expiryDate);
      return daysLeft !== null && daysLeft <= daysUntilExpiry;
    });

    // Sort by expiry date (earliest first)
    expiring.sort((a, b) => {
      const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
      const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
      return dateA - dateB;
    });

    return expiring;
  }

  /**
   * Get expired items
   * @returns Items past their expiry date
   */
  async getExpiredItems(): Promise<InventoryItem[]> {
    return this.getExpiringItems(-1); // Negative number catches expired items
  }

  /**
   * Clear all inventory (use with caution)
   */
  async clearAll(): Promise<void> {
    return this.repository.clearAll();
  }

  /**
   * Apply filters and sorting to items
   * @param items Items to filter
   * @param filters Filters to apply
   * @returns Filtered items
   * @private
   */
  private applyFilters(items: InventoryItem[], filters: InventoryFilters): InventoryItem[] {
    let result = [...items];

    // Filter by location
    if (filters.location) {
      result = result.filter((item) => item.location === filters.location);
    }

    // Filter by category
    if (filters.category) {
      result = result.filter((item) => item.category === filters.category);
    }

    // Filter by search query (name)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query)
      );
    }

    // Filter out expired items by default
    if (filters.showExpired === false) {
      result = result.filter((item) => {
        if (!item.expiryDate) return true; // Keep items without expiry
        return !this.isItemExpired(item);
      });
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'expiryDate';
    const sortOrder = filters.sortOrder || 'asc';
    result = this.sortItems(result, sortBy, sortOrder);

    return result;
  }

  /**
   * Sort items by specified field
   * @param items Items to sort
   * @param sortBy Field to sort by
   * @param order Sort order (asc or desc)
   * @returns Sorted items
   * @private
   */
  private sortItems(
    items: InventoryItem[],
    sortBy: string,
    order: 'asc' | 'desc'
  ): InventoryItem[] {
    const sorted = [...items].sort((a, b) => {
      let compareA: string | number | null = null;
      let compareB: string | number | null = null;

      switch (sortBy) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'expiryDate':
          compareA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          compareB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          break;
        case 'location':
          compareA = a.location;
          compareB = b.location;
          break;
        case 'purchaseDate':
          compareA = new Date(a.purchaseDate).getTime();
          compareB = new Date(b.purchaseDate).getTime();
          break;
        case 'category':
          compareA = a.category;
          compareB = b.category;
          break;
        default:
          return 0;
      }

      if (compareA === null || compareB === null) {
        return 0;
      }

      if (compareA < compareB) {
        return order === 'asc' ? -1 : 1;
      }
      if (compareA > compareB) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }

  /**
   * Check if an item is expired
   * @param item Item to check
   * @returns true if item expiry date is in the past
   * @private
   */
  private isItemExpired(item: InventoryItem): boolean {
    if (!item.expiryDate) return false;
    return new Date(item.expiryDate) < new Date();
  }
}
