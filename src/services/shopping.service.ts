import { PRICE_EXPENSIVE_THRESHOLD, PRICE_GOOD_THRESHOLD, PRICE_VERY_EXPENSIVE_THRESHOLD } from '@/constants/shopping';
import { InventoryUnit } from '@/types/inventory';
import { MealPlan } from '@/types/meal-plan';
import { PriceStatus, ShoppingItem, ShoppingList } from '@/types/shopping';
import { getCurrentISOString } from '@/utils/date';
import { generateUUID } from '@/utils/id';
import { InventoryService } from './inventory/inventory.service';
import { MealPlanRepository } from './meal-plan.repository';
import { matchIngredient } from './meal-planning/ingredient-matcher';
import { buildInventorySnapshot, normalizeIngredientName } from './meal-planning/inventory-snapshot';
import { deriveMealRequirements } from './meal-requirements';
import { ShoppingRepository } from './shopping.repository';

function classifyPrice(observed: number | null, reference: number | null): PriceStatus {
  if (observed === null || reference === null || reference === 0) return 'unknown';
  const difference = ((observed - reference) / reference) * 100;
  if (difference <= PRICE_GOOD_THRESHOLD) return 'good_price';
  if (difference > PRICE_VERY_EXPENSIVE_THRESHOLD) return 'very_expensive';
  if (difference > PRICE_EXPENSIVE_THRESHOLD) return 'expensive';
  return 'normal';
}


export class ShoppingService {
  constructor(
    private repository: ShoppingRepository,
    private mealPlanRepository: MealPlanRepository | undefined,
    private inventoryService: InventoryService
  ) {}

  async generateListForPlanId(planId: string, existingList: ShoppingList | null = null): Promise<ShoppingList> {
    if (!this.mealPlanRepository) throw new Error('Meal plan repository is not configured');
    const plan = await this.mealPlanRepository.getPlan(planId);
    if (!plan) throw new Error('Meal plan was not found');
    return this.generateList(plan, await this.resolveExistingList(plan.id, existingList));
  }

  async generateListForPlan(plan: MealPlan, existingList: ShoppingList | null = null): Promise<ShoppingList> {
    return this.generateList(plan, await this.resolveExistingList(plan.id, existingList));
  }

  // Falls back to any previously saved list for this plan so manual items and purchase/skip
  // state survive across sessions, not just while the list is still held in memory.
  private async resolveExistingList(planId: string, existingList: ShoppingList | null): Promise<ShoppingList | null> {
    if (existingList) return existingList;
    return this.repository.getListForMealPlan(planId);
  }

  // Called when the originating meal plan is deleted. Rather than leaving a dangling
  // mealPlanId (a confusing broken reference) or deleting the list (losing manual items and
  // purchase/skip state), the list is detached into a standalone list - `mealPlanId` becomes
  // null, which is already a supported state (manually-created lists use it), so it keeps
  // showing up under "Saved shopping lists" with everything exactly as it was left.
  async detachFromMealPlan(mealPlanId: string): Promise<ShoppingList | null> {
    const list = await this.repository.getListForMealPlan(mealPlanId);
    if (!list) return null;
    return this.repository.saveList({ ...list, mealPlanId: null, updatedAt: getCurrentISOString() });
  }

  // Shared by every intake path (manual add, receipt scan, food scan): once Inventory intake
  // has actually been confirmed, mark the originating Shopping item purchased as a separate,
  // explicit follow-up save. This never runs before intake succeeds, so Shopping status can
  // never create Inventory state on its own.
  async confirmItemPurchased(shoppingListId: string, itemId: string): Promise<ShoppingList | null> {
    const list = await this.repository.getList(shoppingListId);
    if (!list) return null;
    const updated = this.updateItemStatus(list, itemId, 'purchased');
    return this.repository.saveList(updated);
  }

