import { FoodScanCandidate, ScanPhoto } from '@/types/food-scan';
import { InventoryLocation } from '@/types/inventory';

export interface FoodScanProvider {
  analyze(
    photos: ScanPhoto[],
    location: InventoryLocation
  ): Promise<FoodScanCandidate[]>;
}
