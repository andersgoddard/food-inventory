/**
 * Zod Validation Schemas for Inventory
 * Used by: UI forms, service layer, AI/OCR services, API responses
 * Separated from UI to be reusable across all data sources
 */

import { z } from 'zod';
import {
  CreateInventoryItemInput,
  InventoryItem,
  InventoryCategory,
  UpdateInventoryItemInput,
} from '@/types/inventory';

/**
 * Category validation
 */
export const inventoryCategorySchema = z.enum([
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
]);

/**
 * Location validation
 */
export const inventoryLocationSchema = z.enum(['fridge', 'freezer', 'cupboard', 'other']);

/**
 * Unit validation
 */
export const inventoryUnitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit', 'package']);

/**
 * ISO 8601 datetime string validation
 * Accepts both with and without timezone, with or without milliseconds
 */
const isoDateTimeSchema = z.string().datetime({ offset: true });

/**
 * Complete inventory item schema (with all system-generated fields)
 * Used for validating data from storage or API
 */
export const inventoryItemSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  category: inventoryCategorySchema,
  location: inventoryLocationSchema,
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: inventoryUnitSchema,
  purchaseDate: isoDateTimeSchema,
  expiryDate: isoDateTimeSchema.nullable().optional(),
  purchasePrice: z.number().nonnegative('Price cannot be negative').nullable().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  imageUrl: z.string().url('Invalid URL').nullable().optional(),
  barcode: z.string().nullable().optional(),
  nutritionData: z.any().optional(), // TODO: Future - define proper schema
  recipeMatches: z.array(z.string().uuid()).optional(),
});

/**
 * Schema for creating a new inventory item (user input)
 * Excludes: id, createdAt, updatedAt (system-generated)
 */
export const createInventoryItemSchema = inventoryItemSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .strict();

/**
 * Schema for updating an inventory item (partial user input)
 * All fields optional to allow partial updates
 */
export const updateInventoryItemSchema = createInventoryItemSchema.partial();

/**
 * Inferred TypeScript types from schemas
 * Used throughout the application
 */
export type ValidInventoryItem = z.infer<typeof inventoryItemSchema>;
export type ValidCreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type ValidUpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

/**
 * Validation helper functions
 * Throw ZodError on failure, return validated data on success
 */

export function validateInventoryItem(data: unknown): ValidInventoryItem {
  return inventoryItemSchema.parse(data);
}

export function validateCreateInventoryItem(data: unknown): ValidCreateInventoryItemInput {
  return createInventoryItemSchema.parse(data);
}

export function validateUpdateInventoryItem(data: unknown): ValidUpdateInventoryItemInput {
  return updateInventoryItemSchema.parse(data);
}

/**
 * Safe validation with error details
 * Returns { success: boolean, data?: T, error?: ZodError }
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
