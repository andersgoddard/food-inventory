import { FoodScanCandidate } from '@/types/food-scan';
import { InventoryCategory, InventoryLocation, InventoryUnit } from '@/types/inventory';
import { z } from 'zod';

const categorySchema = z.enum([
  'dairy',
  'meat',
  'fish',
  'fruit',
  'vegetables',
  'grains',
  'canned',
  'frozen',
  'snacks',
  'beverages',
  'condiments',
  'other',
]);

const locationSchema = z.enum(['fridge', 'freezer', 'cupboard', 'other']);
const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit', 'package']);

// The model sometimes returns singular or synonym category names; map those to the accepted enum.
const CATEGORY_ALIASES: Record<string, z.infer<typeof categorySchema>> = {
  beverage: 'beverages',
  drink: 'beverages',
  drinks: 'beverages',
  condiment: 'condiments',
  sauce: 'condiments',
  sauces: 'condiments',
  seasoning: 'condiments',
  seasonings: 'condiments',
  spice: 'condiments',
  spices: 'condiments',
  cereal: 'grains',
  cereals: 'grains',
  grain: 'grains',
  pasta: 'grains',
  bread: 'grains',
  vegetable: 'vegetables',
  fruits: 'fruit',
  meats: 'meat',
  seafood: 'fish',
  snack: 'snacks',
};

function normalizeCategory(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const key = value.trim().toLowerCase();
  const aliased = CATEGORY_ALIASES[key] ?? value;
  if (categorySchema.safeParse(aliased).success) return aliased;
  // Unrecognized category: fall back to 'other' rather than failing the whole batch, but
  // record the raw value so we can decide whether it needs an alias or a new category later.
  console.warn('[food-scan] unrecognized category from AI output, falling back to "other"', { received: value });
  return 'other';
}

const normalizedCategorySchema = z.preprocess(normalizeCategory, categorySchema);

export const foodScanAiCandidateSchema = z.object({
  photoId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  category: normalizedCategorySchema,
  quantity: z.number().positive().max(1000).nullable(),
  unit: unitSchema.nullable(),
  confidence: z.number().min(0).max(1),
});

export const foodScanAiOutputSchema = z.object({
  candidates: z.array(foodScanAiCandidateSchema).max(30),
});

export function parseFoodScanAiOutput(value: unknown): z.infer<typeof foodScanAiOutputSchema> {
  return foodScanAiOutputSchema.parse(value);
}

export function toFoodScanCandidate(
  candidate: z.infer<typeof foodScanAiCandidateSchema>,
  location: InventoryLocation,
  id: string
): FoodScanCandidate {
  return {
    id,
    photoId: candidate.photoId,
    name: candidate.name,
    category: candidate.category as InventoryCategory,
    location,
    quantity: candidate.quantity,
    unit: candidate.unit as InventoryUnit | null,
    confidence: candidate.confidence,
    source: 'openai-vision',
    reviewStatus: 'pending',
  };
}