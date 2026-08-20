/**
 * Inventory Type Definitions
 * Core types for the food inventory system
 */

/**
 * Predefined food categories for classification
 * Designed to work with AI vision and OCR systems
 */
export type InventoryCategory =
  | 'fruit'
  | 'vegetables'
  | 'meat'
  | 'fish_seafood'
  | 'dairy'
  | 'eggs'
  | 'grains_cereals'
  | 'bakery'
  | 'tinned_jarred'
  | 'frozen'
  | 'snacks'
  | 'sauces_condiments'
  | 'herbs_spices'
  | 'drinks'
  | 'other';

/**
 * Storage locations in a household
 */
export type InventoryLocation = 'fridge' | 'freezer' | 'cupboard' | 'other';

/**
 * Units of measurement
 * Standardized to metric for consistency in recipes and nutrition
 */
export type InventoryUnit = 'g' | 'kg' | 'ml' | 'l' | 'unit' | 'package';

/**
 * Core inventory item representing a food item in storage
 * Designed to be extensible for future features (AI, nutrition, recipes)
 */
export interface InventoryItem {
  // Identity
  id: string; // UUID
  
  // Core data
  name: string; // e.g., "Whole Milk", "Chicken Breast"
  category: InventoryCategory; // Predefined category (AI-friendly)
  
  // Storage & quantity
  location: InventoryLocation; // Where stored
  quantity: number; // How much (e.g., 2, 0.5, 250)
  unit: InventoryUnit; // Unit of measurement
  
  // Dates
  purchaseDate: string; // ISO 8601 format
  expiryDate?: string | null; // ISO 8601 format (optional)
  
  // Cost
  purchasePrice?: number | null; // Cost when purchased (user's currency)
  
  // Metadata
  notes?: string; // User notes
  
  // System fields
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  
  // Future fields (reserved for extensibility, null for MVP)
  imageUrl?: string | null; // Future: photo from vision or user
  barcode?: string | null; // Future: from receipt OCR
  nutritionData?: NutritionData; // Future: calories, protein, etc.
  recipeMatches?: string[]; // Future: recipe IDs that use this item
}

/**
 * Nutritional information per serving or unit
 * Reserved for future nutrition tracking phase
 */
export interface NutritionData {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

/**
 * Input data for creating a new inventory item
 * Excludes system-generated fields (id, timestamps)
 */
export interface CreateInventoryItemInput {
  name: string;
  category: InventoryCategory;
  location: InventoryLocation;
  quantity: number;
  unit: InventoryUnit;
  purchaseDate: string;
  expiryDate?: string | null;
  purchasePrice?: number | null;
  notes?: string;
}

/**
 * Input data for updating an inventory item
 * All fields optional to allow partial updates
 */
export interface UpdateInventoryItemInput {
  name?: string;
  category?: InventoryCategory;
  location?: InventoryLocation;
  quantity?: number;
  unit?: InventoryUnit;
  purchaseDate?: string;
  expiryDate?: string | null;
  purchasePrice?: number | null;
  notes?: string;
}

/**
 * Filters for querying inventory items
 */
export interface InventoryFilters {
  location?: InventoryLocation;
  category?: InventoryCategory;
  searchQuery?: string;
  sortBy?: 'name' | 'expiryDate' | 'location' | 'purchaseDate' | 'category';
  sortOrder?: 'asc' | 'desc';
  showExpired?: boolean;
}
