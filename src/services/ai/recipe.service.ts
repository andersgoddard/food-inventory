import { inventoryService } from '@/services';
import { InventoryItem } from '@/types/inventory';
import { RecipeRequest, RecipeSuggestion } from '@/types/recipe';
import { RecipeProvider } from './recipe.provider';

export class RecipeService {
  constructor(private provider: RecipeProvider) {}

  async getSuggestions(
    options: Omit<RecipeRequest, 'inventory'>
  ): Promise<RecipeSuggestion[]> {
    const items = await inventoryService.getItems();
    const request: RecipeRequest = {
      ...options,
      inventory: this.buildSnapshot(items),
    };
    const suggestions = await this.provider.generate(request);
    return suggestions.filter(
      (suggestion) => suggestion.title.trim() && suggestion.ingredients.length > 0
    );
  }

  private buildSnapshot(items: InventoryItem[]): RecipeRequest['inventory'] {
    return items.map((item) => ({
      inventoryItemId: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate || null,
    }));
  }
}
