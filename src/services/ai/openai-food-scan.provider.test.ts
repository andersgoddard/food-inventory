import { AiProvider } from './ai-capability';
import { OpenAiFoodScanProvider } from './openai-food-scan.provider';

const photos = [
  { id: 'photo-1', uri: 'file:///one.jpg', width: 100, height: 100 },
  { id: 'photo-2', uri: 'file:///two.jpg', width: 100, height: 100 },
];

describe('OpenAiFoodScanProvider', () => {
  it('loads images, validates candidates, and leaves review pending', async () => {
    const request = jest.fn().mockResolvedValue({
      capability: 'food_scan',
      model: 'gpt-5.4-mini',
      output: {
        candidates: [
          { photoId: 'photo-1', name: 'Milk', category: 'dairy', quantity: null, unit: null, confidence: 0.88 },
          { photoId: 'photo-1', name: 'Milk', category: 'dairy', quantity: null, unit: null, confidence: 0.86 },
          { photoId: 'photo-2', name: 'Apples', category: 'fruit', quantity: 4, unit: 'unit', confidence: 0.8 },
        ],
      },
    });
    const provider: AiProvider = { request };
    const scan = new OpenAiFoodScanProvider({
      aiProvider: provider,
      loadImage: async (photo) => `data:image/jpeg;base64,${photo.id}`,
    });

    const candidates = await scan.analyze(photos, 'fridge');

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      photoId: 'photo-1',
      name: 'Milk',
      location: 'fridge',
      quantity: null,
      unit: null,
      source: 'openai-vision',
      reviewStatus: 'pending',
    });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'food_scan',
      input: expect.objectContaining({
        photos: [
          expect.objectContaining({ photoId: 'photo-1', dataUrl: expect.stringContaining('photo-1') }),
          expect.objectContaining({ photoId: 'photo-2', dataUrl: expect.stringContaining('photo-2') }),
        ],
      }),
    }));
  });

  it('rejects unsafe AI output before candidates reach the review flow', async () => {
    const provider: AiProvider = {
      request: jest.fn().mockResolvedValue({
        capability: 'food_scan',
        model: 'gpt-5.4-mini',
        output: { candidates: [{ photoId: 'photo-1', name: '', category: 'other', quantity: 1, unit: 'unit', confidence: 2 }] },
      }),
    };
    const scan = new OpenAiFoodScanProvider({ aiProvider: provider, loadImage: async () => 'data:image/jpeg;base64,test' });

    await expect(scan.analyze([photos[0]], 'fridge')).rejects.toThrow();
  });
});