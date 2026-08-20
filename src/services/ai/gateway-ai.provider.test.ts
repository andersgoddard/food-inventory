import { AiProviderError } from './ai-capability';
import { GatewayAiProvider } from './gateway-ai.provider';

function response(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('GatewayAiProvider', () => {
  it('returns validated provider-neutral responses', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({
      capability: 'recipe_suggestions',
      output: { suggestions: [] },
      model: 'gpt-5.4-mini',
    }));
    const provider = new GatewayAiProvider({ baseUrl: 'https://ai.example.test', fetcher });

    await expect(provider.request({ capability: 'recipe_suggestions', input: { inventory: [] } })).resolves.toEqual({
      capability: 'recipe_suggestions',
      output: { suggestions: [] },
      model: 'gpt-5.4-mini',
    });
    expect(fetcher).toHaveBeenCalledWith('https://ai.example.test/v1/ai', expect.objectContaining({ method: 'POST' }));
  });

  it('sends the configured bearer token', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({
      capability: 'recipe_suggestions',
      output: { suggestions: [] },
      model: 'gpt-5.4-mini',
    }));
    const provider = new GatewayAiProvider({ baseUrl: 'https://ai.example.test', token: 'mvp-token', fetcher });

    await provider.request({ capability: 'recipe_suggestions', input: { inventory: [] } });

    expect(fetcher).toHaveBeenCalledWith('https://ai.example.test/v1/ai', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer mvp-token' }),
    }));
  });

  it('rejects malformed gateway responses before application use', async () => {
    const provider = new GatewayAiProvider({
      baseUrl: 'https://ai.example.test',
      fetcher: jest.fn().mockResolvedValue(response({ capability: 'recipe_suggestions', output: {} })),
    });

    await expect(provider.request({ capability: 'recipe_suggestions', input: {} })).rejects.toMatchObject<Partial<AiProviderError>>({
      code: 'validation',
    });
  });

  it('maps gateway failures to provider errors', async () => {
    const provider = new GatewayAiProvider({
      baseUrl: 'https://ai.example.test',
      fetcher: jest.fn().mockResolvedValue(response({ error: 'gateway unavailable' }, false, 503)),
    });

    await expect(provider.request({ capability: 'food_scan', input: {} })).rejects.toMatchObject({
      message: 'gateway unavailable',
      code: 'provider',
    });
  });
});