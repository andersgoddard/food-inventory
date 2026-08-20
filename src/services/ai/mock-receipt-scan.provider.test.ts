import { MockReceiptScanProvider } from './mock-receipt-scan.provider';

describe('MockReceiptScanProvider', () => {
  it('returns reviewable receipt metadata and line candidates', async () => {
    const provider = new MockReceiptScanProvider();
    const result = await provider.analyze([
      { id: 'receipt-page-1', uri: 'file:///receipt.jpg', width: 800, height: 1200 },
    ]);

    expect(result.receipt).toMatchObject({
      merchantName: 'Mock Market',
      currency: 'GBP',
      total: 5.2,
      reconciliationStatus: 'matched',
    });
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      normalizedName: 'Whole Milk',
      reviewStatus: 'pending',
      inventoryAction: 'create',
    });
    expect(result.lines[1].confidence).toBeGreaterThan(0);
  });
});
