import { MEAL_PLAN_PREFERENCES_ROUTE } from '@/constants/meal-plan';
import {
    createDinnerPlanningPreferences,
    defaultMealPlanningPreferences,
    mealPlanningPreferencesSchema,
    parseMealPlanningPreferences,
    toMealPlanRouteParams,
} from './meal-plan.schemas';

describe('V0.5-B planning preferences', () => {
  it('defines the required defaults', () => {
    expect(defaultMealPlanningPreferences).toEqual({
      people: 2,
      days: 7,
      mealType: 'dinner',
      prioritizeExpiring: true,
    });
  });

  it('accepts valid canonical preference combinations', () => {
    expect(parseMealPlanningPreferences({
      people: 4,
      days: 5,
      mealType: 'dinner',
      prioritizeExpiring: true,
    })).toEqual({
      people: 4,
      days: 5,
      mealType: 'dinner',
      prioritizeExpiring: true,
    });
  });

  it('creates the canonical dinner preferences object from screen values', () => {
    expect(createDinnerPlanningPreferences('2', 7)).toEqual(defaultMealPlanningPreferences);
  });

  it('serializes only validated canonical preferences for the planner route', () => {
    const preferences = createDinnerPlanningPreferences('4', 5);

    expect(toMealPlanRouteParams(preferences)).toEqual({
      people: '4',
      days: '5',
      mealType: 'dinner',
      prioritizeExpiring: 'true',
    });
  });

  it.each([
    { people: 0, days: 7, mealType: 'dinner' },
    { people: 13, days: 7, mealType: 'dinner' },
    { people: 2.5, days: 7, mealType: 'dinner' },
    { people: 2, days: 4, mealType: 'dinner' },
    { people: 2, days: 7, mealType: 'invalid' },
  ])('rejects invalid preference values: %o', (value) => {
    expect(() => mealPlanningPreferencesSchema.parse({
      ...value,
      prioritizeExpiring: true,
    })).toThrow();
  });

  it('exposes the dedicated preferences route used by Home', () => {
    expect(MEAL_PLAN_PREFERENCES_ROUTE).toBe('/meal-plan/preferences');
  });
});