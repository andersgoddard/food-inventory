import {
    InventoryCategory,
    InventoryLocation,
    InventoryUnit,
} from './inventory';

export interface ScanPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
}

export type FoodScanStatus =
  | 'draft'
  | 'analysing'
  | 'review'
  | 'confirming'
  | 'completed'
  | 'failed';

export interface FoodScanCandidate {
  id: string;
  photoId: string;
  name: string;
  category: InventoryCategory;
  location: InventoryLocation;
  quantity: number | null;
  unit: InventoryUnit | null;
  confidence: number;
  source: 'mock-vision' | 'openai-vision';
  reviewStatus: 'pending' | 'accepted' | 'edited' | 'rejected';
}
