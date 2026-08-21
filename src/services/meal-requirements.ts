import { InventoryUnit } from '@/types/inventory';
import { MealPlan } from '@/types/meal-plan';
import { normalizeIngredientName } from './meal-planning/inventory-snapshot';

export interface MealRequirement {
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: InventoryUnit | null;
  mealIds: string[];
  priority: 'required' | 'recommended';
}

function requirementKey(requirement: Pick<MealRequirement, 'normalizedName' | 'unit'>): string {
  return `${requirement.normalizedName}:${requirement.unit || 'unknown'}`;
}

export function deriveMealRequirements(plan: MealPlan): MealRequirement[] {
  const requirements = new Map<string, MealRequirement>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.recipeSnapshot.ingredients) {
        const requirement: MealRequirement = {
          name: ingredient.name,
          normalizedName: normalizeIngredientName(ingredient.name),
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          mealIds: [meal.id],
          priority: ingredient.status === 'substitution' ? 'recommended' : 'required',
        };
        const key = requirementKey(requirement);
        const existing = requirements.get(key);
        if (!existing) {
          requirements.set(key, requirement);
          continue;
        }

        existing.mealIds = [...new Set([...existing.mealIds, meal.id])];
        if (requirement.priority === 'required') existing.priority = 'required';
        existing.quantity = existing.quantity !== null && requirement.quantity !== null
          ? existing.quantity + requirement.quantity
          : null;
      }
    }
  }

  return [...requirements.values()];
}