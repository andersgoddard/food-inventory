import { MealPlan } from '@/types/meal-plan';

let currentDraft: MealPlan | null = null;

export function setCurrentMealPlanDraft(plan: MealPlan): void {
  currentDraft = plan;
}

export function getCurrentMealPlanDraft(id: string): MealPlan | null {
  return currentDraft?.id === id ? currentDraft : null;
}
