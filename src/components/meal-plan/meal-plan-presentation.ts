import { MealPlanMeal } from '@/types/meal-plan';

export type MealAvailability = 'available' | 'partial' | 'missing';

export function getMealAvailability(meal: MealPlanMeal): MealAvailability {
  if (meal.coveragePercent >= 100 && meal.missingIngredients.length === 0) return 'available';
  if (meal.coveragePercent <= 0) return 'missing';
  return 'partial';
}