import { MealPlanMeal } from '@/types/meal-plan';

export function mergeRejectedRecipeIds(
  rejectedRecipeIds: string[],
  candidates: Pick<MealPlanMeal, 'recipeId'>[]
): string[] {
  return [...new Set([
    ...rejectedRecipeIds,
    ...candidates.map((candidate) => candidate.recipeId),
  ])];
}