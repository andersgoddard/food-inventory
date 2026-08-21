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

export function imageMimeType(photo: ScanPhoto, blobType?: string): string {
  if (blobType && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(blobType)) return blobType;
  const source = `${photo.fileName || ''} ${photo.uri}`.toLowerCase();
  if (source.includes('.png')) return 'image/png';
  if (source.includes('.gif')) return 'image/gif';
  if (source.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export function normalizeImageDataUrl(dataUrl: string, photo: ScanPhoto, blobType?: string): string {
  const separator = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || separator < 0) {
    throw new Error(`Unable to encode image ${photo.id} as a data URL.`);
  }

  const payload = dataUrl.slice(separator + 1);
  if (!payload) throw new Error(`Unable to encode image ${photo.id}.`);

  const isBase64 = dataUrl.slice(5, separator).toLowerCase().includes(';base64');
  if (!isBase64 && !/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) {
    throw new Error(`Unable to encode image ${photo.id} as base64.`);
  }

  return `data:${imageMimeType(photo, blobType)};base64,${payload}`;
}

async function encodeBrowserImage(blob: Blob, photoId: string): Promise<string> {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Image === 'undefined') {
    throw new Error(`Unable to encode image ${photoId}.`);
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    if (!canvas.width || !canvas.height) throw new Error(`Unable to encode image ${photoId}.`);

    const context = canvas.getContext('2d');
    if (!context) throw new Error(`Unable to encode image ${photoId}.`);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.86);
  } catch {
    throw new Error(`Unable to decode image ${photoId}.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function loadImageAsDataUrl(photo: ScanPhoto): Promise<string> {
  console.log('[food-scan] image fetch started', { photoId: photo.id, uriScheme: photo.uri.split(':')[0] });
  const response = await fetch(photo.uri);
  console.log('[food-scan] image fetch completed', { photoId: photo.id, ok: response.ok, status: response.status });
  if (!response.ok) throw new Error(`Unable to read image ${photo.id}.`);
  const blob = await response.blob();
  console.log('[food-scan] image blob loaded', { photoId: photo.id, type: blob.type, size: blob.size });

  if (typeof document !== 'undefined') {
    console.log('[food-scan] image encoding started with browser canvas', { photoId: photo.id });
    const dataUrl = await encodeBrowserImage(blob, photo.id);
    console.log('[food-scan] image encoding completed', { photoId: photo.id, dataUrlLength: dataUrl.length, format: 'image/jpeg' });
    return dataUrl;
  }

  if (typeof blob.arrayBuffer === 'function' && typeof btoa === 'function') {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:${imageMimeType(photo, blob.type)};base64,${btoa(binary)}`;
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
      resolve(normalizeImageDataUrl(reader.result, photo, blob.type));
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
        const dataUrl = normalizeImageDataUrl(await this.loadImage(photo), photo);
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
      .map((candidate) => photos.length === 1 && !photoIds.has(candidate.photoId)
        ? { ...candidate, photoId: photos[0].id }
        : candidate)
      .filter((candidate) => photoIds.has(candidate.photoId))
      .map((candidate) => toFoodScanCandidate(candidate, location, generateUUID())));
  }
}