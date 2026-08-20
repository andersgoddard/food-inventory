import { MealPlan } from '@/types/meal-plan';
import { isMealPlanStale, prepareSavedMealPlan } from './persistence';

const plan: MealPlan = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Dinner plan',
  version: 1,
  startDate: '2026-08-18T00:00:00.000Z',
  endDate: '2026-08-20T00:00:00.000Z',
  preferences: { people: 2, days: 3, mealType: 'dinner', prioritizeExpiring: true },
  days: [],
  meals: [],
  inventorySnapshotAt: '2026-08-18T00:00:00.000Z',
  inventoryFingerprint: 'fingerprint-a',
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
  status: 'draft',
};

describe('meal-plan persistence semantics', () => {
  it('starts new plans at their existing version and increments edited saved plans', () => {
    const newSaved = prepareSavedMealPlan(plan, null, '2026-08-19T00:00:00.000Z');
    const edited = prepareSavedMealPlan({ ...plan, status: 'draft' }, { ...plan, status: 'saved' }, '2026-08-20T00:00:00.000Z');

    expect(newSaved).toMatchObject({ status: 'saved', version: 1, createdAt: plan.createdAt });
    expect(edited).toMatchObject({ status: 'saved', version: 2, createdAt: plan.createdAt });
    expect(edited.inventoryFingerprint).toBe(plan.inventoryFingerprint);
  });

  it('detects only a changed planning fingerprint as stale', () => {
    expect(isMealPlanStale(plan, 'fingerprint-a')).toBe(false);
    expect(isMealPlanStale(plan, 'fingerprint-b')).toBe(true);
    expect(isMealPlanStale({ ...plan, inventoryFingerprint: undefined }, 'fingerprint-b')).toBe(false);
  });

  it('increments a directly opened saved plan when it is edited and saved', () => {
    const opened = { ...plan, status: 'saved' as const };
    const draft = { ...opened, status: 'draft' as const };
    const savedAgain = prepareSavedMealPlan(draft, opened, '2026-08-21T00:00:00.000Z');

    expect(savedAgain.version).toBe(2);
    expect(savedAgain.id).toBe(opened.id);
  });
});