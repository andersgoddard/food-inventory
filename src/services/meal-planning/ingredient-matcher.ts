import { RecipeIngredient } from '@/types/recipe';
import { PlanningInventoryItem, normalizeIngredientName } from './inventory-snapshot';

export type IngredientMatchStatus = 'available' | 'partial' | 'missing';

export interface IngredientMatch {
  name: string;
  normalizedName: string;
  requestedQuantity: number | null;
  availableQuantity: number;
  unit: RecipeIngredient['unit'];
  status: IngredientMatchStatus;
  matchedInventoryItemIds: string[];
  useSoonInventoryItemIds: string[];
}

interface UnitConversion {
  compatible: boolean;
  quantity: number;
}

function convertQuantity(quantity: number, from: PlanningInventoryItem['unit'], to: RecipeIngredient['unit']): UnitConversion {
  if (!to) return { compatible: false, quantity: 0 };
  if (from === to) return { compatible: true, quantity };
  if (from === 'kg' && to === 'g') return { compatible: true, quantity: quantity * 1000 };
  if (from === 'g' && to === 'kg') return { compatible: true, quantity: quantity / 1000 };
  if (from === 'l' && to === 'ml') return { compatible: true, quantity: quantity * 1000 };
  if (from === 'ml' && to === 'l') return { compatible: true, quantity: quantity / 1000 };
  return { compatible: false, quantity: 0 };
}

function namesMatch(ingredientName: string, inventoryName: string): boolean {
  const ingredient = normalizeIngredientName(ingredientName);
  const inventory = normalizeIngredientName(inventoryName);
  if (ingredient === inventory) return true;

  const ingredientWordCount = ingredient.split(' ').length;
  return ingredientWordCount > 1 && inventory.includes(ingredient);
}

export function matchIngredient(
  ingredient: RecipeIngredient,
  inventory: PlanningInventoryItem[]
): IngredientMatch {
  const matches = inventory.filter((item) => namesMatch(ingredient.name, item.name));
  const compatibleMatches = matches
    .map((item) => ({ item, conversion: convertQuantity(item.quantity, item.unit, ingredient.unit) }))
    .filter(({ conversion }) => conversion.compatible);
  const availableQuantity = compatibleMatches.reduce((total, match) => total + match.conversion.quantity, 0);
  const requestedQuantity = ingredient.quantity;
  const hasNameMatch = matches.length > 0;
  const hasCompatibleMatch = compatibleMatches.length > 0;
  const status: IngredientMatchStatus = !hasNameMatch
    ? 'missing'
    : requestedQuantity === null
      ? hasCompatibleMatch ? 'available' : 'partial'
      : !hasCompatibleMatch
        ? 'partial'
        : availableQuantity >= requestedQuantity
          ? 'available'
          : 'partial';

  return {
    name: ingredient.name,
    normalizedName: normalizeIngredientName(ingredient.name),
    requestedQuantity,
    availableQuantity,
    unit: ingredient.unit,
    status,
    matchedInventoryItemIds: matches.map((item) => item.inventoryItemId),
    useSoonInventoryItemIds: compatibleMatches
      .filter(({ item }) => item.useSoon && !item.isExpired)
      .map(({ item }) => item.inventoryItemId),
  };
}