import { ReceiptPhoto, ReceiptScanResult } from '@/types/receipt-scan';
import { getCurrentISOString } from '@/utils/date';
import { generateUUID } from '@/utils/id';
import { ReceiptScanProvider } from './receipt-scan.provider';

/** Fixture OCR provider for validating the receipt review workflow. */
export class MockReceiptScanProvider implements ReceiptScanProvider {
  async analyze(photos: ReceiptPhoto[]): Promise<ReceiptScanResult> {
    const receiptId = generateUUID();
    const firstPhoto = photos[0];
    const lines = [
      {
        id: generateUUID(),
        receiptId,
        rawDescription: 'WHOLE MILK 2L',
        normalizedName: 'Whole Milk',
        category: 'dairy' as const,
        quantity: 1,
        unit: 'l' as const,
        unitPrice: 2.5,
        lineTotal: 2.5,
        confidence: 0.91,
        reviewStatus: 'pending' as const,
        inventoryAction: 'create' as const,
      },
      {
        id: generateUUID(),
        receiptId,
        rawDescription: 'APPLES 6PK',
        normalizedName: 'Apples',
        category: 'fruit' as const,
        quantity: 6,
        unit: 'unit' as const,
        unitPrice: 0.45,
        lineTotal: 2.7,
        confidence: 0.78,
        reviewStatus: 'pending' as const,
        inventoryAction: 'create' as const,
      },
    ];

    return {
      receipt: {
        id: receiptId,
        merchantName: 'Mock Market',
        purchaseDate: getCurrentISOString(),
        currency: 'GBP',
        subtotal: 5.2,
        tax: 0,
        total: 5.2,
        confidence: firstPhoto ? 0.86 : 0,
        reconciliationStatus: 'matched',
      },
      lines,
    };
  }
}
