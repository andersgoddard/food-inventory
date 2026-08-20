import { AiProvider } from './ai-capability';
import { OpenAiReceiptScanProvider } from './openai-receipt-scan.provider';

describe('OpenAiReceiptScanProvider', () => {
  it('uses receipt_scan and returns reviewable receipt lines', async () => {
    const request = jest.fn().mockResolvedValue({
      capability: 'receipt_scan',
      model: 'gpt-5.4-mini',
      output: {
        receipt: { merchantName: 'Market', purchaseDate: '2026-08-20', currency: 'GBP', subtotal: 2.5, tax: 0, total: 2.5, confidence: 0.9 },
        lines: [{ rawDescription: 'MILK 2L', normalizedName: 'Milk', category: 'dairy', quantity: 2, unit: 'l', unitPrice: 1.25, lineTotal: 2.5, confidence: 0.88 }],
      },
    });
    const provider: AiProvider = { request };
    const scan = new OpenAiReceiptScanProvider({ aiProvider: provider, loadImage: async () => 'data:image/jpeg;base64,test' });

    const result = await scan.analyze([{ id: 'photo-1', uri: 'file:///receipt.jpg', width: 100, height: 100 }]);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({ capability: 'receipt_scan' }));
    expect(result.receipt.merchantName).toBe('Market');
    expect(result.lines[0]).toMatchObject({ normalizedName: 'Milk', unit: 'l', reviewStatus: 'pending', inventoryAction: 'create' });
  });
});