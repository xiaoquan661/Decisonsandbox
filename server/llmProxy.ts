const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MAX_BODY_BYTES = 20_000;
const UPSTREAM_TIMEOUT_MS = 20_000;

type ChatMessage = { role: 'system' | 'user'; content: string };

class RequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function jsonResponse(status: number, error: string): Response {
  return Response.json(
    { error },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

function validateSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  if (origin !== new URL(request.url).origin) {
    throw new RequestError(403, 'Cross-origin requests are not allowed');
  }
}

function normalizeBody(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') {
    throw new RequestError(400, 'Invalid JSON body');
  }

  const body = input as Record<string, unknown>;
  if (!Array.isArray(body.messages) || body.messages.length < 2 || body.messages.length > 4) {
    throw new RequestError(400, 'Invalid messages');
  }

  const messages: ChatMessage[] = body.messages.map((item) => {
    if (!item || typeof item !== 'object') throw new RequestError(400, 'Invalid message');
    const message = item as Record<string, unknown>;
    if ((message.role !== 'system' && message.role !== 'user') || typeof message.content !== 'string') {
      throw new RequestError(400, 'Invalid message');
    }
    const limit = message.role === 'system' ? 6_000 : 10_000;
    if (!message.content.trim() || message.content.length > limit) {
      throw new RequestError(400, 'Message is empty or too long');
    }
    return { role: message.role, content: message.content };
  });

  const requestedTokens = typeof body.max_tokens === 'number' ? body.max_tokens : 600;
  const requestedTemperature = typeof body.temperature === 'number' ? body.temperature : 0.5;

  return {
    model: 'deepseek-chat',
    messages,
    response_format: { type: 'json_object' },
    max_tokens: Math.max(100, Math.min(1_000, Math.round(requestedTokens))),
    temperature: Math.max(0, Math.min(1, requestedTemperature)),
    stream: false,
  };
}

/**
 * Vercel 与 Netlify 共用的无状态 BYOK 转发器。
 * 用户 Key 只在本次请求内用于 DeepSeek 鉴权，不记录、不缓存、不持久化。
 */
export async function handleLlmProxy(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }

    validateSameOrigin(request);

    const apiKey = request.headers.get('x-api-key')?.trim() ?? '';
    if (!apiKey.startsWith('sk-') || apiKey.length > 256) {
      throw new RequestError(401, 'Invalid API key');
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new RequestError(415, 'Content-Type must be application/json');
    }

    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      throw new RequestError(413, 'Request body is too large');
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      throw new RequestError(413, 'Request body is too large');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new RequestError(400, 'Invalid JSON body');
    }
    const body = normalizeBody(parsed);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const upstream = await fetch(DEEPSEEK_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse(error.status, error.message);
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse(504, 'DeepSeek request timed out');
    }
    return jsonResponse(502, 'DeepSeek is temporarily unavailable');
  }
}
