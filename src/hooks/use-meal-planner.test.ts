jest.mock('@/services', () => ({
  mealPlanRepository: {
    savePlan: jest.fn(),
    getPlans: jest.fn(),
    getPlan: jest.fn(),
    deletePlan: jest.fn(),
  },
}));

jest.mock('@/services/ai/mock-recipe.provider', () => ({
  MockRecipeProvider: jest.fn().mockImplementation(() => ({
    generate: jest.fn(),
  })),
}));

jest.mock('@/services/ai/openai-recipe.provider', () => ({
  OpenAiRecipeProvider: jest.fn().mockImplementation(() => ({
    generate: jest.fn(),
  })),
}));

describe('useMealPlanner', () => {
  it('uses the OpenAI-backed recipe provider for AI-assisted planning', () => {
    const { MockRecipeProvider } = require('@/services/ai/mock-recipe.provider');
    const { OpenAiRecipeProvider } = require('@/services/ai/openai-recipe.provider');
    const { useMealPlanner } = require('./use-meal-planner');

    expect(typeof useMealPlanner).toBe('function');
    expect(OpenAiRecipeProvider).toHaveBeenCalledWith({ capability: 'meal_planning' });
    expect(MockRecipeProvider).not.toHaveBeenCalled();
  });
});
