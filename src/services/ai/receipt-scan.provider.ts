import { ReceiptPhoto, ReceiptScanResult } from '@/types/receipt-scan';

export interface ReceiptScanProvider {
  analyze(photos: ReceiptPhoto[]): Promise<ReceiptScanResult>;
}
