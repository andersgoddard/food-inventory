import assert from 'node:assert/strict';
import test from 'node:test';
import { createGatewayServer } from './ai-gateway.mjs';

const authToken = 'test-mvp-token';

async function withServer(run) {
  const server = createGatewayServer({
    authToken,
    openAiApiKey: 'test-openai-key',
    fetcher: async () => ({
      ok: true,
      json: async () => ({ output_text: JSON.stringify({ suggestions: [] }) }),
    }),
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('health remains available without authentication', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('allows the local web origin and handles browser preflight', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/ai`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Headers': 'authorization,content-type' },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    assert.equal(response.headers.get('access-control-allow-headers'), 'Authorization, Content-Type');
  });
});

test('does not grant CORS access to an unknown origin', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

test('rejects unauthenticated AI requests', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'recipe_suggestions', input: {} }),
    });
    assert.equal(response.status, 401);
  });
});

test('accepts authenticated valid requests and preserves validation', async () => {
  await withServer(async (baseUrl) => {
    const accepted = await fetch(`${baseUrl}/v1/ai`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ capability: 'recipe_suggestions', input: {} }),
    });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), {
      capability: 'recipe_suggestions',
      output: { suggestions: [] },
      model: 'gpt-5.4-mini',
    });

    const invalid = await fetch(`${baseUrl}/v1/ai`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'not-supported', input: {} }),
    });
    assert.equal(invalid.status, 400);
  });
});
