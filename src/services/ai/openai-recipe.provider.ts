import { AI_GATEWAY_TOKEN, AI_GATEWAY_URL } from '@/constants/ai';
import { matchIngredient } from '@/services/meal-planning/ingredient-matcher';
import { buildInventorySnapshot } from '@/services/meal-planning/inventory-snapshot';
import { RecipeIngredient, RecipeRequest, RecipeSuggestion } from '@/types/recipe';
import { generateUUID } from '@/utils/id';
import { AiProvider } from './ai-capability';
import { GatewayAiProvider } from './gateway-ai.provider';
import { RecipeProvider } from './recipe.provider';
import { parseRecipeSuggestionsAiOutput, toRecipeUnit } from './recipe.schemas';

export interface OpenAiRecipeProviderOptions {
  aiProvider?: AiProvider;
  capability?: 'recipe_suggestions' | 'meal_planning';
}

function reconcileIngredient(ingredient: ReturnType<typeof parseRecipeSuggestionsAiOutput>['suggestions'][number]['ingredients'][number], inventory: RecipeRequest['inventory']): RecipeIngredient {
  const recipeIngredient: RecipeIngredient = {
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: toRecipeUnit(ingredient.unit),
    status: 'missing',
    matchedInventoryItemIds: [],
    substitution: ingredient.substitution || null,
  };
  const match = matchIngredient(recipeIngredient, buildInventorySnapshot(inventory.map((item) => ({
    id: item.inventoryItemId,
    name: item.name,
    category: item.category,
    location: 'other',
    quantity: item.quantity,
    unit: item.unit,
    purchaseDate: '',
    expiryDate: item.expiryDate,
    purchasePrice: null,
    createdAt: '',
    updatedAt: '',
  }))));
  return {
    ...recipeIngredient,
    status: match.status,
    matchedInventoryItemIds: match.matchedInventoryItemIds,
  };
}

export class OpenAiRecipeProvider implements RecipeProvider {
  private readonly aiProvider: AiProvider;
  private readonly capability: 'recipe_suggestions' | 'meal_planning';

  constructor(options: OpenAiRecipeProviderOptions = {}) {
    this.aiProvider = options.aiProvider || new GatewayAiProvider({ baseUrl: AI_GATEWAY_URL, token: AI_GATEWAY_TOKEN });
    this.capability = options.capability || 'recipe_suggestions';
  }

  async generate(request: RecipeRequest): Promise<RecipeSuggestion[]> {
    const response = await this.aiProvider.request({
      capability: this.capability,
      input: {
        inventory: request.inventory,
        servings: request.servings,
        maxMinutes: request.maxMinutes || null,
        prioritizeExpiring: request.prioritizeExpiring,
        planning: request.planning || null,
        prompt: request.prompt || null,
        instructions: this.capability === 'meal_planning'
          ? 'Suggest distinct practical meals for the requested planning horizon. Prioritize use-soon inventory when requested, but do not claim an ingredient is available; the application will reconcile availability and rank candidates.'
          : 'Suggest practical recipes. Use only reasonable ingredient quantities. Do not claim an ingredient is available; the application will reconcile availability.',
      },
    });
    const output = parseRecipeSuggestionsAiOutput(response.output);
    const inventorySnapshot = buildInventorySnapshot(request.inventory.map((item) => ({
      id: item.inventoryItemId,
      name: item.name,
      category: item.category,
      location: 'other',
      quantity: item.quantity,
      unit: item.unit,
      purchaseDate: '',
      expiryDate: item.expiryDate,
      purchasePrice: null,
      createdAt: '',
      updatedAt: '',
    })));

    return output.suggestions.map((suggestion) => {
      const ingredients = suggestion.ingredients.map((ingredient) => reconcileIngredient(ingredient, request.inventory));
      const usesExpiringIngredients = ingredients.some((ingredient) => {
        const match = matchIngredient(ingredient, inventorySnapshot);
        return match.useSoonInventoryItemIds.length > 0;
      });
      return {
        id: generateUUID(),
        title: suggestion.title,
        summary: suggestion.summary,
        servings: request.servings,
        preparationMinutes: suggestion.preparationMinutes,
        ingredients,
        steps: suggestion.steps,
        expiryPriority: request.prioritizeExpiring && usesExpiringIngredients ? 'high' : suggestion.expiryPriority === 'none' ? 'none' : 'normal',
        confidence: suggestion.confidence,
      };
    });
  }
}