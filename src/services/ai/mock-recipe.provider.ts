import { RecipeRequest, RecipeSuggestion } from '@/types/recipe';
import { RecipeProvider } from './recipe.provider';

function matchIngredient(request: RecipeRequest, name: string, quantity: number) {
  const matches = request.inventory.filter((item) =>
    item.name.toLowerCase().includes(name.toLowerCase())
  );
  const hasMatch = matches.length > 0;
  const hasQuantity = matches.some((item) => item.quantity >= quantity);

  return {
    name,
    quantity,
    unit: matches[0]?.unit || 'unit',
    status: hasQuantity ? 'available' as const : hasMatch ? 'partial' as const : 'missing' as const,
    matchedInventoryItemIds: matches.map((item) => item.inventoryItemId),
    substitution: null,
  };
}

export class MockRecipeProvider implements RecipeProvider {
  async generate(request: RecipeRequest): Promise<RecipeSuggestion[]> {
    const hasExpiringItem = request.inventory.some((item) => {
      if (!item.expiryDate) return false;
      const days = (new Date(item.expiryDate).getTime() - Date.now()) / 86400000;
      return days <= 7;
    });
    const milkRecipe: RecipeSuggestion = {
      id: 'mock-creamy-pantry-oats',
      title: 'Creamy Pantry Oats',
      summary: request.prompt?.trim() || 'A quick breakfast using simple household staples.',
      servings: request.servings,
      preparationMinutes: 15,
      ingredients: [
        matchIngredient(request, 'milk', 1),
        matchIngredient(request, 'oats', 1),
        {
          name: 'Cinnamon',
          quantity: 1,
          unit: 'package',
          status: 'missing',
          matchedInventoryItemIds: [],
          substitution: 'Use another warming spice if available.',
        },
      ],
      steps: ['Combine the ingredients.', 'Cook gently until creamy.', 'Serve warm.'],
      expiryPriority: request.prioritizeExpiring && hasExpiringItem ? 'high' : 'normal',
      confidence: 0.76,
    };
    const vegetableRecipe: RecipeSuggestion = {
      id: 'mock-quick-vegetable-bowl',
      title: 'Quick Vegetable Bowl',
      summary: 'A flexible bowl built around vegetables already in your inventory.',
      servings: request.servings,
      preparationMinutes: Math.min(request.maxMinutes || 25, 25),
      ingredients: [
        {
          name: 'vegetables',
          quantity: 2,
          unit: 'unit',
          status: request.inventory.some((item) => item.category === 'vegetables') ? 'available' : 'missing',
          matchedInventoryItemIds: request.inventory
            .filter((item) => item.category === 'vegetables')
            .map((item) => item.inventoryItemId),
          substitution: 'Use any fresh or frozen vegetables.',
        },
        {
          name: 'rice',
          quantity: 1,
          unit: 'package',
          status: request.inventory.some((item) => item.name.toLowerCase().includes('rice')) ? 'available' : 'missing',
          matchedInventoryItemIds: request.inventory
            .filter((item) => item.name.toLowerCase().includes('rice'))
            .map((item) => item.inventoryItemId),
          substitution: null,
        },
      ],
      steps: ['Cook the rice.', 'Cook the vegetables until tender.', 'Combine and season to taste.'],
      expiryPriority: 'normal',
      confidence: 0.69,
    };

    return [milkRecipe, vegetableRecipe];
  }
}
