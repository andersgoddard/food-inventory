import { MealPlanningPreferences } from '@/types/meal-plan';
import { RecipeSuggestion } from '@/types/recipe';
import { CandidateEvaluation, evaluateCandidate } from './candidate-scoring';
import { PlanningInventoryItem } from './inventory-snapshot';

function compareCandidates(left: CandidateEvaluation, right: CandidateEvaluation): number {
  return right.score - left.score
    || right.coveragePercent - left.coveragePercent
    || Number(right.usesExpiringIngredients) - Number(left.usesExpiringIngredients)
    || left.missingCount - right.missingCount
    || left.recipe.id.localeCompare(right.recipe.id);
}

export function rankMealCandidates(
  candidates: RecipeSuggestion[],
  inventory: PlanningInventoryItem[],
  preferences: MealPlanningPreferences,
  excludedRecipeIds: string[] = [],
  recentIngredients: string[] = []
): CandidateEvaluation[] {
  const excluded = new Set(excludedRecipeIds);
  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];

  return uniqueCandidates
    .filter((candidate) => !excluded.has(candidate.id))
    .map((candidate) => evaluateCandidate(candidate, inventory, preferences, recentIngredients))
    .filter((evaluation): evaluation is CandidateEvaluation => evaluation !== null)
    .sort(compareCandidates);
}

export function selectMealCandidates(
  candidates: RecipeSuggestion[],
  inventory: PlanningInventoryItem[],
  preferences: MealPlanningPreferences
): CandidateEvaluation[] {
  const selected: CandidateEvaluation[] = [];

  for (let dayIndex = 0; dayIndex < preferences.days; dayIndex += 1) {
    const recentIngredients = selected
      .map((evaluation) => evaluation.dominantIngredient)
      .filter((ingredient): ingredient is string => ingredient !== null);
    const evaluations = rankMealCandidates(
      candidates,
      inventory,
      preferences,
      selected.map((evaluation) => evaluation.recipe.id),
      recentIngredients
    );

    const next = evaluations[0];
    if (!next) break;
    selected.push(next);
  }

  return selected;
}