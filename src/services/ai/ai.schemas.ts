import { z } from 'zod';
import { AiCapability, AiResponse } from './ai-capability';

const capabilitySchema = z.enum(['food_scan', 'recipe_suggestions', 'meal_planning']);

export const aiGatewayResponseSchema = z.object({
  capability: capabilitySchema,
  output: z.unknown(),
  model: z.string().min(1),
});

export function parseAiGatewayResponse(value: unknown): AiResponse {
  return aiGatewayResponseSchema.parse(value) as AiResponse;
}

export function isAiCapability(value: string): value is AiCapability {
  return capabilitySchema.safeParse(value).success;
}