import { inventoryCategorySchema } from '@/services/inventory/inventory.schemas';
import { ReceiptScanResult } from '@/types/receipt-scan';
import { generateUUID } from '@/utils/id';
import { z } from 'zod';
import { parseLenientArray } from './lenient-array.schema';

const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit', 'package']);
// The app's real category taxonomy is the source of truth; keep this schema in sync with it.
const categorySchema = inventoryCategorySchema;

// The model sometimes returns a container/serving noun instead of a measurement unit; map those to the accepted enum.
const UNIT_ALIASES: Record<string, z.infer<typeof unitSchema>> = {
  tub: 'package',
  jar: 'package',
  bag: 'package',
  box: 'package',
  carton: 'package',
  bottle: 'package',
  can: 'package',
  tin: 'package',
  pack: 'package',
  packet: 'package',
  container: 'package',
  piece: 'unit',
  pieces: 'unit',
  item: 'unit',
  items: 'unit',
  each: 'unit',
  bunch: 'unit',
  slice: 'unit',
  slices: 'unit',
  head: 'unit',
  clove: 'unit',
  cloves: 'unit',
};

const flexibleUnitSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  const aliased = UNIT_ALIASES[key] ?? value;
  if (unitSchema.safeParse(aliased).success) return aliased;
  console.warn('[receipt-scan] unrecognized unit from AI output, falling back to null', { received: value });
  return null;
}, unitSchema.nullable());

// The model sometimes returns singular, synonym, or generic category names; map those to the accepted enum.
const CATEGORY_ALIASES: Record<string, z.infer<typeof categorySchema>> = {
  beverage: 'drinks',
  beverages: 'drinks',
  drink: 'drinks',
  condiment: 'sauces_condiments',
  condiments: 'sauces_condiments',
  sauce: 'sauces_condiments',
  sauces: 'sauces_condiments',
  seasoning: 'herbs_spices',
  seasonings: 'herbs_spices',
  spice: 'herbs_spices',
  spices: 'herbs_spices',
  herb: 'herbs_spices',
  herbs: 'herbs_spices',
  cereal: 'grains_cereals',
  cereals: 'grains_cereals',
  grain: 'grains_cereals',
  grains: 'grains_cereals',
  pasta: 'grains_cereals',
  bread: 'bakery',
  baked: 'bakery',
  baking: 'bakery',
  canned: 'tinned_jarred',
  tinned: 'tinned_jarred',
  jarred: 'tinned_jarred',
  vegetable: 'vegetables',
  fruits: 'fruit',
  meats: 'meat',
  fish: 'fish_seafood',
  seafood: 'fish_seafood',
  egg: 'eggs',
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

const receiptMetadataSchema = z.object({
  merchantName: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  currency: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});

const receiptLineSchema = z.object({
  rawDescription: z.string().min(1),
  normalizedName: z.string().min(1),
  category: flexibleCategorySchema,
  quantity: z.number().positive().nullable(),
  unit: flexibleUnitSchema,
  unitPrice: z.number().nullable(),
  lineTotal: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});

const receiptOutputSchema = z.object({
  receipt: receiptMetadataSchema,
  lines: z.array(receiptLineSchema),
});

export function parseReceiptScanAiOutput(value: unknown): z.infer<typeof receiptOutputSchema> {
  const container = value && typeof value === 'object' ? (value as { receipt?: unknown; lines?: unknown }) : {};
  const receipt = receiptMetadataSchema.parse(container.receipt);
  const lines = parseLenientArray(receiptLineSchema, container.lines, 'receipt-scan');
  if (Array.isArray(container.lines) && container.lines.length > 0 && lines.length === 0) {
    throw new Error('Receipt scan AI output failed validation.');
  }
  return { receipt, lines };
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