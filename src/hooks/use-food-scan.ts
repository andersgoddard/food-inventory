import { inventoryService } from '@/services';
import { FoodScanProvider } from '@/services/ai/food-scan.provider';
import { OpenAiFoodScanProvider } from '@/services/ai/openai-food-scan.provider';
import { FoodScanCandidate, FoodScanStatus, ScanPhoto } from '@/types/food-scan';
import { CreateInventoryItemInput, InventoryLocation } from '@/types/inventory';
import { getCurrentISOString } from '@/utils/date';
import { useCallback, useState } from 'react';

const provider: FoodScanProvider = new OpenAiFoodScanProvider();

export function useFoodScan() {
  const [location, setLocation] = useState<InventoryLocation>('fridge');
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [candidates, setCandidates] = useState<FoodScanCandidate[]>([]);
  const [status, setStatus] = useState<FoodScanStatus>('draft');
  const [error, setError] = useState<string | null>(null);

  const addPhotos = useCallback((newPhotos: ScanPhoto[]) => {
    setPhotos((current) => [...current, ...newPhotos].slice(0, 6));
    setStatus('draft');
    setError(null);
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setCandidates((current) => current.filter((candidate) => candidate.photoId !== photoId));
  }, []);

  const analyze = useCallback(async () => {
    if (photos.length === 0) {
      setError('Add at least one food photo first.');
      return;
    }

    try {
      setStatus('analysing');
      setError(null);
      const results = await provider.analyze(photos, location);
      setCandidates(results);
      setStatus('review');
    } catch (scanError) {
      setStatus('failed');
      setError(scanError instanceof Error ? scanError.message : 'Food scan failed');
    }
  }, [location, photos]);

  const updateCandidate = useCallback(
    (id: string, update: Partial<FoodScanCandidate>) => {
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === id
            ? { ...candidate, ...update, reviewStatus: 'edited' }
            : candidate
        )
      );
    },
    []
  );

  const toggleCandidate = useCallback((id: string) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              reviewStatus: candidate.reviewStatus === 'rejected' ? 'pending' : 'rejected',
            }
          : candidate
      )
    );
  }, []);

  const confirm = useCallback(async () => {
    const accepted = candidates.filter((candidate) => candidate.reviewStatus !== 'rejected');
    const incomplete = accepted.find(
      (candidate) => !candidate.name.trim() || !candidate.quantity || !candidate.unit
    );

    if (incomplete) {
      setError(`Complete the quantity and unit for ${incomplete.name || 'each accepted item'}.`);
      return false;
    }

    try {
      setStatus('confirming');
      setError(null);
      const purchaseDate = getCurrentISOString();
      for (const candidate of accepted) {
        const input: CreateInventoryItemInput = {
          name: candidate.name.trim(),
          category: candidate.category,
          location: candidate.location,
          quantity: candidate.quantity as number,
          unit: candidate.unit as NonNullable<typeof candidate.unit>,
          purchaseDate,
          expiryDate: null,
          purchasePrice: null,
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
          : 'Unable to add scanned items'
      );
      return false;
    }
  }, [candidates]);

  return {
    location,
    photos,
    candidates,
    status,
    error,
    setLocation,
    addPhotos,
    removePhoto,
    analyze,
    updateCandidate,
    toggleCandidate,
    confirm,
  };
}
