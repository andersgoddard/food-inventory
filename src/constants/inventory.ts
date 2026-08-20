/**
 * Inventory Constants
 * Enums, lists, and mappings for categories, locations, and units
 */

import { InventoryCategory, InventoryLocation, InventoryUnit } from '@/types/inventory';

/**
 * Complete list of inventory categories with human-readable labels
 * Used for UI dropdowns and AI classification
 */
export const INVENTORY_CATEGORIES: Record<InventoryCategory, string> = {
  fruit: 'Fruit',
  vegetables: 'Vegetables',
  meat: 'Meat',
  fish_seafood: 'Fish & Seafood',
  dairy: 'Dairy',
  eggs: 'Eggs',
  grains_cereals: 'Grains & Cereals',
  bakery: 'Bakery',
  tinned_jarred: 'Tinned & Jarred',
  frozen: 'Frozen',
  snacks: 'Snacks',
  sauces_condiments: 'Sauces & Condiments',
  herbs_spices: 'Herbs & Spices',
  drinks: 'Drinks',
  other: 'Other',
};

/**
 * Category list for iteration (in display order)
 */
export const CATEGORY_LIST: InventoryCategory[] = [
  'fruit',
  'vegetables',
  'meat',
  'fish_seafood',
  'dairy',
  'eggs',
  'grains_cereals',
  'bakery',
  'tinned_jarred',
  'frozen',
  'snacks',
  'sauces_condiments',
  'herbs_spices',
  'drinks',
  'other',
];

/**
 * Complete list of storage locations with human-readable labels
 */
export const INVENTORY_LOCATIONS: Record<InventoryLocation, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  cupboard: 'Store cupboard',
  other: 'Other',
};

/**
 * Location list for iteration (in display order)
 */
export const LOCATION_LIST: InventoryLocation[] = ['fridge', 'freezer', 'cupboard', 'other'];

/**
 * Complete list of units with human-readable labels
 */
export const INVENTORY_UNITS: Record<InventoryUnit, string> = {
  g: 'Grams (g)',
  kg: 'Kilograms (kg)',
  ml: 'Millilitres (ml)',
  l: 'Litres (l)',
  unit: 'Units',
  package: 'Packages',
};

/**
 * Unit list for iteration (in display order)
 */
export const UNIT_LIST: InventoryUnit[] = ['g', 'kg', 'ml', 'l', 'unit', 'package'];

/**
 * Storage key for AsyncStorage
 */
export const INVENTORY_STORAGE_KEY = 'inventory_items';
export const INVENTORY_FILTER_PREFERENCES_KEY = 'inventory_filter_preferences';

/**
 * Maximum length for user-entered text fields
 */
export const MAX_NAME_LENGTH = 255;
export const MAX_NOTES_LENGTH = 500;

/**
 * Default sort preference
 */
export const DEFAULT_SORT_BY = 'expiryDate' as const;
export const DEFAULT_SORT_ORDER = 'asc' as const;
