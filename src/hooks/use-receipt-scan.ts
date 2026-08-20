import { inventoryService } from '@/services';
import { MockReceiptScanProvider } from '@/services/ai/mock-receipt-scan.provider';
import { ReceiptScanProvider } from '@/services/ai/receipt-scan.provider';
import { CreateInventoryItemInput, InventoryLocation } from '@/types/inventory';
import {
    ReceiptLineCandidate,
    ReceiptPhoto,
    ReceiptScanResult,
    ReceiptScanStatus,
} from '@/types/receipt-scan';
import { getCurrentISOString } from '@/utils/date';
import { useCallback, useState } from 'react';

const provider: ReceiptScanProvider = new MockReceiptScanProvider();

export function useReceiptScan() {
  const [photos, setPhotos] = useState<ReceiptPhoto[]>([]);
  const [location, setLocation] = useState<InventoryLocation>('cupboard');
  const [receipt, setReceipt] = useState<ReceiptScanResult['receipt'] | null>(null);
  const [lines, setLines] = useState<ReceiptLineCandidate[]>([]);
  const [status, setStatus] = useState<ReceiptScanStatus>('draft');
  const [error, setError] = useState<string | null>(null);

  const addPhotos = useCallback((newPhotos: ReceiptPhoto[]) => {
    setPhotos((current) => [...current, ...newPhotos].slice(0, 4));
    setStatus('draft');
    setError(null);
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }, []);

  const analyze = useCallback(async () => {
    if (photos.length === 0) {
      setError('Add at least one receipt photo first.');
      return;
    }

    try {
      setStatus('extracting');
      setError(null);
      const result = await provider.analyze(photos);
      setReceipt(result.receipt);
      setLines(result.lines);
      setStatus('review');
    } catch (scanError) {
      setStatus('failed');
      setError(scanError instanceof Error ? scanError.message : 'Receipt scan failed');
    }
  }, [photos]);

  const updateReceipt = useCallback(
    (update: Partial<NonNullable<ReceiptScanResult['receipt']>>) => {
      setReceipt((current) => (current ? { ...current, ...update } : current));
    },
    []
  );

  const updateLine = useCallback((id: string, update: Partial<ReceiptLineCandidate>) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, ...update, reviewStatus: 'edited' } : line
      )
    );
  }, []);

  const toggleLine = useCallback((id: string) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              reviewStatus: line.reviewStatus === 'rejected' ? 'pending' : 'rejected',
              inventoryAction: line.reviewStatus === 'rejected' ? 'create' : 'skip',
            }
          : line
      )
    );
  }, []);

  const confirm = useCallback(async () => {
    if (!receipt) return false;

    const accepted = lines.filter(
      (line) => line.reviewStatus !== 'rejected' && line.inventoryAction === 'create'
    );
    const incomplete = accepted.find(
      (line) => !line.normalizedName.trim() || !line.quantity || !line.unit
    );

    if (incomplete) {
      setError(`Complete the quantity and unit for ${incomplete.normalizedName || 'each line'}.`);
      return false;
    }

    try {
      setStatus('confirming');
      setError(null);
      const purchaseDate = receipt.purchaseDate || getCurrentISOString();
      for (const line of accepted) {
        const input: CreateInventoryItemInput = {
          name: line.normalizedName.trim(),
          category: line.category || 'other',
          location,
          quantity: line.quantity as number,
          unit: line.unit as NonNullable<typeof line.unit>,
          purchaseDate,
          expiryDate: null,
          purchasePrice: line.lineTotal,
        };
        await inventoryService.addItem(input);
      }
      setStatus('completed');
      return true;
    } catch (confirmationError) {
      setStatus('failed');
      setError(
        confirmationError instanceof Error
          ? confirmationError.message
          : 'Unable to add receipt items'
      );
      return false;
    }
  }, [lines, location, receipt]);

  return {
    photos,
    location,
    receipt,
    lines,
    status,
    error,
    addPhotos,
    setLocation,
    removePhoto,
    analyze,
    updateReceipt,
    updateLine,
    toggleLine,
    confirm,
  };
}
