import { SHOPPING_LISTS_STORAGE_KEY } from '@/constants/shopping';
import { ShoppingList } from '@/types/shopping';
import { ZodError } from 'zod';
import { shoppingListSchema, shoppingListsSchema } from './shopping.schemas';
import { StorageAdapter } from './storage/storage-adapter';

export class ShoppingRepository {
  constructor(private storageAdapter: StorageAdapter) {}

  async getLists(): Promise<ShoppingList[]> {
    const stored = await this.storageAdapter.get<unknown>(SHOPPING_LISTS_STORAGE_KEY);
    if (!stored) return [];
    try {
      return shoppingListsSchema.parse(stored);
    } catch (error) {
      if (error instanceof ZodError) return [];
      throw error;
    }
  }

  async getList(id: string): Promise<ShoppingList | null> {
    return (await this.getLists()).find((list) => list.id === id) || null;
  }

  async getListForMealPlan(mealPlanId: string): Promise<ShoppingList | null> {
    const matches = (await this.getLists()).filter((list) => list.mealPlanId === mealPlanId);
    if (matches.length === 0) return null;
    return matches.reduce((latest, candidate) => (candidate.updatedAt > latest.updatedAt ? candidate : latest));
  }

  async saveList(list: ShoppingList): Promise<ShoppingList> {
    const validated = shoppingListSchema.parse(list);
    const lists = await this.getLists();
    await this.storageAdapter.set(SHOPPING_LISTS_STORAGE_KEY, [
      ...lists.filter((stored) => stored.id !== validated.id),
      validated,
    ]);
    return validated;
  }

  async deleteList(id: string): Promise<void> {
    const lists = await this.getLists();
    await this.storageAdapter.set(SHOPPING_LISTS_STORAGE_KEY, lists.filter((list) => list.id !== id));
  }
}