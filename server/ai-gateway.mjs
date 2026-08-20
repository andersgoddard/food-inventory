import 'dotenv/config';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const maxBodyBytes = 8 * 1024 * 1024;
const maxRequestsPerMinute = 30;
const capabilities = new Set(['food_scan', 'recipe_suggestions', 'meal_planning']);
const allowedOrigins = new Set(
  (process.env.AI_GATEWAY_ALLOWED_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function writeJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin || !allowedOrigins.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, POST',
    Vary: 'Origin',
  };
}

function clientAddress(request) {
  return request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown';
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validateRequest(body) {
  if (!body || typeof body !== 'object' || !capabilities.has(body.capability) || !('input' in body)) {
    throw new Error('Invalid AI request.');
  }
  return body;
}

function systemInstruction(capability) {
  const outputContract = capability === 'food_scan'
    ? 'Return exactly {"candidates":[{"photoId":string,"name":string,"category":string,"quantity":number|null,"unit":string|null,"confidence":number}]}. Use the supplied photoId for every candidate. Return candidates, never items.'
    : 'Return exactly {"suggestions":[{"title":string,"summary":string,"servings":number,"preparationMinutes":number|null,"ingredients":[{"name":string,"quantity":number|null,"unit":string|null,"substitution":string|null}],"steps":[string],"expiryPriority":"high"|"normal"|"none","confidence":number}]}. Return suggestions, never recipes.';
  return [
    'You are an internal capability used by a household food inventory application.',
    'Return only a valid JSON object suitable for application validation.',
    'Do not claim certainty that the input does not support.',
    `Capability: ${capability}`,
    outputContract,
  ].join(' ');
}

function extractJson(responseBody) {
  if (typeof responseBody.output_text === 'string') return JSON.parse(responseBody.output_text);
  const text = responseBody.output
    ?.flatMap((item) => item.content || [])
    ?.find((item) => typeof item.text === 'string')?.text;
  if (typeof text !== 'string') throw new Error('AI provider returned no structured output.');
  return JSON.parse(text);
}

function normalizeCapabilityOutput(capability, output, input) {
  if (capability === 'food_scan' && output && typeof output === 'object' && Array.isArray(output.items) && !Array.isArray(output.candidates)) {
    const photoIds = Array.isArray(input?.photos) ? input.photos.map((photo) => photo.photoId).filter(Boolean) : [];
    return {
      candidates: output.items.map((item, index) => ({
        ...item,
        photoId: item.photoId || photoIds[index] || photoIds[0] || 'unknown-photo',
      })),
    };
  }
  if (capability !== 'food_scan' && output && typeof output === 'object' && Array.isArray(output.recipes) && !Array.isArray(output.suggestions)) {
    return { ...output, suggestions: output.recipes };
  }
  return output;
}

async function callOpenAi(capability, input, openAiApiKey, openAiModel, fetcher) {
  if (!openAiApiKey) throw new Error('AI gateway is not configured.');
  const userContent = capability === 'food_scan' && Array.isArray(input?.photos)
    ? [
        {
          type: 'input_text',
          text: JSON.stringify({
            location: input.location,
            instructions: input.instructions,
          }),
        },
        ...input.photos.map((photo) => ({
          type: 'input_image',
          image_url: photo.dataUrl,
        })),
      ]
    : [{ type: 'input_text', text: JSON.stringify(input) }];
  const providerResponse = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiModel,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemInstruction(capability) }] },
        { role: 'user', content: userContent },
      ],
      text: { format: { type: 'json_object' } },
    }),
  });
  const body = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok) {
    const providerMessage = typeof body?.error?.message === 'string' ? body.error.message : 'AI provider request failed.';
    throw new Error(`AI provider request failed (${providerResponse.status}): ${providerMessage}`);
  }
  return normalizeCapabilityOutput(capability, extractJson(body), input);
}

export function createGatewayServer({
  openAiApiKey = process.env.OPENAI_API_KEY,
  openAiModel = process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  authToken = process.env.AI_GATEWAY_AUTH_TOKEN,
  fetcher = fetch,
} = {}) {
  const requestWindows = new Map();
  return http.createServer(async (request, response) => {
    const headers = corsHeaders(request);
    console.log(`[gateway] ${request.method} ${request.url} origin=${request.headers.origin || 'none'}`);

    if (request.method === 'OPTIONS' && (request.url === '/health' || request.url === '/v1/ai')) {
      response.writeHead(204, headers);
      response.end();
      return;
    }

    if (request.method === 'GET' && request.url === '/health') {
      writeJson(response, 200, { status: 'ok' }, headers);
      return;
    }

    if (request.method !== 'POST' || request.url !== '/v1/ai') {
      writeJson(response, 404, { error: 'Not found.' }, headers);
      return;
    }

    if (!authToken || request.headers.authorization !== `Bearer ${authToken}`) {
      writeJson(response, 401, { error: 'Unauthorized.' }, headers);
      return;
    }

    if (isRateLimited(clientAddress(request), requestWindows)) {
      writeJson(response, 429, { error: 'Too many requests.' }, headers);
      return;
    }

    try {
      const body = validateRequest(await readJson(request));
      const output = await callOpenAi(body.capability, body.input, openAiApiKey, openAiModel, fetcher);
      writeJson(response, 200, { capability: body.capability, output, model: openAiModel }, headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI provider request failed.';
      console.error(`[gateway] ${request.method} ${request.url} failed: ${message}`);
      const status = message === 'AI gateway is not configured.' ? 503 : message === 'Too many requests.' ? 429 : 400;
      writeJson(response, status, { error: message }, headers);
    }
  });
}

function isRateLimited(address, requestWindows) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (requestWindows.get(address) || []).filter((timestamp) => timestamp > windowStart);
  recent.push(now);
  requestWindows.set(address, recent);
  return recent.length > maxRequestsPerMinute;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || process.env.AI_GATEWAY_PORT || 8787);
  const server = createGatewayServer();
  server.listen(port, () => {
    console.log(`AI gateway listening on port ${port}`);
  });
}