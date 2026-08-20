import { AiProvider, AiProviderError, AiRequest, AiResponse } from './ai-capability';
import { parseAiGatewayResponse } from './ai.schemas';

const DEFAULT_TIMEOUT_MS = 20_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

export interface AiGatewayProviderOptions {
  baseUrl: string;
  token?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export class GatewayAiProvider implements AiProvider {
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: AiGatewayProviderOptions) {
    this.fetcher = options.fetcher || fetch;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async healthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    try {
      const response = await this.fetcher(`${this.options.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async request(request: AiRequest): Promise<AiResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(`${this.options.baseUrl}/v1/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new AiProviderError(
          typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
            ? body.error
            : `AI gateway request failed with status ${response.status}`,
          'provider'
        );
      }

      try {
        return parseAiGatewayResponse(body);
      } catch {
        throw new AiProviderError('AI gateway returned an invalid response.', 'validation');
      }
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AiProviderError('AI gateway request timed out.', 'timeout');
      }
      throw new AiProviderError('AI gateway is unavailable.', 'network');
    } finally {
      clearTimeout(timeout);
    }
  }
}