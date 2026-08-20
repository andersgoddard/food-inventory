import { ScanPhoto } from './food-scan';
import { InventoryCategory, InventoryUnit } from './inventory';

export interface ReceiptCandidate {
  id: string;
  merchantName: string | null;
  purchaseDate: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  confidence: number;
  reconciliationStatus: 'unknown' | 'matched' | 'mismatch';
}

export interface ReceiptLineCandidate {
  id: string;
  receiptId: string;
  rawDescription: string;
  normalizedName: string;
  category: InventoryCategory | null;
  quantity: number | null;
  unit: InventoryUnit | null;
  unitPrice: number | null;
  lineTotal: number | null;
  confidence: number;
  reviewStatus: 'pending' | 'edited' | 'rejected';
  inventoryAction: 'create' | 'skip';
}

export interface ReceiptScanResult {
  receipt: ReceiptCandidate;
  lines: ReceiptLineCandidate[];
}

export type ReceiptScanStatus =
  | 'draft'
  | 'extracting'
  | 'review'
  | 'confirming'
  | 'completed'
  | 'failed';

export type ReceiptPhoto = ScanPhoto;
