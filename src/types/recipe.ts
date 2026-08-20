import { InventoryCategory, InventoryUnit } from './inventory';
import { MealType } from './meal-plan';

export interface RecipeRequest {
  inventory: RecipeInventoryItem[];
  servings: number;
  maxMinutes?: number;
  prioritizeExpiring: boolean;
  prompt?: string;
  planning?: {
    days: number;
    mealType: MealType;
    useSoonInventoryItemIds: string[];
  };
}

export interface RecipeInventoryItem {
  inventoryItemId: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  expiryDate: string | null;
}

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: InventoryUnit | null;
  status: 'available' | 'partial' | 'missing' | 'substitution';
  matchedInventoryItemIds: string[];
  substitution?: string | null;
}

export interface RecipeSuggestion {
  id: string;
  title: string;
  summary: string;
  servings: number;
  preparationMinutes: number | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  expiryPriority: 'high' | 'normal' | 'none';
  confidence: number;
}

export interface SavedRecipe {
  recipe: RecipeSuggestion;
  savedAt: string;
  inventorySnapshotAt: string;
}
