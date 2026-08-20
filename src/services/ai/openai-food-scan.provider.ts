import { AI_GATEWAY_TOKEN, AI_GATEWAY_URL } from '@/constants/ai';
import { FoodScanCandidate, ScanPhoto } from '@/types/food-scan';
import { InventoryLocation } from '@/types/inventory';
import { generateUUID } from '@/utils/id';
import { AiProvider } from './ai-capability';
import { FoodScanProvider } from './food-scan.provider';
import { parseFoodScanAiOutput, toFoodScanCandidate } from './food-scan.schemas';
import { GatewayAiProvider } from './gateway-ai.provider';

interface EncodedPhoto {
  photoId: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface OpenAiFoodScanProviderOptions {
  aiProvider?: AiProvider;
  loadImage?: (photo: ScanPhoto) => Promise<string>;
}

async function loadImageAsDataUrl(photo: ScanPhoto): Promise<string> {
  const response = await fetch(photo.uri);
  if (!response.ok) throw new Error(`Unable to read image ${photo.id}.`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') reject(new Error(`Unable to encode image ${photo.id}.`));
      else resolve(reader.result);
    };
    reader.onerror = () => reject(new Error(`Unable to encode image ${photo.id}.`));
    reader.readAsDataURL(blob);
  });
}

function deduplicateCandidates(candidates: FoodScanCandidate[]): FoodScanCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class OpenAiFoodScanProvider implements FoodScanProvider {
  private readonly aiProvider: AiProvider;
  private readonly loadImage: (photo: ScanPhoto) => Promise<string>;

  constructor(options: OpenAiFoodScanProviderOptions = {}) {
    this.aiProvider = options.aiProvider || new GatewayAiProvider({ baseUrl: AI_GATEWAY_URL, token: AI_GATEWAY_TOKEN });
    this.loadImage = options.loadImage || loadImageAsDataUrl;
  }

  async analyze(photos: ScanPhoto[], location: InventoryLocation): Promise<FoodScanCandidate[]> {
    const encodedPhotos: EncodedPhoto[] = await Promise.all(
      photos.map(async (photo) => ({
        photoId: photo.id,
        dataUrl: await this.loadImage(photo),
        width: photo.width,
        height: photo.height,
      }))
    );
    const response = await this.aiProvider.request({
      capability: 'food_scan',
      input: {
        location,
        photos: encodedPhotos,
        instructions: 'Identify only clearly visible food items. Leave quantity and unit null when they cannot be inferred reliably.',
      },
    });
    const output = parseFoodScanAiOutput(response.output);
    const photoIds = new Set(photos.map((photo) => photo.id));
    return deduplicateCandidates(output.candidates
      .filter((candidate) => photoIds.has(candidate.photoId))
      .map((candidate) => toFoodScanCandidate(candidate, location, generateUUID())));
  }
}