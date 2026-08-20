import { RecipeRequest, RecipeSuggestion } from '@/types/recipe';

export interface RecipeProvider {
  generate(request: RecipeRequest): Promise<RecipeSuggestion[]>;
}
