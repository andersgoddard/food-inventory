import { act, renderHook } from '@testing-library/react-native';

jest.mock('@/services', () => ({
  mealPlanRepository: {
    savePlan: jest.fn(),
    getPlans: jest.fn(),
    getPlan: jest.fn(),
    deletePlan: jest.fn(),
  },
  shoppingService: {
    detachFromMealPlan: jest.fn(),
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

  it('detaches any linked Shopping list when a saved plan is deleted', async () => {
    const { mealPlanRepository, shoppingService } = require('@/services');
    const { useMealPlanner } = require('./use-meal-planner');

    const { result } = await renderHook(() => useMealPlanner());
    await act(async () => {
      await result.current.deleteSavedPlan('11111111-1111-4111-8111-111111111111');
    });

    expect(mealPlanRepository.deletePlan).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    expect(shoppingService.detachFromMealPlan).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });
});
