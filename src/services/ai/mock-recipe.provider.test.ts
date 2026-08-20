import { MockRecipeProvider } from './mock-recipe.provider';

describe('MockRecipeProvider', () => {
  it('generates explainable suggestions from an inventory snapshot', async () => {
    const provider = new MockRecipeProvider();
    const suggestions = await provider.generate({
      inventory: [
        {
          inventoryItemId: 'milk-1',
          name: 'Milk',
          category: 'dairy',
          quantity: 1,
          unit: 'l',
          expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        },
      ],
      servings: 2,
      maxMinutes: 30,
      prioritizeExpiring: true,
      prompt: 'quick breakfast',
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].summary).toBe('quick breakfast');
    expect(suggestions[0].ingredients[0]).toMatchObject({
      name: 'milk',
      status: 'available',
      matchedInventoryItemIds: ['milk-1'],
    });
    expect(suggestions[0].expiryPriority).toBe('high');
    expect(suggestions[0].ingredients[2].status).toBe('missing');
  });
});
