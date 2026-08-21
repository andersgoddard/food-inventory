import { InventoryUnit } from '@/types/inventory';
import { RecipeSuggestion } from '@/types/recipe';
import { z } from 'zod';
import { parseLenientArray } from './lenient-array.schema';

const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit', 'package']);
const expiryPrioritySchema = z.enum(['high', 'normal', 'none']);

// The model sometimes returns a container/serving noun instead of a measurement unit; map those to the accepted enum.
const UNIT_ALIASES: Record<string, z.infer<typeof unitSchema>> = {
  tub: 'package',
  jar: 'package',
  bag: 'package',
  box: 'package',
  carton: 'package',
  bottle: 'package',
  can: 'package',
  tin: 'package',
  pack: 'package',
  packet: 'package',
  container: 'package',
  piece: 'unit',
  pieces: 'unit',
  item: 'unit',
  items: 'unit',
  each: 'unit',
  bunch: 'unit',
  slice: 'unit',
  slices: 'unit',
  head: 'unit',
  clove: 'unit',
  cloves: 'unit',
};

const recipeUnitSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  const aliased = UNIT_ALIASES[key] ?? value;
  if (unitSchema.safeParse(aliased).success) return aliased;
  console.warn('[recipe] unrecognized unit from AI output, falling back to null', { received: value });
  return null;
}, unitSchema.nullable());

const recipeExpiryPrioritySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const key = value.trim().toLowerCase();
  if (expiryPrioritySchema.safeParse(key).success) return key;
  console.warn('[recipe] unrecognized expiryPriority from AI output, falling back to "normal"', { received: value });
  return 'normal';
}, expiryPrioritySchema);

const recipeIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(1000).nullable(),
  unit: recipeUnitSchema,
  substitution: z.string().trim().max(240).nullable().optional(),
});

const recipeSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(600),
  servings: z.number().int().positive().max(50),
  preparationMinutes: z.number().int().positive().max(720).nullable(),
  ingredients: z.array(recipeIngredientSchema).min(1).max(40),
  steps: z.array(z.string().trim().min(1).max(500)).min(1).max(30),
  expiryPriority: recipeExpiryPrioritySchema,
  confidence: z.number().min(0).max(1),
});

export const recipeSuggestionsAiOutputSchema = z.object({
  suggestions: z.array(recipeSuggestionSchema).max(10),
});

export function parseRecipeSuggestionsAiOutput(value: unknown): z.infer<typeof recipeSuggestionsAiOutputSchema> {
  const raw = value && typeof value === 'object' ? (value as { suggestions?: unknown }).suggestions : undefined;
  const suggestions = parseLenientArray(recipeSuggestionSchema, raw, 'recipe').slice(0, 10);
  if (Array.isArray(raw) && raw.length > 0 && suggestions.length === 0) {
    throw new Error('Recipe suggestion AI output failed validation.');
  }
  return { suggestions };
}

export type AiRecipeSuggestion = z.infer<typeof recipeSuggestionSchema>;

export function toRecipeUnit(value: AiRecipeSuggestion['ingredients'][number]['unit']): InventoryUnit | null {
  return value as InventoryUnit | null;
}

export type ValidatedAiRecipeSuggestion = AiRecipeSuggestion & Pick<RecipeSuggestion, 'expiryPriority' | 'confidence'>;