import { InventoryItem } from '@/types/inventory';
import { createInventoryFingerprint } from './inventory-fingerprint';

function item(id: string, overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id,
    name: 'Milk',
    category: 'dairy',
    location: 'fridge',
    quantity: 1,
    unit: 'l',
    purchaseDate: '2026-08-18T00:00:00.000Z',
    expiryDate: '2026-08-20T00:00:00.000Z',
    purchasePrice: 2,
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('planning inventory fingerprint', () => {
  it('is stable regardless of inventory ordering', () => {
    expect(createInventoryFingerprint([item('b'), item('a')])).toBe(createInventoryFingerprint([item('a'), item('b')]));
  });

  it('changes for planning-relevant fields but ignores purchase metadata', () => {
    const original = [item('a')];
    expect(createInventoryFingerprint(original)).not.toBe(createInventoryFingerprint([item('a', { quantity: 2 })]));
    expect(createInventoryFingerprint(original)).toBe(createInventoryFingerprint([item('a', { purchasePrice: 99, notes: 'changed' })]));
  });
});