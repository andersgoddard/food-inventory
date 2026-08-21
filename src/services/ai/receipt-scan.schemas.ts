import { ReceiptScanResult } from '@/types/receipt-scan';
import { generateUUID } from '@/utils/id';
import { z } from 'zod';

const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit', 'package']);
const categorySchema = z.enum(['dairy', 'meat', 'fish', 'fruit', 'vegetables', 'grains', 'canned', 'frozen', 'snacks', 'beverages', 'condiments', 'other']);
const flexibleUnitSchema = z.preprocess((value) => typeof value === 'string' && unitSchema.safeParse(value).success ? value : null, unitSchema.nullable());

// The model sometimes returns singular or synonym category names; map those to the accepted enum.
const CATEGORY_ALIASES: Record<string, z.infer<typeof categorySchema>> = {
  beverage: 'beverages',
  drink: 'beverages',
  drinks: 'beverages',
  condiment: 'condiments',
  sauce: 'condiments',
  sauces: 'condiments',
  seasoning: 'condiments',
  seasonings: 'condiments',
  spice: 'condiments',
  spices: 'condiments',
  cereal: 'grains',
  cereals: 'grains',
  grain: 'grains',
  pasta: 'grains',
  bread: 'grains',
  vegetable: 'vegetables',
  fruits: 'fruit',
  meats: 'meat',
  seafood: 'fish',
  snack: 'snacks',
};

const flexibleCategorySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  const normalized = CATEGORY_ALIASES[key] ?? value;
  if (categorySchema.safeParse(normalized).success) return normalized;
  // Unrecognized category: record the raw value so we can decide whether it needs an
  // alias or a new category later, then fall back to null rather than failing the line.
  console.warn('[receipt-scan] unrecognized category from AI output, falling back to null', { received: value });
  return null;
}, categorySchema.nullable());

const receiptOutputSchema = z.object({
  receipt: z.object({
    merchantName: z.string().nullable(),
    purchaseDate: z.string().nullable(),
    currency: z.string().nullable(),
    subtotal: z.number().nullable(),
    tax: z.number().nullable(),
    total: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  lines: z.array(z.object({
    rawDescription: z.string().min(1),
    normalizedName: z.string().min(1),
    category: flexibleCategorySchema,
    quantity: z.number().positive().nullable(),
    unit: flexibleUnitSchema,
    unitPrice: z.number().nullable(),
    lineTotal: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  })),
});

export function parseReceiptScanAiOutput(value: unknown): z.infer<typeof receiptOutputSchema> {
  return receiptOutputSchema.parse(value);
}

export function toReceiptScanResult(value: z.infer<typeof receiptOutputSchema>): ReceiptScanResult {
  const receiptId = generateUUID();
  return {
    receipt: { id: receiptId, ...value.receipt, reconciliationStatus: 'unknown' },
    lines: value.lines.map((line) => ({
      id: generateUUID(),
      receiptId,
      ...line,
      reviewStatus: 'pending',
      inventoryAction: 'create',
    })),
  } as ReceiptScanResult;
}