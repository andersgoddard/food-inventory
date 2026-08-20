import { InventoryUnit } from '@/types/inventory';
import { RecipeSuggestion } from '@/types/recipe';
import { z } from 'zod';

const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit', 'package']);
const expiryPrioritySchema = z.enum(['high', 'normal', 'none']);

const recipeIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(1000).nullable(),
  unit: unitSchema.nullable(),
  substitution: z.string().trim().max(240).nullable().optional(),
});

const recipeSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(600),
  servings: z.number().int().positive().max(50),
  preparationMinutes: z.number().int().positive().max(720).nullable(),
  ingredients: z.array(recipeIngredientSchema).min(1).max(40),
  steps: z.array(z.string().trim().min(1).max(500)).min(1).max(30),
  expiryPriority: expiryPrioritySchema,
  confidence: z.number().min(0).max(1),
});

export const recipeSuggestionsAiOutputSchema = z.object({
  suggestions: z.array(recipeSuggestionSchema).max(10),
});

export function parseRecipeSuggestionsAiOutput(value: unknown): z.infer<typeof recipeSuggestionsAiOutputSchema> {
  return recipeSuggestionsAiOutputSchema.parse(value);
}

export type AiRecipeSuggestion = z.infer<typeof recipeSuggestionSchema>;

export function toRecipeUnit(value: AiRecipeSuggestion['ingredients'][number]['unit']): InventoryUnit | null {
  return value as InventoryUnit | null;
}

export type ValidatedAiRecipeSuggestion = AiRecipeSuggestion & Pick<RecipeSuggestion, 'expiryPriority' | 'confidence'>;