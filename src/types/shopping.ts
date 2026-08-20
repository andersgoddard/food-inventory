import { InventoryCategory, InventoryUnit } from './inventory';

export type ShoppingItemStatus = 'needed' | 'purchased' | 'skipped';
export type ShoppingItemPriority = 'required' | 'recommended';
export type PriceStatus = 'good_price' | 'normal' | 'expensive' | 'very_expensive' | 'unknown';
export type PriceRecommendation = 'buy_now' | 'wait' | 'alternative' | 'no_confident_recommendation';
export type PriceVolatility = 'low' | 'medium' | 'high' | 'unknown';

export interface PriceTrend {
  direction: 'rising' | 'falling' | 'stable' | 'unknown';
  changePercent: number | null;
  observationCount: number;
}

export interface PriceAssessment {
  status: PriceStatus;
  differencePercent: number | null;
  recommendation: PriceRecommendation;
  freshness: 'current' | 'stale' | 'unknown';
  trend: PriceTrend;
  volatility: PriceVolatility;
  reasons: string[];
}

export interface ProductIdentity {
  id: string;
  normalizedName: string;
  displayName: string;
  category: InventoryCategory | null;
  comparableProductGroupId: string | null;
}

export interface ParPrice {
  productIdentityId: string;
  amount: number;
  currency: string;
  unit: InventoryUnit;
  source: 'user_defined' | 'fixture';
  effectiveDate: string;
}

export interface PriceObservation {
  id: string;
  productIdentityId: string;
  amount: number;
  currency: string;
  quantity: number | null;
  unit: InventoryUnit | null;
  pricePerBaseUnit: number | null;
  observedAt: string;
  source: 'manual' | 'fixture';
  retailer: string | null;
  promotion: 'none' | 'promotional' | 'multi_buy' | 'loyalty' | null;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ShoppingItem {
  id: string;
  shoppingListId: string;
  product: ProductIdentity | null;
  name: string;
  normalizedName: string;
  requiredQuantity: number | null;
  availableQuantity: number | null;
  missingQuantity: number | null;
  unit: InventoryUnit | null;
  quantityConfidence: 'exact' | 'approximate' | 'unknown';
  source: 'meal_plan' | 'manual';
  sourceMealPlanMealIds: string[];
  priority: ShoppingItemPriority;
  status: ShoppingItemStatus;
  parPrice: ParPrice | null;
  currentPriceObservation: PriceObservation | null;
  priceStatus: PriceStatus;
  priceAssessment?: PriceAssessment;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  mealPlanId: string | null;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'completed';
}