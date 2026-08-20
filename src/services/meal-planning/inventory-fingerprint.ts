import { InventoryItem } from '@/types/inventory';

export function createInventoryFingerprint(items: InventoryItem[]): string {
  const relevantItems = items
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expiryDate: item.expiryDate || null,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return JSON.stringify(relevantItems);
}