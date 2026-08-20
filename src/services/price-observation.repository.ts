import { PRICE_OBSERVATIONS_STORAGE_KEY } from '@/constants/shopping';
import { PriceObservation } from '@/types/shopping';
import { ZodError } from 'zod';
import { priceObservationsSchema } from './price-intelligence.schemas';
import { StorageAdapter } from './storage/storage-adapter';

export class PriceObservationRepository {
  constructor(private storageAdapter: StorageAdapter) {}

  async getObservations(productIdentityId?: string): Promise<PriceObservation[]> {
    const stored = await this.storageAdapter.get<unknown>(PRICE_OBSERVATIONS_STORAGE_KEY);
    if (!stored) return [];
    try {
      const observations = priceObservationsSchema.parse(stored);
      return productIdentityId ? observations.filter((item) => item.productIdentityId === productIdentityId) : observations;
    } catch (error) {
      if (error instanceof ZodError) return [];
      throw error;
    }
  }

  async saveObservation(observation: PriceObservation): Promise<PriceObservation> {
    const validated = priceObservationsSchema.element.parse(observation);
    const observations = await this.getObservations();
    await this.storageAdapter.set(PRICE_OBSERVATIONS_STORAGE_KEY, [
      ...observations.filter((item) => item.id !== validated.id),
      validated,
    ]);
    return validated;
  }
}