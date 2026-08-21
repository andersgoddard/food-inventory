import { ShoppingItem } from '@/types/shopping';
import { PriceIntelligenceService } from './price-intelligence.service';
import { PriceObservationRepository } from './price-observation.repository';
import { StorageAdapter } from './storage/storage-adapter';

class MemoryAdapter implements StorageAdapter {
  private values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> { return (this.values.get(key) as T | undefined) ?? null; }
  async set<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
  async remove(key: string): Promise<void> { this.values.delete(key); }
  async clear(): Promise<void> { this.values.clear(); }
  async has(key: string): Promise<boolean> { return this.values.has(key); }
}

function item(): ShoppingItem {
  return {
    id: '11111111-1111-4111-8111-111111111111', shoppingListId: '22222222-2222-4222-8222-222222222222',
    product: { id: 'product:olive-oil', normalizedName: 'olive oil', displayName: 'Olive oil', category: null, comparableProductGroupId: 'oil' },
    name: 'Olive oil', normalizedName: 'olive oil', requiredQuantity: 1, availableQuantity: 0, missingQuantity: 1,
    unit: 'l', quantityConfidence: 'exact', source: 'meal_plan', sourceMealPlanMealIds: ['meal-1'], sourceMealTitles: ['Pasta night'],
    hasIncompatibleUnitInventory: false, hasUseSoonInventory: false, priority: 'required', status: 'needed',
    parPrice: null, currentPriceObservation: null, priceStatus: 'unknown', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z',
  };
}

describe('PriceIntelligenceService', () => {
  it('assesses a needed product against its reference price and recommends wait when expensive', async () => {
    const service = new PriceIntelligenceService(new PriceObservationRepository(new MemoryAdapter()));
    const assessed = await service.assessItem(item(), 7.99, 6);

    expect(assessed.priceStatus).toBe('very_expensive');
    expect(assessed.priceAssessment).toMatchObject({
      recommendation: 'wait',
      freshness: 'current',
      trend: { direction: 'unknown' },
      volatility: 'unknown',
    });
    expect(assessed.priceAssessment.differencePercent).toBeCloseTo(33.17, 1);
  });

  it('recommends buy now for a needed good price and preserves promotion metadata', async () => {
    const service = new PriceIntelligenceService(new PriceObservationRepository(new MemoryAdapter()));
    const assessed = await service.assessItem(item(), 4.5, 6);

    expect(assessed.priceStatus).toBe('good_price');
    expect(assessed.priceAssessment.recommendation).toBe('buy_now');
    expect(assessed.currentPriceObservation?.promotion).toBe('none');
    expect(assessed.currentPriceObservation?.confidence).toBe('high');
  });

  it('builds historical trend and volatility from persisted observations', async () => {
    const repository = new PriceObservationRepository(new MemoryAdapter());
    await repository.saveObservation({ id: 'obs-1', productIdentityId: 'product:olive-oil', amount: 5, currency: 'GBP', quantity: 1, unit: 'l', pricePerBaseUnit: 0.005, observedAt: '2026-01-01T00:00:00.000Z', source: 'fixture', retailer: 'Tesco', promotion: 'none' });
    await repository.saveObservation({ id: 'obs-2', productIdentityId: 'product:olive-oil', amount: 9, currency: 'GBP', quantity: 1, unit: 'l', pricePerBaseUnit: 0.009, observedAt: '2026-06-01T00:00:00.000Z', source: 'fixture', retailer: 'Tesco', promotion: 'none' });
    const service = new PriceIntelligenceService(repository);
    const assessed = await service.assessItem(item(), 6, 6);

    expect(assessed.priceAssessment.trend.direction).toBe('rising');
    expect(assessed.priceAssessment.trend.observationCount).toBe(3);
    expect(assessed.priceAssessment.volatility).toBe('high');
  });
});