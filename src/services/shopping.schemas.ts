import { z } from 'zod';
import { inventoryCategorySchema, inventoryUnitSchema } from './inventory/inventory.schemas';

const isoDateTimeSchema = z.string().datetime({ offset: true });
const productIdentitySchema = z.object({
  id: z.string().min(1),
  normalizedName: z.string().min(1),
  displayName: z.string().min(1),
  category: inventoryCategorySchema.nullable(),
  comparableProductGroupId: z.string().nullable(),
});
const parPriceSchema = z.object({
  productIdentityId: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().min(1),
  unit: inventoryUnitSchema,
  source: z.enum(['user_defined', 'fixture']),
  effectiveDate: isoDateTimeSchema,
});
const priceObservationSchema = z.object({
  id: z.string().min(1),
  productIdentityId: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().min(1),
  quantity: z.number().positive().nullable(),
  unit: inventoryUnitSchema.nullable(),
  pricePerBaseUnit: z.number().nonnegative().nullable(),
  observedAt: isoDateTimeSchema,
  source: z.enum(['manual', 'fixture']),
  retailer: z.string().nullable(),
  promotion: z.enum(['none', 'promotional', 'multi_buy', 'loyalty']).nullable(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});
const shoppingItemSchema = z.object({
  id: z.string().uuid(),
  shoppingListId: z.string().uuid(),
  product: productIdentitySchema.nullable(),
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  requiredQuantity: z.number().positive().nullable(),
  availableQuantity: z.number().nonnegative().nullable(),
  missingQuantity: z.number().nonnegative().nullable(),
  unit: inventoryUnitSchema.nullable(),
  quantityConfidence: z.enum(['exact', 'approximate', 'unknown']),
  source: z.enum(['meal_plan', 'manual']),
  sourceMealPlanMealIds: z.array(z.string()),
  priority: z.enum(['required', 'recommended']),
  status: z.enum(['needed', 'purchased', 'skipped']),
  parPrice: parPriceSchema.nullable(),
  currentPriceObservation: priceObservationSchema.nullable(),
  priceStatus: z.enum(['good_price', 'normal', 'expensive', 'very_expensive', 'unknown']),
  priceAssessment: z.object({
    status: z.enum(['good_price', 'normal', 'expensive', 'very_expensive', 'unknown']),
    differencePercent: z.number().nullable(),
    recommendation: z.enum(['buy_now', 'wait', 'alternative', 'no_confident_recommendation']),
    freshness: z.enum(['current', 'stale', 'unknown']),
    trend: z.object({ direction: z.enum(['rising', 'falling', 'stable', 'unknown']), changePercent: z.number().nullable(), observationCount: z.number().int().nonnegative() }),
    volatility: z.enum(['low', 'medium', 'high', 'unknown']),
    reasons: z.array(z.string()),
  }).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export const shoppingListSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  mealPlanId: z.string().uuid().nullable(),
  items: z.array(shoppingItemSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  status: z.enum(['open', 'completed']),
});
export const shoppingListsSchema = z.array(shoppingListSchema);