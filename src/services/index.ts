/**
 * Service Initialization
 * Wires up all services with their dependencies
 * Exports singleton instances for use throughout the app
 */

import { InventoryRepository } from './inventory/inventory.repository';
import { InventoryService } from './inventory/inventory.service';
import { MealPlanRepository } from './meal-plan.repository';
import { PriceIntelligenceService } from './price-intelligence.service';
import { PriceObservationRepository } from './price-observation.repository';
import { ShoppingRepository } from './shopping.repository';
import { ShoppingService } from './shopping.service';
import { AsyncStorageAdapter } from './storage/async-storage.adapter';

// Initialize storage adapter (AsyncStorage for MVP)
const storageAdapter = new AsyncStorageAdapter();

// Initialize repository with storage adapter
const inventoryRepository = new InventoryRepository(storageAdapter);

// Initialize service with repository
const inventoryService = new InventoryService(inventoryRepository);
const mealPlanRepository = new MealPlanRepository(storageAdapter);
const shoppingRepository = new ShoppingRepository(storageAdapter);
const shoppingService = new ShoppingService(shoppingRepository, mealPlanRepository, inventoryService);
const priceObservationRepository = new PriceObservationRepository(storageAdapter);
const priceIntelligenceService = new PriceIntelligenceService(priceObservationRepository);

/**
 * Export singleton instances
 * Used by hooks and components
 */
export { inventoryRepository, inventoryService, mealPlanRepository, priceIntelligenceService, shoppingRepository, shoppingService, storageAdapter };

/**
 * For testing: Function to create new instances with mock adapter
 * Usage: const testService = createInventoryServiceWithAdapter(mockAdapter);
 */
export function createInventoryServiceWithAdapter(
  adapter: any
): InventoryService {
  const repo = new InventoryRepository(adapter);
  return new InventoryService(repo);
}