  async generateList(plan: MealPlan, existingList: ShoppingList | null = null): Promise<ShoppingList> {
    const inventory = await this.inventoryService.getItems();
    const snapshot = buildInventorySnapshot(inventory);
    const requirements = deriveMealRequirements(plan);

    const listId = generateUUID();
    const now = getCurrentISOString();
    const previousMealItems = new Map(
      (existingList?.mealPlanId === plan.id ? existingList.items : [])
        .filter((item) => item.source === 'meal_plan')
        .map((item) => [item.normalizedName, item])
    );
    const items: ShoppingItem[] = [];
    for (const requirement of requirements) {
      const match = matchIngredient({
        name: requirement.name,
        quantity: requirement.quantity,
        unit: requirement.unit,
        status: 'missing',
        matchedInventoryItemIds: [],
      }, snapshot);
      // Only omit a requirement when we're confident it's covered. When the required quantity
      // is approximate or unknown, matchIngredient's "available" status just means some
      // inventory of that name exists, not that it's actually enough - so keep it on the list.
      const fullyCovered = requirement.quantityConfidence === 'exact' && match.status === 'available';
      if (fullyCovered) continue;
      const previous = previousMealItems.get(requirement.normalizedName);
      items.push({
        id: previous?.id || generateUUID(),
        shoppingListId: listId,
        product: {
          id: `product:${requirement.normalizedName}`,
          normalizedName: requirement.normalizedName,
          displayName: requirement.name,
          category: null,
          comparableProductGroupId: null,
        },
        name: requirement.name,
        normalizedName: requirement.normalizedName,
        requiredQuantity: requirement.quantity,
        availableQuantity: match.availableQuantity,
        missingQuantity: requirement.quantity === null ? null : Math.max(requirement.quantity - match.availableQuantity, 0),
        unit: requirement.unit,
        quantityConfidence: requirement.quantityConfidence,
        source: 'meal_plan',
        sourceMealPlanMealIds: requirement.mealIds,
        sourceMealTitles: requirement.mealTitles,
        hasIncompatibleUnitInventory: match.incompatibleUnitInventoryItemIds.length > 0,
        hasUseSoonInventory: match.useSoonInventoryItemIds.length > 0,
        priority: requirement.priority,
        status: previous?.status || 'needed',
        parPrice: previous?.parPrice || null,
        currentPriceObservation: previous?.currentPriceObservation || null,
        priceStatus: previous?.priceStatus || 'unknown',
        ...(previous?.priceAssessment ? { priceAssessment: previous.priceAssessment } : {}),
        createdAt: now,
        updatedAt: now,
      });
    }

    const manualItems = existingList?.mealPlanId === plan.id
      ? existingList.items.filter((item) => item.source === 'manual').map((item) => ({ ...item, shoppingListId: listId, updatedAt: now }))
      : [];

    return {
      id: listId,
      title: `Shopping for ${plan.title}`,
      mealPlanId: plan.id,
      items: [...items, ...manualItems],
      createdAt: now,
      updatedAt: now,
      status: 'open',
    };
  }

  async saveList(list: ShoppingList): Promise<ShoppingList> { return this.repository.saveList(list); }
  async getLists(): Promise<ShoppingList[]> { return this.repository.getLists(); }
  async getList(id: string): Promise<ShoppingList | null> { return this.repository.getList(id); }
  async deleteList(id: string): Promise<void> { return this.repository.deleteList(id); }

  updateItemStatus(list: ShoppingList, itemId: string, status: ShoppingItem['status']): ShoppingList {
    return {
      ...list,
      items: list.items.map((item) => item.id === itemId ? { ...item, status, updatedAt: getCurrentISOString() } : item),
      updatedAt: getCurrentISOString(),
    };
  }

  removeItem(list: ShoppingList, itemId: string): ShoppingList {
    return {
      ...list,
      items: list.items.filter((item) => item.id !== itemId),
      updatedAt: getCurrentISOString(),
    };
  }

  addManualItem(list: ShoppingList, name: string, quantity: number | null, unit: InventoryUnit | null, priority: ShoppingItem['priority'] = 'required'): ShoppingList {
    const now = getCurrentISOString();
    const normalizedName = normalizeIngredientName(name);
    const item: ShoppingItem = {
      id: generateUUID(),
      shoppingListId: list.id,
      product: null,
      name: name.trim(),
      normalizedName,
      requiredQuantity: quantity,
      availableQuantity: null,
      missingQuantity: quantity,
      unit,
      quantityConfidence: quantity !== null && unit !== null ? 'exact' : 'unknown',
      source: 'manual',
      sourceMealPlanMealIds: [],
      sourceMealTitles: [],
      hasIncompatibleUnitInventory: false,
      hasUseSoonInventory: false,
      priority,
      status: 'needed',
      parPrice: null,
      currentPriceObservation: null,
      priceStatus: 'unknown',
      createdAt: now,
      updatedAt: now,
    };
    return { ...list, items: [...list.items, item], updatedAt: now };
  }

  classifyItemPrice(item: ShoppingItem, observedPrice: number, referencePrice: number): ShoppingItem {
    const now = getCurrentISOString();
    const product = item.product || {
      id: `product:${item.normalizedName}`,
      normalizedName: item.normalizedName,
      displayName: item.name,
      category: null,
      comparableProductGroupId: null,
    };
    return {
      ...item,
      product,
      parPrice: {
        productIdentityId: product.id,
        amount: referencePrice,
        currency: 'GBP',
        unit: item.unit || 'package',
        source: 'user_defined',
        effectiveDate: now,
      },
      currentPriceObservation: {
        id: generateUUID(),
        productIdentityId: product.id,
        amount: observedPrice,
        currency: 'GBP',
        quantity: 1,
        unit: item.unit || 'package',
        pricePerBaseUnit: observedPrice,
        observedAt: now,
        source: 'manual',
        retailer: null,
        promotion: 'none',
      },
      priceStatus: classifyPrice(observedPrice, referencePrice),
      updatedAt: now,
    };
  }
}