import { RecipeSuggestion } from './recipe';

export type MealType = 'dinner' | 'breakfast' | 'lunch' | 'snack';

export interface MealPlanningPreferences {
  people: number;
  days: number;
  mealType: MealType;
  prioritizeExpiring: boolean;
}

export interface MealPlanMeal {
  id: string;
  dayIndex: number;
  mealType: MealType;
  recipeId: string;
  recipeSnapshot: RecipeSuggestion;
  coveragePercent: number;
  missingIngredients: string[];
  usesExpiringIngredients: boolean;
  reasons: string[];
}

export interface MealPlanDay {
  date: string;
  meals: MealPlanMeal[];
}

export interface MealPlan {
  id: string;
  title: string;
  version: number;
  startDate: string;
  endDate: string;
  preferences: MealPlanningPreferences;
  days: MealPlanDay[];
  /** Compatibility projection for the current planner UI. */
  meals: MealPlanMeal[];
  inventorySnapshotAt: string;
  inventoryFingerprint?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'saved';
}
