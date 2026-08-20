import { MealPlan } from '@/types/meal-plan';

export function prepareSavedMealPlan(plan: MealPlan, existing: MealPlan | null, updatedAt: string): MealPlan {
  return {
    ...plan,
    status: 'saved',
    version: existing ? existing.version + 1 : plan.version,
    createdAt: existing?.createdAt || plan.createdAt,
    updatedAt,
  };
}

export function isMealPlanStale(plan: MealPlan, currentInventoryFingerprint: string): boolean {
  return !!plan.inventoryFingerprint && plan.inventoryFingerprint !== currentInventoryFingerprint;
}