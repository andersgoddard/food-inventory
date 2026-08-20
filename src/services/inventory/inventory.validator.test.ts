import { validateCreateItem } from './inventory.validator';

const validInput = {
  name: 'Milk',
  category: 'dairy' as const,
  location: 'fridge' as const,
  quantity: 1,
  unit: 'l' as const,
  purchaseDate: '2026-08-18T00:00:00.000Z',
  expiryDate: null,
  purchasePrice: null,
};

describe('inventory validation', () => {
  it('accepts valid item input', () => {
    expect(validateCreateItem(validInput).success).toBe(true);
  });

  const invalidCases: Array<[string, Record<string, unknown>]> = [
    ['empty names', { name: '' }],
    ['negative quantities', { quantity: -1 }],
    ['invalid dates', { purchaseDate: 'not-a-date' }],
    ['negative prices', { purchasePrice: -0.01 }],
    ['overlong notes', { notes: 'x'.repeat(501) }],
  ];

  it.each(invalidCases)('rejects %s', (_label, overrides) => {
    expect(validateCreateItem({ ...validInput, ...overrides }).success).toBe(false);
  });
});
