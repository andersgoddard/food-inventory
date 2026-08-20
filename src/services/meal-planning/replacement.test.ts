import { MealPlanMeal } from '@/types/meal-plan';
import { mergeRejectedRecipeIds } from './replacement';

describe('replacement session state', () => {
  it('merges rejected recipe IDs without duplicates or mutation', () => {
    const existing = ['recipe-a'];
    const candidates: Pick<MealPlanMeal, 'recipeId'>[] = [
      { recipeId: 'recipe-b' },
      { recipeId: 'recipe-a' },
      { recipeId: 'recipe-b' },
    ];

    expect(mergeRejectedRecipeIds(existing, candidates)).toEqual(['recipe-a', 'recipe-b']);
    expect(existing).toEqual(['recipe-a']);
    expect(candidates).toHaveLength(3);
  });
});