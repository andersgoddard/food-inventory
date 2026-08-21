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
    return this.generateList(plan, existingList);
  }

  async generateListForPlan(plan: MealPlan, existingList: ShoppingList | null = null): Promise<ShoppingList> {
    return this.generateList(plan, existingList);
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
        .map((item) => [`${item.normalizedName}:${item.unit || 'unknown'}`, item])
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
      const fullyCovered = match.status === 'available';
      if (fullyCovered) continue;
      const quantityConfidence = requirement.quantity !== null && requirement.unit !== null ? 'exact' : 'unknown';
      const previous = previousMealItems.get(`${requirement.normalizedName}:${requirement.unit || 'unknown'}`);
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
        quantityConfidence,
        source: 'meal_plan',
        sourceMealPlanMealIds: requirement.mealIds,
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