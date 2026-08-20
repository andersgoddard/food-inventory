import { ReceiptScanResult } from '@/types/receipt-scan';
import { generateUUID } from '@/utils/id';
import { z } from 'zod';

const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit', 'package']);
const categorySchema = z.enum(['dairy', 'meat', 'fish', 'fruit', 'vegetables', 'grains', 'canned', 'frozen', 'snacks', 'beverages', 'condiments', 'other']);
const flexibleUnitSchema = z.preprocess((value) => typeof value === 'string' && unitSchema.safeParse(value).success ? value : null, unitSchema.nullable());
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
    category: categorySchema.nullable(),
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