import { MockFoodScanProvider } from './mock-food-scan.provider';

describe('MockFoodScanProvider', () => {
  it('creates reviewable candidates for each selected photo', async () => {
    const provider = new MockFoodScanProvider();
    const candidates = await provider.analyze(
      [
        { id: 'photo-1', uri: 'file:///one.jpg', width: 100, height: 100 },
        { id: 'photo-2', uri: 'file:///two.jpg', width: 100, height: 100 },
      ],
      'freezer'
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      photoId: 'photo-1',
      location: 'freezer',
      reviewStatus: 'pending',
      source: 'mock-vision',
    });
    expect(candidates[1].id).not.toBe(candidates[0].id);
  });
});
