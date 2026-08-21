import { InventoryUnit } from '@/types/inventory';
import { MealPlan } from '@/types/meal-plan';
import { normalizeIngredientName } from './meal-planning/inventory-snapshot';
import { convertQuantity } from './meal-planning/unit-conversion';

export type MealRequirementQuantityConfidence = 'exact' | 'approximate' | 'unknown';

export interface MealRequirement {
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: InventoryUnit | null;
  mealIds: string[];
  mealTitles: string[];
  priority: 'required' | 'recommended';
  quantityConfidence: MealRequirementQuantityConfidence;
}

interface RequirementAccumulator {
  name: string;
  normalizedName: string;
  unit: InventoryUnit | null;
  knownQuantity: number | null;
  hasUnconvertedContribution: boolean;
  mealIds: string[];
  mealTitles: string[];
  priority: 'required' | 'recommended';
}

function finalize(accumulator: RequirementAccumulator): MealRequirement {
  const quantityConfidence: MealRequirementQuantityConfidence = accumulator.knownQuantity === null
    ? 'unknown'
    : accumulator.hasUnconvertedContribution
      ? 'approximate'
      : 'exact';
  return {
    name: accumulator.name,
    normalizedName: accumulator.normalizedName,
    quantity: accumulator.knownQuantity,
    unit: accumulator.unit,
    mealIds: accumulator.mealIds,
    mealTitles: accumulator.mealTitles,
    priority: accumulator.priority,
    quantityConfidence,
  };
}

// Ingredients are aggregated by identity alone (not identity+unit) so equivalent ingredients
// requested in compatible units (e.g. 500ml and 1l) combine into a single requirement instead
// of fragmenting the shopping list. Quantities that can't be reconciled degrade confidence
// rather than being silently dropped or forcing the whole requirement to an unknown quantity.
export function deriveMealRequirements(plan: MealPlan): MealRequirement[] {
  const accumulators = new Map<string, RequirementAccumulator>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.recipeSnapshot.ingredients) {
        const normalizedName = normalizeIngredientName(ingredient.name);
        const priority: 'required' | 'recommended' = ingredient.status === 'substitution' ? 'recommended' : 'required';
        // A quantity without a unit (or vice versa) can't be reconciled against other meals, so it's untrusted.
        const trustedQuantity = ingredient.quantity !== null && ingredient.unit !== null;
        const existing = accumulators.get(normalizedName);

        if (!existing) {
          accumulators.set(normalizedName, {
            name: ingredient.name,
            normalizedName,
            unit: trustedQuantity ? ingredient.unit : null,
            knownQuantity: trustedQuantity ? ingredient.quantity : null,
            hasUnconvertedContribution: !trustedQuantity,
            mealIds: [meal.id],
            mealTitles: [meal.recipeSnapshot.title],
            priority,
          });
          continue;
        }

        existing.mealIds = [...new Set([...existing.mealIds, meal.id])];
        existing.mealTitles = [...new Set([...existing.mealTitles, meal.recipeSnapshot.title])];
        if (priority === 'required') existing.priority = 'required';

        if (!trustedQuantity) {
          existing.hasUnconvertedContribution = true;
          continue;
        }

        if (existing.unit === null) {
          existing.unit = ingredient.unit;
          existing.knownQuantity = ingredient.quantity;
          continue;
        }

        const conversion = convertQuantity(ingredient.quantity as number, ingredient.unit as InventoryUnit, existing.unit);
        if (!conversion.compatible) {
          existing.hasUnconvertedContribution = true;
          continue;
        }

        existing.knownQuantity = (existing.knownQuantity ?? 0) + conversion.quantity;
      }
    }
  }

  return [...accumulators.values()].map(finalize);
}