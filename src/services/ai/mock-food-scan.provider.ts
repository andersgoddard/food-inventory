import { FoodScanCandidate, ScanPhoto } from '@/types/food-scan';
import { InventoryLocation } from '@/types/inventory';
import { generateUUID } from '@/utils/id';
import { FoodScanProvider } from './food-scan.provider';

/** Fixture provider for the review workflow until a secure vision backend is selected. */
export class MockFoodScanProvider implements FoodScanProvider {
  async analyze(
    photos: ScanPhoto[],
    location: InventoryLocation
  ): Promise<FoodScanCandidate[]> {
    return photos.map((photo, index) => ({
      id: generateUUID(),
      photoId: photo.id,
      name: `Scanned food ${index + 1}`,
      category: 'other',
      location,
      quantity: 1,
      unit: 'unit',
      confidence: 0.62,
      source: 'mock-vision',
      reviewStatus: 'pending',
    }));
  }
}
