import { AI_GATEWAY_TOKEN, AI_GATEWAY_URL } from '@/constants/ai';
import { ReceiptPhoto, ReceiptScanResult } from '@/types/receipt-scan';
import { AiProvider } from './ai-capability';
import { GatewayAiProvider } from './gateway-ai.provider';
import { loadImageAsDataUrl } from './openai-food-scan.provider';
import { ReceiptScanProvider } from './receipt-scan.provider';
import { parseReceiptScanAiOutput, toReceiptScanResult } from './receipt-scan.schemas';

export interface OpenAiReceiptScanProviderOptions { aiProvider?: AiProvider; loadImage?: (photo: ReceiptPhoto) => Promise<string>; }

export class OpenAiReceiptScanProvider implements ReceiptScanProvider {
  private readonly aiProvider: AiProvider;
  private readonly loadImage: (photo: ReceiptPhoto) => Promise<string>;

  constructor(options: OpenAiReceiptScanProviderOptions = {}) {
    this.aiProvider = options.aiProvider || new GatewayAiProvider({ baseUrl: AI_GATEWAY_URL, token: AI_GATEWAY_TOKEN });
    this.loadImage = options.loadImage || loadImageAsDataUrl;
  }

  async analyze(photos: ReceiptPhoto[]): Promise<ReceiptScanResult> {
    const encodedPhotos = await Promise.all(photos.map(async (photo) => ({
      photoId: photo.id,
      dataUrl: await this.loadImage(photo),
      width: photo.width,
      height: photo.height,
    })));
    const response = await this.aiProvider.request({
      capability: 'receipt_scan',
      input: { photos: encodedPhotos, instructions: 'Read the receipt conservatively. Do not invent unreadable items, totals, prices, or dates.' },
    });
    return toReceiptScanResult(parseReceiptScanAiOutput(response.output));
  }
}