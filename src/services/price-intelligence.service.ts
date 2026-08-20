import { PRICE_EXPENSIVE_THRESHOLD, PRICE_GOOD_THRESHOLD, PRICE_VERY_EXPENSIVE_THRESHOLD } from '@/constants/shopping';
import { InventoryUnit } from '@/types/inventory';
import { PriceAssessment, PriceObservation, PriceRecommendation, PriceStatus, PriceTrend, PriceVolatility, ShoppingItem } from '@/types/shopping';
import { getCurrentISOString } from '@/utils/date';
import { generateUUID } from '@/utils/id';
import { PriceObservationRepository } from './price-observation.repository';

const PRICE_STALE_DAYS = 14;

function toBaseUnit(amount: number, unit: InventoryUnit | null): { amount: number; unit: 'g' | 'ml' | 'unit' } | null {
  if (!unit) return null;
  if (unit === 'kg') return { amount: amount * 1000, unit: 'g' };
  if (unit === 'g') return { amount, unit: 'g' };
  if (unit === 'l') return { amount: amount * 1000, unit: 'ml' };
  if (unit === 'ml') return { amount, unit: 'ml' };
  if (unit === 'unit') return { amount, unit: 'unit' };
  return null;
}

function pricePerUnit(amount: number, quantity: number | null, unit: InventoryUnit | null): number | null {
  if (quantity && unit) {
    const normalized = toBaseUnit(quantity, unit);
    return normalized ? amount / normalized.amount : null;
  }
  return unit === 'g' || unit === 'ml' || unit === 'unit' ? amount : null;
}

function classify(differencePercent: number | null): PriceStatus {
  if (differencePercent === null) return 'unknown';
  if (differencePercent <= PRICE_GOOD_THRESHOLD) return 'good_price';
  if (differencePercent > PRICE_VERY_EXPENSIVE_THRESHOLD) return 'very_expensive';
  if (differencePercent > PRICE_EXPENSIVE_THRESHOLD) return 'expensive';
  return 'normal';
}

function trend(observations: PriceObservation[]): PriceTrend {
  const values = observations
    .map((item) => ({ date: Date.parse(item.observedAt), price: item.pricePerBaseUnit ?? pricePerUnit(item.amount, item.quantity, item.unit) }))
    .filter((item): item is { date: number; price: number } => Number.isFinite(item.date) && item.price !== null)
    .sort((left, right) => left.date - right.date);
  if (values.length < 2) return { direction: 'unknown', changePercent: null, observationCount: values.length };
  const first = values[0].price;
  const last = values[values.length - 1].price;
  if (first === 0) return { direction: 'unknown', changePercent: null, observationCount: values.length };
  const changePercent = ((last - first) / first) * 100;
  return {
    direction: changePercent > 2 ? 'rising' : changePercent < -2 ? 'falling' : 'stable',
    changePercent,
    observationCount: values.length,
  };
}

function volatility(observations: PriceObservation[]): PriceVolatility {
  const prices = observations.map((item) => item.pricePerBaseUnit ?? pricePerUnit(item.amount, item.quantity, item.unit)).filter((price): price is number => price !== null);
  if (prices.length < 3) return 'unknown';
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  if (mean === 0) return 'unknown';
  const deviation = Math.sqrt(prices.reduce((sum, price) => sum + ((price - mean) ** 2), 0) / prices.length) / mean;
  return deviation > 0.2 ? 'high' : deviation > 0.08 ? 'medium' : 'low';
}

function recommendation(status: PriceStatus, item: ShoppingItem, observations: PriceObservation[]): { value: PriceRecommendation; reason: string } {
  if (status === 'good_price' && item.status === 'needed') return { value: 'buy_now', reason: 'This item is needed and below its reference price.' };
  if ((status === 'expensive' || status === 'very_expensive') && item.status === 'needed') return { value: 'wait', reason: 'This item is needed but currently above its reference price.' };
  if (status === 'good_price' && item.status !== 'needed') return { value: 'buy_now', reason: 'This is below its reference price, but avoid unnecessary stockpiling.' };
  if (status === 'unknown' || observations.length === 0) return { value: 'no_confident_recommendation', reason: 'There is not enough comparable price data.' };
  return { value: 'no_confident_recommendation', reason: 'The current price does not support a confident action.' };
}

export class PriceIntelligenceService {
  constructor(private observationRepository: PriceObservationRepository) {}

  async assessItem(item: ShoppingItem, observedPrice: number, referencePrice: number, unit: InventoryUnit | null = item.unit): Promise<ShoppingItem & { priceAssessment: PriceAssessment }> {
    const product = item.product || {
      id: `product:${item.normalizedName}`,
      normalizedName: item.normalizedName,
      displayName: item.name,
      category: null,
      comparableProductGroupId: null,
    };
    const now = getCurrentISOString();
    const observation: PriceObservation = {
      id: generateUUID(),
      productIdentityId: product.id,
      amount: observedPrice,
      currency: 'GBP',
      quantity: 1,
      unit,
      pricePerBaseUnit: pricePerUnit(observedPrice, 1, unit),
      observedAt: now,
      source: 'manual',
      retailer: null,
      promotion: 'none',
      confidence: 'high',
    };
    await this.observationRepository.saveObservation(observation);
    const history = await this.observationRepository.getObservations(product.id);
    const current = observation.pricePerBaseUnit;
    const reference = pricePerUnit(referencePrice, 1, unit);
    const differencePercent = current === null || reference === null || reference === 0 ? null : ((current - reference) / reference) * 100;
    const status = classify(differencePercent);
    const currentAge = 0;
    const action = recommendation(status, item, history);
    const assessment: PriceAssessment = {
      status,
      differencePercent,
      recommendation: action.value,
      freshness: currentAge <= PRICE_STALE_DAYS ? 'current' : 'stale',
      trend: trend(history),
      volatility: volatility(history),
      reasons: [action.reason, ...(observation.promotion !== 'none' ? ['Promotion is treated as an observation, not the normal price.'] : [])],
    };
    return {
      ...item,
      product,
      parPrice: { productIdentityId: product.id, amount: referencePrice, currency: 'GBP', unit: unit || 'package', source: 'user_defined', effectiveDate: now },
      currentPriceObservation: observation,
      priceStatus: status,
      updatedAt: now,
      priceAssessment: assessment,
    };
  }
}