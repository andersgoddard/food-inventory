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

export const foodScanAiCandidateSchema = z.object({
  photoId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  category: categorySchema,
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