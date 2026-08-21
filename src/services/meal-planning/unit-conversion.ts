import { InventoryUnit } from '@/types/inventory';

export interface UnitConversion {
  compatible: boolean;
  quantity: number;
}

// Only converts between units that represent the same physical quantity (mass or volume);
// 'unit' and 'package' are treated as incompatible with anything but themselves.
export function convertQuantity(quantity: number, from: InventoryUnit, to: InventoryUnit | null): UnitConversion {
  if (!to) return { compatible: false, quantity: 0 };
  if (from === to) return { compatible: true, quantity };
  if (from === 'kg' && to === 'g') return { compatible: true, quantity: quantity * 1000 };
  if (from === 'g' && to === 'kg') return { compatible: true, quantity: quantity / 1000 };
  if (from === 'l' && to === 'ml') return { compatible: true, quantity: quantity * 1000 };
  if (from === 'ml' && to === 'l') return { compatible: true, quantity: quantity / 1000 };
  return { compatible: false, quantity: 0 };
}
