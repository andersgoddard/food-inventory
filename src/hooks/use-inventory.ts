/**
 * useInventory Hook
 * React integration for the inventory service
 * Manages local state and provides reactive updates
 *
 * Design: This hook wraps the service and manages state using useState.
 * When React Query is added (Phase 2), this logic can be replaced with useQuery()
 * without changing any UI code - just swap the hook implementation.
 */

import { INVENTORY_FILTER_PREFERENCES_KEY } from '@/constants/inventory';
import { inventoryService, storageAdapter } from '@/services';
import {
    CreateInventoryItemInput,
    InventoryCategory,
    InventoryFilters,
    InventoryItem,
    InventoryLocation,
    UpdateInventoryItemInput,
} from '@/types/inventory';
import { useCallback, useEffect, useState } from 'react';

interface UseInventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  selectedLocation: InventoryLocation | null;
  searchQuery: string;
  selectedCategory: InventoryCategory | null;
  sortBy: InventoryFilters['sortBy'];
}

interface UseInventoryActions {
  // CRUD operations
  addItem: (input: CreateInventoryItemInput) => Promise<InventoryItem>;
  updateItem: (id: string, input: UpdateInventoryItemInput) => Promise<InventoryItem>;
  deleteItem: (id: string) => Promise<void>;
  getItem: (id: string) => Promise<InventoryItem | null>;

  // Query operations
  loadItems: (filters?: InventoryFilters) => Promise<void>;
  getItemsByLocation: (location: InventoryLocation) => Promise<InventoryItem[]>;
  getExpiringItems: (daysUntilExpiry?: number) => Promise<InventoryItem[]>;
  getExpiredItems: () => Promise<InventoryItem[]>;

  // UI state management
  setSelectedLocation: (location: InventoryLocation | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: InventoryCategory | null) => void;
  setSortBy: (sortBy: InventoryFilters['sortBy']) => void;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useInventory(): UseInventoryState & UseInventoryActions {
  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<InventoryLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);
  const [sortBy, setSortBy] = useState<InventoryFilters['sortBy']>('expiryDate');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      const preferences = await storageAdapter.get<{
        location?: InventoryLocation | null;
        category?: InventoryCategory | null;
        sortBy?: InventoryFilters['sortBy'];
      }>(INVENTORY_FILTER_PREFERENCES_KEY);

      if (preferences) {
        setSelectedLocation(preferences.location ?? null);
        setSelectedCategory(preferences.category ?? null);
        setSortBy(preferences.sortBy ?? 'expiryDate');
      }
      setPreferencesLoaded(true);
    };

    loadPreferences().catch(() => setPreferencesLoaded(true));
  }, []);

  // Reload items when location or search query changes
  useEffect(() => {
    if (!preferencesLoaded) return;
    loadItems({
      location: selectedLocation ?? undefined,
      category: selectedCategory ?? undefined,
      searchQuery: searchQuery || undefined,
      sortBy,
    });
  }, [selectedLocation, selectedCategory, searchQuery, sortBy, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    storageAdapter.set(INVENTORY_FILTER_PREFERENCES_KEY, {
      location: selectedLocation,
      category: selectedCategory,
      sortBy,
    }).catch(() => undefined);
  }, [selectedLocation, selectedCategory, sortBy, preferencesLoaded]);

  /**
   * Load items with optional filters
   */
  const loadItems = useCallback(
    async (filters?: InventoryFilters) => {
      try {
        setLoading(true);
        setError(null);
        const loadedItems = await inventoryService.getItems(filters);
        setItems(loadedItems);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load items';
        setError(message);
        console.error('Failed to load items:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Add a new item
   */
  const addItem = useCallback(
    async (input: CreateInventoryItemInput): Promise<InventoryItem> => {
      try {
        setError(null);
        const newItem = await inventoryService.addItem(input);
        setItems((prev) => [...prev, newItem]);
        return newItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add item';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Update an existing item
   */
  const updateItem = useCallback(
    async (id: string, input: UpdateInventoryItemInput): Promise<InventoryItem> => {
      try {
        setError(null);
        const updated = await inventoryService.updateItem(id, input);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update item';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Delete an item
   */
  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);
        await inventoryService.deleteItem(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete item';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Get a single item by ID
   */
  const getItem = useCallback(
    async (id: string): Promise<InventoryItem | null> => {
      try {
        setError(null);
        return await inventoryService.getItem(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get item';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Get items by location
   */
  const getItemsByLocation = useCallback(
    async (location: InventoryLocation): Promise<InventoryItem[]> => {
      try {
        setError(null);
        return await inventoryService.getItemsByLocation(location);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get items';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Get expiring items
   */
  const getExpiringItems = useCallback(
    async (daysUntilExpiry: number = 7): Promise<InventoryItem[]> => {
      try {
        setError(null);
        return await inventoryService.getExpiringItems(daysUntilExpiry);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get items';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Get expired items
   */
  const getExpiredItems = useCallback(
    async (): Promise<InventoryItem[]> => {
      try {
        setError(null);
        return await inventoryService.getExpiredItems();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get items';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Clear all inventory (development only)
   */
  const clearAll = useCallback(
    async (): Promise<void> => {
      try {
        setError(null);
        await inventoryService.clearAll();
        await storageAdapter.remove(INVENTORY_FILTER_PREFERENCES_KEY);
        setItems([]);
        setSelectedLocation(null);
        setSelectedCategory(null);
        setSortBy('expiryDate');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to clear inventory';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Refresh items from storage
   */
  const refresh = useCallback(
    async (): Promise<void> => {
      await loadItems({
        location: selectedLocation ?? undefined,
        searchQuery: searchQuery || undefined,
      });
    },
    [loadItems, selectedLocation, searchQuery]
  );

  return {
    // State
    items,
    loading,
    error,
    selectedLocation,
    searchQuery,
    selectedCategory,
    sortBy,

    // Actions
    addItem,
    updateItem,
    deleteItem,
    getItem,
    loadItems,
    getItemsByLocation,
    getExpiringItems,
    getExpiredItems,
    setSelectedLocation,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    clearAll,
    refresh,
  };
}
