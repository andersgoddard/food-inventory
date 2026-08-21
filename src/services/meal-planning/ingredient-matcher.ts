import { RecipeIngredient } from '@/types/recipe';
import { PlanningInventoryItem, normalizeIngredientName } from './inventory-snapshot';
import { convertQuantity } from './unit-conversion';

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
  // Non-expired inventory rows that match by name but whose unit couldn't be reconciled with the
  // requested unit. Their quantity is conservatively excluded from availableQuantity rather than
  // guessed at, so this list lets callers surface "some matching stock couldn't be compared".
  incompatibleUnitInventoryItemIds: string[];
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
  // Expired stock isn't safely usable, so it can't count toward covering a requirement,
  // even though it's still reported in matchedInventoryItemIds for traceability/alerts.
  const usableMatches = matches.filter((item) => !item.isExpired);
  const convertedMatches = usableMatches.map((item) => ({ item, conversion: convertQuantity(item.quantity, item.unit, ingredient.unit) }));
  const compatibleMatches = convertedMatches.filter(({ conversion }) => conversion.compatible);
  // Conservative by design: a name match with an incompatible unit (e.g. inventory in "unit"
  // when the recipe needs "g") is never guessed at or silently folded into availableQuantity.
  const incompatibleUnitMatches = ingredient.unit ? convertedMatches.filter(({ conversion }) => !conversion.compatible) : [];
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
    incompatibleUnitInventoryItemIds: incompatibleUnitMatches.map(({ item }) => item.inventoryItemId),
  };
}