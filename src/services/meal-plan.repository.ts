import { MEAL_PLANS_STORAGE_KEY } from '@/constants/meal-plan';
import { MealPlan } from '@/types/meal-plan';
import { ZodError } from 'zod';
import { mealPlanSchema, mealPlansSchema } from './meal-plan.schemas';
import { StorageAdapter } from './storage/storage-adapter';

export class MealPlanRepository {
  constructor(private storageAdapter: StorageAdapter) {}

  async getPlans(): Promise<MealPlan[]> {
    const stored = await this.storageAdapter.get<unknown>(MEAL_PLANS_STORAGE_KEY);
    if (!stored) return [];
    try {
      return mealPlansSchema.parse(stored);
    } catch (error) {
      if (error instanceof ZodError) return [];
      throw error;
    }
  }

  async getPlan(id: string): Promise<MealPlan | null> {
    const plans = await this.getPlans();
    return plans.find((plan) => plan.id === id) || null;
  }

  async getLatestPlan(): Promise<MealPlan | null> {
    const plans = await this.getPlans();
    return plans
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt))[0] || null;
  }

  async savePlan(plan: MealPlan): Promise<MealPlan> {
    const validated = mealPlanSchema.parse(plan);
    const plans = await this.getPlans();
    const next = [...plans.filter((stored) => stored.id !== validated.id), validated];
    await this.storageAdapter.set(MEAL_PLANS_STORAGE_KEY, next);
    return validated;
  }

  async deletePlan(id: string): Promise<void> {
    const plans = await this.getPlans();
    await this.storageAdapter.set(
      MEAL_PLANS_STORAGE_KEY,
      plans.filter((plan) => plan.id !== id)
    );
  }
}