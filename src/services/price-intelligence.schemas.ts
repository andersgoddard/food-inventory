import { z } from 'zod';
import { inventoryUnitSchema } from './inventory/inventory.schemas';

const isoDateTimeSchema = z.string().datetime({ offset: true });

export const priceObservationSchema = z.object({
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

export const priceObservationsSchema = z.array(priceObservationSchema);