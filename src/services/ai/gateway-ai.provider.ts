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
  private readonly baseUrl: string;

  constructor(private readonly options: AiGatewayProviderOptions) {
    this.fetcher = options.fetcher || globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
  }

  async healthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    try {
      const response = await this.fetcher(`${this.baseUrl}/health`, {
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
    console.log('[ai-gateway-client] request started', { baseUrl: this.baseUrl, capability: request.capability });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      console.log('[ai-gateway-client] sending POST /v1/ai');
      const response = await this.fetcher(`${this.baseUrl}/v1/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      console.log('[ai-gateway-client] response received', { status: response.status, ok: response.ok });

      const body = await response.json().catch(() => null);
      console.log('[ai-gateway-client] response JSON read', {
        bodyType: typeof body,
        error: typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : undefined,
      });
      if (!response.ok) {
        throw new AiProviderError(
          typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
            ? body.error
            : `AI gateway request failed with status ${response.status}`,
          'provider'
        );
      }

      try {
        const parsed = parseAiGatewayResponse(body);
        console.log('[ai-gateway-client] response validated', { model: parsed.model });
        return parsed;
      } catch {
        console.error('[ai-gateway-client] response validation failed');
        throw new AiProviderError('AI gateway returned an invalid response.', 'validation');
      }
    } catch (error) {
      console.error('[ai-gateway-client] request failed', error);
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