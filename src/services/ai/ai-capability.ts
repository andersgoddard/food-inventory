export type AiCapability = 'food_scan' | 'recipe_suggestions' | 'meal_planning';

export interface AiRequest {
  capability: AiCapability;
  input: unknown;
}

export interface AiResponse {
  capability: AiCapability;
  output: unknown;
  model: string;
}

export interface AiProvider {
  request(request: AiRequest): Promise<AiResponse>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly code: 'configuration' | 'timeout' | 'network' | 'provider' | 'validation'
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}