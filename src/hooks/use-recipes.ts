import { storageAdapter } from '@/services';
import { OpenAiRecipeProvider } from '@/services/ai/openai-recipe.provider';
import { RecipeService } from '@/services/ai/recipe.service';
import { RecipeRequest, RecipeSuggestion, SavedRecipe } from '@/types/recipe';
import { getCurrentISOString } from '@/utils/date';
import { useCallback, useEffect, useState } from 'react';

const SAVED_RECIPES_KEY = 'saved_recipes';
const recipeService = new RecipeService(new OpenAiRecipeProvider());

export function useRecipes() {
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    storageAdapter
      .get<SavedRecipe[]>(SAVED_RECIPES_KEY)
      .then((saved) => setSavedRecipes(saved || []))
      .catch(() => setSavedRecipes([]));
  }, []);

  const generate = useCallback(async (options: Omit<RecipeRequest, 'inventory'>) => {
    try {
      setLoading(true);
      setError(null);
      const generated = await recipeService.getSuggestions(options);
      setSuggestions(generated);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Unable to generate recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (recipe: RecipeSuggestion) => {
    const saved: SavedRecipe = {
      recipe,
      savedAt: getCurrentISOString(),
      inventorySnapshotAt: getCurrentISOString(),
    };
    const next = [...savedRecipes.filter((item) => item.recipe.id !== recipe.id), saved];
    await storageAdapter.set(SAVED_RECIPES_KEY, next);
    setSavedRecipes(next);
  }, [savedRecipes]);

  const isSaved = useCallback(
    (recipeId: string) => savedRecipes.some((item) => item.recipe.id === recipeId),
    [savedRecipes]
  );

  return { suggestions, savedRecipes, loading, error, generate, save, isSaved };
}
