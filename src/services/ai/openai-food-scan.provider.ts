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
  console.log('[food-scan] image fetch started', { photoId: photo.id, uriScheme: photo.uri.split(':')[0] });
  const response = await fetch(photo.uri);
  console.log('[food-scan] image fetch completed', { photoId: photo.id, ok: response.ok, status: response.status });
  if (!response.ok) throw new Error(`Unable to read image ${photo.id}.`);
  const blob = await response.blob();
  console.log('[food-scan] image blob loaded', { photoId: photo.id, type: blob.type, size: blob.size });

  if (typeof blob.arrayBuffer === 'function' && typeof btoa === 'function') {
    console.log('[food-scan] image encoding started with arrayBuffer', { photoId: photo.id });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    console.log('[food-scan] image arrayBuffer completed', { photoId: photo.id, byteLength: bytes.length });
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    const dataUrl = `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
    console.log('[food-scan] image encoding completed', { photoId: photo.id, dataUrlLength: dataUrl.length });
    return dataUrl;
  }

  console.log('[food-scan] image encoding started with FileReader', { photoId: photo.id });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error(`Unable to encode image ${photo.id}.`));
    };
    reader.onloadend = () => {
      console.log('[food-scan] FileReader loadend', { photoId: photo.id, resultType: typeof reader.result });
      if (settled) return;
      if (typeof reader.result !== 'string') {
        fail();
        return;
      }
      settled = true;
      resolve(reader.result);
    };
    reader.onerror = () => {
      console.error('[food-scan] FileReader error', { photoId: photo.id });
      fail();
    };
    reader.onabort = () => {
      console.error('[food-scan] FileReader aborted', { photoId: photo.id });
      fail();
    };
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
    console.log('[food-scan] provider analyze entered', { photoCount: photos.length, location });
    const encodedPhotos: EncodedPhoto[] = await Promise.all(
      photos.map(async (photo) => {
        console.log('[food-scan] encoding photo started', { photoId: photo.id });
        const dataUrl = await this.loadImage(photo);
        console.log('[food-scan] encoding photo resolved', { photoId: photo.id, dataUrlLength: dataUrl.length });
        return { photoId: photo.id, dataUrl, width: photo.width, height: photo.height };
      })
    );
    console.log('[food-scan] all photos encoded', { photoCount: encodedPhotos.length });
    console.log('[food-scan] calling AI provider', { capability: 'food_scan' });
    const response = await this.aiProvider.request({
      capability: 'food_scan',
      input: {
        location,
        photos: encodedPhotos,
        instructions: 'Identify only clearly visible food items. Leave quantity and unit null when they cannot be inferred reliably.',
      },
    });
    console.log('[food-scan] AI provider response received', { model: response.model });
    const output = parseFoodScanAiOutput(response.output);
    console.log('[food-scan] AI output validated', { candidateCount: output.candidates.length });
    const photoIds = new Set(photos.map((photo) => photo.id));
    return deduplicateCandidates(output.candidates
      .filter((candidate) => photoIds.has(candidate.photoId))
      .map((candidate) => toFoodScanCandidate(candidate, location, generateUUID())));
  }
}