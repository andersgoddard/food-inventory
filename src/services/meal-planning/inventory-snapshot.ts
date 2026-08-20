import { PLANNING_USE_SOON_DAYS } from '@/constants/meal-planning';
import { InventoryItem } from '@/types/inventory';
import { RecipeInventoryItem } from '@/types/recipe';

export interface PlanningInventoryItem extends RecipeInventoryItem {
  normalizedName: string;
  expiryDateValid: boolean;
  isExpired: boolean;
  useSoon: boolean;
}

export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.endsWith('ies') && word.length > 3) return `${word.slice(0, -3)}y`;
      if (/(oes|ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
      if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
      return word;
    })
    .join(' ');
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseExpiryDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildInventorySnapshot(
  items: InventoryItem[],
  referenceDate: Date | string = new Date()
): PlanningInventoryItem[] {
  const referenceDay = startOfDay(typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate);

  return items.map((item) => {
    const expiry = parseExpiryDate(item.expiryDate);
    const expiryDay = expiry ? startOfDay(expiry) : null;
    const daysUntilExpiry = expiryDay && !Number.isNaN(referenceDay.getTime())
      ? Math.round((expiryDay.getTime() - referenceDay.getTime()) / 86400000)
      : null;
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

    return {
      inventoryItemId: item.id,
      name: item.name,
      normalizedName: normalizeIngredientName(item.name),
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate || null,
      expiryDateValid: expiry !== null,
      isExpired,
      useSoon: !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= PLANNING_USE_SOON_DAYS,
    };
  });
}