import type { MealPlanningPreferences } from '@/types/meal-plan';
import { z } from 'zod';
import { inventoryUnitSchema } from './inventory/inventory.schemas';

const isoDateTimeSchema = z.string().datetime({ offset: true });
const mealTypeSchema = z.enum(['dinner', 'breakfast', 'lunch', 'snack']);
export const supportedMealPlanDays = [3, 5, 7] as const;
const recipeIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unit: inventoryUnitSchema.nullable(),
  status: z.enum(['available', 'partial', 'missing', 'substitution']),
  matchedInventoryItemIds: z.array(z.string()),
  substitution: z.string().nullable().optional(),
});
export const recipeSuggestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  servings: z.number().positive(),
  preparationMinutes: z.number().nullable(),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(z.string()),
  expiryPriority: z.enum(['high', 'normal', 'none']),
  confidence: z.number().min(0).max(1),
});

export const mealPlanningPreferencesSchema = z.object({
  people: z.number().int().min(1).max(12),
  days: z.union([z.literal(supportedMealPlanDays[0]), z.literal(supportedMealPlanDays[1]), z.literal(supportedMealPlanDays[2])]),
  mealType: mealTypeSchema,
  mealTypes: z.array(mealTypeSchema).min(1).max(3).optional(),
  prioritizeExpiring: z.boolean(),
  includeSavedRecipes: z.boolean().optional(),
  includeIngredients: z.array(z.string().trim().min(1)).max(20).optional(),
  excludeIngredients: z.array(z.string().trim().min(1)).max(20).optional(),
  fixedExclusions: z.array(z.string().trim().min(1)).max(20).optional(),
});

export const defaultMealPlanningPreferences = {
  people: 2,
  days: 7,
  mealType: 'dinner' as const,
  prioritizeExpiring: true,
};

export function parseMealPlanningPreferences(data: unknown) {
  return mealPlanningPreferencesSchema.parse(data);
}

export function createDinnerPlanningPreferences(people: string, days: number, options: Partial<MealPlanningPreferences> = {}): MealPlanningPreferences {
  return parseMealPlanningPreferences({
    people: Number(people),
    days,
    mealType: 'dinner',
    prioritizeExpiring: true,
    ...options,
  });
}

export function toMealPlanRouteParams(preferences: MealPlanningPreferences) {
  const params = {
    people: String(preferences.people),
    days: String(preferences.days),
    mealType: preferences.mealType,
    prioritizeExpiring: String(preferences.prioritizeExpiring),
  };
  return {
    ...params,
    ...(preferences.mealTypes?.length ? { mealTypes: preferences.mealTypes.join(',') } : {}),
    ...(preferences.includeSavedRecipes !== undefined ? { includeSavedRecipes: String(preferences.includeSavedRecipes) } : {}),
    ...(preferences.includeIngredients?.length ? { includeIngredients: preferences.includeIngredients.join(',') } : {}),
    ...(preferences.excludeIngredients?.length ? { excludeIngredients: preferences.excludeIngredients.join(',') } : {}),
    ...(preferences.fixedExclusions?.length ? { fixedExclusions: preferences.fixedExclusions.join(',') } : {}),
  };
}

export const mealPlanMealSchema = z.object({
  id: z.string().uuid(),
  dayIndex: z.number().int().nonnegative(),
  mealType: mealTypeSchema,
  recipeId: z.string().min(1),
  recipeSnapshot: recipeSuggestionSchema,
  coveragePercent: z.number().min(0).max(100),
  missingIngredients: z.array(z.string()),
  usesExpiringIngredients: z.boolean(),
  reasons: z.array(z.string()),
});

export const mealPlanDaySchema = z.object({
  date: isoDateTimeSchema,
  meals: z.array(mealPlanMealSchema),
});

export const mealPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  version: z.number().int().positive(),
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
  preferences: mealPlanningPreferencesSchema,
  days: z.array(mealPlanDaySchema),
  meals: z.array(mealPlanMealSchema),
  inventorySnapshotAt: isoDateTimeSchema,
  inventoryFingerprint: z.string().min(1).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  status: z.enum(['draft', 'saved']),
});

export const mealPlansSchema = z.array(mealPlanSchema);

export type ValidMealPlan = z.infer<typeof mealPlanSchema>;