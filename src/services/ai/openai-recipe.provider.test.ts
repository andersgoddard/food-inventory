import { AiProvider } from './ai-capability';
import { OpenAiRecipeProvider } from './openai-recipe.provider';

const request = {
  inventory: [{
    inventoryItemId: 'milk-1',
    name: 'Milk',
    category: 'dairy' as const,
    quantity: 1,
    unit: 'l' as const,
    expiryDate: '2026-08-20T00:00:00.000Z',
  }],
  servings: 2,
  maxMinutes: 30,
  prioritizeExpiring: true,
  prompt: 'quick breakfast',
};

describe('OpenAiRecipeProvider', () => {
  it('validates suggestions and reconciles ingredients against local inventory', async () => {
    const aiProvider: AiProvider = {
      request: jest.fn().mockResolvedValue({
        capability: 'recipe_suggestions',
        model: 'gpt-5.4-mini',
        output: {
          suggestions: [{
            title: 'Milk oats',
            summary: 'A quick breakfast.',
            servings: 4,
            preparationMinutes: 15,
            ingredients: [
              { name: 'milk', quantity: 1, unit: 'l', substitution: null },
              { name: 'oats', quantity: 1, unit: 'package', substitution: null },
            ],
            steps: ['Combine and cook.'],
            expiryPriority: 'normal',
            confidence: 0.82,
          }],
        },
      }),
    };
    const provider = new OpenAiRecipeProvider({ aiProvider });

    const suggestions = await provider.generate(request);

    expect(suggestions[0]).toMatchObject({
      title: 'Milk oats',
      servings: 2,
      expiryPriority: 'high',
    });
    expect(suggestions[0].ingredients).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'milk', status: 'available', matchedInventoryItemIds: ['milk-1'] }),
      expect.objectContaining({ name: 'oats', status: 'missing', matchedInventoryItemIds: [] }),
    ]));
    expect(aiProvider.request).toHaveBeenCalledWith(expect.objectContaining({ capability: 'recipe_suggestions' }));
  });

  it('uses the dedicated meal-planning capability and forwards planning context', async () => {
    const aiProvider: AiProvider = {
      request: jest.fn().mockResolvedValue({
        capability: 'meal_planning',
        model: 'gpt-5.4-mini',
        output: { suggestions: [{
          title: 'Use-soon milk oats',
          summary: 'A practical meal for the plan.',
          servings: 2,
          preparationMinutes: 15,
          ingredients: [{ name: 'milk', quantity: 1, unit: 'l', substitution: null }],
          steps: ['Combine and cook.'],
          expiryPriority: 'high',
          confidence: 0.9,
        }] },
      }),
    };
    const provider = new OpenAiRecipeProvider({ aiProvider, capability: 'meal_planning' });

    await provider.generate({
      ...request,
      planning: { days: 7, mealType: 'dinner', useSoonInventoryItemIds: ['milk-1'] },
    });

    expect(aiProvider.request).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'meal_planning',
      input: expect.objectContaining({
        planning: { days: 7, mealType: 'dinner', useSoonInventoryItemIds: ['milk-1'] },
      }),
    }));
  });

  it('rejects malformed or unsafe recipe output', async () => {
    const aiProvider: AiProvider = {
      request: jest.fn().mockResolvedValue({
        capability: 'recipe_suggestions',
        model: 'gpt-5.4-mini',
        output: { suggestions: [{ title: '', summary: '', servings: 0, ingredients: [], steps: [], confidence: 4 }] },
      }),
    };
    const provider = new OpenAiRecipeProvider({ aiProvider });

    await expect(provider.generate(request)).rejects.toThrow();
  });
});