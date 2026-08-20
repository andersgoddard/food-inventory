import { mealPlanRepository } from '@/services';
import { OpenAiRecipeProvider } from '@/services/ai/openai-recipe.provider';
import { MealPlanningService } from '@/services/meal-planning.service';
import { isMealPlanStale, prepareSavedMealPlan } from '@/services/meal-planning/persistence';
import { mergeRejectedRecipeIds } from '@/services/meal-planning/replacement';
import { MealPlan, MealPlanMeal, MealPlanningPreferences } from '@/types/meal-plan';
import { getCurrentISOString } from '@/utils/date';
import { useCallback, useState } from 'react';

const planner = new MealPlanningService(new OpenAiRecipeProvider({ capability: 'meal_planning' }));

export interface MealReplacementState {
  dayIndex: number;
  currentMeal: MealPlanMeal | null;
  candidates: MealPlanMeal[];
  rejectedRecipeIds: string[];
  loading: boolean;
  error: string | null;
}

export function useMealPlanner() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planStale, setPlanStale] = useState(false);
  const [rejectedRecipeIds, setRejectedRecipeIds] = useState<string[]>([]);
  const [replacement, setReplacement] = useState<MealReplacementState | null>(null);

  const generate = useCallback(async (preferences: MealPlanningPreferences) => {
    try {
      setLoading(true);
      setError(null);
      setRejectedRecipeIds([]);
      setReplacement(null);
      setPlanStale(false);
      setPlan(await planner.generatePlan(preferences));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Unable to generate meal plan');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReplacementCandidates = useCallback(async (dayIndex: number, excludedRecipeIds: string[]) => {
    if (!plan) return;
    const currentMeal = plan.days
      .flatMap((day) => day.meals)
      .find((meal) => meal.dayIndex === dayIndex) || null;
    setReplacement({
      dayIndex,
      currentMeal,
      candidates: [],
      rejectedRecipeIds: excludedRecipeIds,
      loading: true,
      error: null,
    });

    try {
      const candidates = await planner.getReplacementCandidates(plan, dayIndex, excludedRecipeIds);
      setReplacement((current) => current && current.dayIndex === dayIndex
        ? { ...current, candidates, loading: false }
        : current);
    } catch (replacementError) {
      setReplacement((current) => current && current.dayIndex === dayIndex
        ? {
            ...current,
            loading: false,
            error: replacementError instanceof Error ? replacementError.message : 'Unable to load alternative meals',
          }
        : current);
    }
  }, [plan]);

  const openReplacement = useCallback((dayIndex: number) => {
    loadReplacementCandidates(dayIndex, rejectedRecipeIds);
  }, [loadReplacementCandidates, rejectedRecipeIds]);

  const regenerateReplacement = useCallback(() => {
    if (!replacement) return;
    const nextRejectedRecipeIds = mergeRejectedRecipeIds(rejectedRecipeIds, replacement.candidates);
    setRejectedRecipeIds(nextRejectedRecipeIds);
    loadReplacementCandidates(replacement.dayIndex, nextRejectedRecipeIds);
  }, [loadReplacementCandidates, rejectedRecipeIds, replacement]);

  const selectReplacement = useCallback((candidate: MealPlanMeal) => {
    if (!plan || !replacement || replacement.dayIndex !== candidate.dayIndex) return;
    setPlan(planner.replaceMeal(plan, replacement.dayIndex, candidate));
    setReplacement(null);
  }, [plan, replacement]);

  const cancelReplacement = useCallback(() => setReplacement(null), []);

  const save = useCallback(async () => {
    if (!plan || loading) return;
    try {
      setLoading(true);
      setError(null);
      const existing = savedPlans.find((item) => item.id === plan.id) || null;
      const saved = prepareSavedMealPlan(plan, existing, getCurrentISOString());
      const stored = await mealPlanRepository.savePlan(saved);
      const next = [...savedPlans.filter((item) => item.id !== stored.id), stored];
      setSavedPlans(next);
      setPlan(stored);
    } finally {
      setLoading(false);
    }
  }, [loading, plan, savedPlans]);

  const beginEdit = useCallback(() => {
    if (!plan || plan.status !== 'saved') return;
    setPlan({ ...plan, status: 'draft' });
    setReplacement(null);
  }, [plan]);

  const cancelEdit = useCallback(() => {
    if (!plan || plan.status !== 'draft') return;
    const savedVersion = savedPlans.find((item) => item.id === plan.id);
    if (savedVersion) {
      setPlan(savedVersion);
      setReplacement(null);
    }
  }, [plan, savedPlans]);

  const loadSavedPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stored = await mealPlanRepository.getPlans();
      setSavedPlans(stored);
      return stored;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load saved meal plans');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSavedPlan = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      setReplacement(null);
      setRejectedRecipeIds([]);
      const [stored, allPlans] = await Promise.all([
        mealPlanRepository.getPlan(id),
        mealPlanRepository.getPlans(),
      ]);
      setSavedPlans(allPlans);
      if (!stored) {
        setPlan(null);
        setPlanStale(false);
        setError('Saved meal plan was not found');
        return;
      }
      setPlan(stored);
      if (stored.inventoryFingerprint) {
        try {
          setPlanStale(isMealPlanStale(stored, await planner.getCurrentInventoryFingerprint()));
        } catch {
          setPlanStale(false);
        }
      } else {
        setPlanStale(false);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load saved meal plan');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSavedPlan = useCallback(async (id: string) => {
    await mealPlanRepository.deletePlan(id);
    setSavedPlans((current) => current.filter((item) => item.id !== id));
    if (plan?.id === id) {
      setPlan(null);
      setPlanStale(false);
    }
  }, [plan?.id]);

  const loadSaved = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setReplacement(null);
      setRejectedRecipeIds([]);
      const stored = await mealPlanRepository.getPlans();
      setSavedPlans(stored);
      const latest = stored
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt))[0];
      if (!latest) {
        setPlan(null);
        setPlanStale(false);
      } else {
        setPlan(latest);
        if (latest.inventoryFingerprint) {
          try {
            setPlanStale(isMealPlanStale(latest, await planner.getCurrentInventoryFingerprint()));
          } catch {
            setPlanStale(false);
          }
        } else {
          setPlanStale(false);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load saved meal plan');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    plan,
    savedPlans,
    loading,
    error,
    planStale,
    replacement,
    generate,
    openReplacement,
    regenerateReplacement,
    selectReplacement,
    cancelReplacement,
    beginEdit,
    cancelEdit,
    loadSavedPlans,
    loadSavedPlan,
    deleteSavedPlan,
    save,
    loadSaved,
  };
}
