// A6 AI 维度推荐 — DeepSeek API 客户端
//
// 设计原则（PRD v2.1 § 6.2.6）：
// - 15s 超时（AbortController）
// - 1 次重试
// - 24h 会话级缓存（key 包含类别、选项、维度与 prompt 版本）
// - 失败抛出 Error，由调用方降级（按钮置灰 + inline 错误）
//
// Key 来源：用户在前端 "设置 → AI 推荐" 里填入，默认存 sessionStorage，
// 用户主动选择“记住此设备”时才存 localStorage。浏览器把 key 放在
// X-Api-Key 头里，由本地 Vite 代理或线上 Serverless Function 瞬时转发给 DeepSeek。

export type AiDimension = { name: string; reason: string };
export type AiResponse = { dimensions: AiDimension[] };

const TIMEOUT_MS = 15000;
const RETRY = 1;
const CACHE_TTL = 24 * 3600 * 1000;
const ENDPOINT = '/api/llm';
export const LS_KEY = 'deepseek_api_key';
export const SS_KEY = 'deepseek_api_key_session';

export function getApiKey(): string {
  try {
    return sessionStorage.getItem(SS_KEY) ?? localStorage.getItem(LS_KEY) ?? '';
  } catch {
    return '';
  }
}

export function hasApiKey(): boolean {
  return getApiKey().trim().startsWith('sk-');
}

// 进程级内存缓存。同一会话内重复调用直接返回，避免同决策反复扣费。
// 刷新页面后丢失（不需要持久化，PRD 不要求）。
// 泛型 `unknown` — A6 / A7 各自解析各自的 shape；写入时用 unknown，读取时由调用方断言
const cache = new Map<string, { ts: number; data: unknown }>();

function cacheKey(category: string, optionNames: string[], existingDims: string[]): string {
  const sorted = optionNames.slice().sort().join('|');
  const dims = existingDims.slice().sort().join('|');
  return `dim:v2::${category}::${sorted}::${dims}`;
}

function buildBody(category: string, optionNames: string[], existingDims: string[]) {
  return {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system' as const,
        // DeepSeek 官方要求：使用 json_object 模式时 prompt 必须含"json"字样 + JSON 样例
        content:
          '你是决策辅助助手。基于用户提供的决策类型、选项、已选维度，推荐 3-5 个用户可能漏掉的评估维度。\n' +
          '必须输出严格 JSON（不要 markdown 代码块、不要任何额外字段）。\n' +
          'JSON 样例：\n' +
          '{"dimensions":[{"name":"晋升空间","reason":"长期职业发展的关键因素"}]}',
      },
      {
        role: 'user' as const,
        content:
          `类型: ${category}\n` +
          `已选维度: ${existingDims.join('、') || '无'}\n` +
          `选项: ${optionNames.join('、') || '无'}\n` +
          `请以 JSON 格式推荐 3-5 个新维度。`,
      },
    ],
    response_format: { type: 'json_object' },
    // 中文 3-5 个维度 + reason 容易触发"JSON 截断"，给 600 留足余量
    max_tokens: 600,
    temperature: 0.7,
    stream: false,
  };
}

async function callOnce(signal: AbortSignal, body: object, apiKey: string): Promise<Response> {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
    signal,
  });
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('MissingApiKey');
  }
}

// ─── 公共调用框架（A6 / A7 共用：超时 / 重试 / key 管理 / 缓存） ──────────────

export interface CallLlmArgs {
  systemPrompt: string;
  userPrompt: string;
  cacheKey: string;
  maxTokens?: number;
}

async function callLlm({ systemPrompt, userPrompt, cacheKey, maxTokens = 600 }: CallLlmArgs): Promise<string> {
  const apiKey = getApiKey().trim();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  // 缓存：键由调用方传入（hash 已含所有变化因子）
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return JSON.stringify(hit.data);
  }

  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: maxTokens,
    temperature: 0.7,
    stream: false,
  };

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= RETRY; attempt++) {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await callOnce(ac.signal, body, apiKey);
      if (!res.ok) {
        const statusErr = new Error(`HTTP ${res.status}`) as Error & { status?: number };
        if (res.status === 401 || res.status === 403) {
          console.error('[LLM] Key 错误 HTTP', res.status);
          throw new Error('InvalidApiKey');
        }
        // 暴露状态码 + 响应体前 200 字
        const errBody = await res.text().catch(() => '');
        console.error(`[LLM] HTTP ${res.status}:`, errBody.slice(0, 200));
        throw statusErr;
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content ?? '{}';
      // 缓存（让后续 A6 维度 / A7 推荐 同 hash 直接命中）
      try {
        const parsed = JSON.parse(text);
        cache.set(cacheKey, { ts: Date.now(), data: parsed });
      } catch {
        // 不影响本次返回；下次重试
      }
      return text;
    } catch (e) {
      const error = e as Error;
      if (error.message === 'InvalidApiKey' || (/^HTTP 4\d\d$/.test(error.message) && error.message !== 'HTTP 429')) {
        throw error;
      }
      lastErr = error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('AI 调用失败');
}

export async function requestDimensions(args: {
  category: string;
  optionNames: string[];
  existingDims: string[];
}): Promise<AiResponse> {
  const apiKey = getApiKey().trim();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const key = cacheKey(args.category, args.optionNames, args.existingDims);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return hit.data;
  }

  const body = buildBody(args.category, args.optionNames, args.existingDims);

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= RETRY; attempt++) {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await callOnce(ac.signal, body, apiKey);
      if (!res.ok) {
        // 401/403 视为 key 错误，单独抛错便于 UI 提示
        if (res.status === 401 || res.status === 403) {
          throw new Error('InvalidApiKey');
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content ?? '{}';
      let parsed: AiResponse;
      try {
        parsed = JSON.parse(text) as AiResponse;
      } catch {
        throw new Error('Bad JSON shape from LLM');
      }
      if (!parsed.dimensions || !Array.isArray(parsed.dimensions)) {
        throw new Error('Missing dimensions array');
      }
      parsed.dimensions = parsed.dimensions
        .map((d) => ({
          name: String(d.name ?? '').trim(),
          reason: String(d.reason ?? '').trim(),
        }))
        .filter((d) => d.name.length > 0);
      if (parsed.dimensions.length === 0) {
        throw new Error('Empty dimensions array');
      }
      cache.set(key, { ts: Date.now(), data: parsed });
      return parsed;
    } catch (e) {
      const error = e as Error;
      if (error.message === 'InvalidApiKey' || (/^HTTP 4\d\d$/.test(error.message) && error.message !== 'HTTP 429')) {
        throw error;
      }
      lastErr = error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('AI 调用失败');
}

// ─── A7 AI 综合推荐（F7 锁定决策） ───────────────────────────────────

export type AiRecommendation = {
  recommendation: string;        // 选项的 name
  confidence: '高' | '中' | '低';
  reasons: string[];             // 3 条 1 句话
};

// LLM 实际返回的是扁平结构（外层没有 recommendation 包裹）。
// 兼容老的嵌套写法：{recommendation:{...}}，便于以后改 prompt。
export type AiRecResponse = AiRecommendation | { recommendation: AiRecommendation };

export interface RequestRecArgs {
  category: string;
  options: { name: string; scores: Record<string, number> }[];
  dimensions: { name: string; weightPct: number }[];
  reason: string;
}

function recCacheKey(args: RequestRecArgs): string {
  // 哈希包含：category + 归一化权重 + 选项名（顺序敏感）+ reason
  const weights = args.dimensions.map((d) => `${d.name}=${d.weightPct}`).join(',');
  const opts = args.options.map((o) => o.name).join('|');
  const scores = args.options
    .map((o) => Object.entries(o.scores).map(([k, v]) => `${k}:${v}`).join(','))
    .join('|');
  const reason = args.reason.trim();
  return `rec::${args.category}::${weights}::${opts}::${scores}::${reason}`;
}

function buildRecBody(args: RequestRecArgs): { system: string; user: string } {
  const system =
    '你是决策辅助助手。基于用户提供的决策类型、选项、维度评分、权重、决策理由，给出综合推荐。\n' +
    '必须输出严格 JSON（不要 markdown 代码块、不要任何额外字段、不要把字段再嵌一层）。\n' +
    '严格规则：\n' +
    '  - recommendation 必须且只能是下方 options 列表中的某个 name；不得编造或改写。\n' +
    '  - confidence 三选一：高（信息充分且有明确赢家）/ 中（信息够用但接近）/ 低（信息很少或平局）。\n' +
    '  - reasons 必须是 3 条独立角度（如：维度对比 / 理由呼应 / 主要 trade-off），每条 ≤ 30 字中文。\n' +
    '  - 不得编造未提供的维度名。\n' +
    'JSON 样例（扁平结构，字段都在最外层）：\n' +
    '{"recommendation":"字节","confidence":"高","reasons":["薪资/成长性 领先","理由里强调技术深度","团队氛围是 trade-off"]}';

  const user =
    `类型: ${args.category}\n` +
    `选项（含评分）: ${JSON.stringify(args.options)}\n` +
    `维度（含归一化权重%）: ${JSON.stringify(args.dimensions)}\n` +
    `决策理由: ${args.reason || '（未填写）'}\n` +
    `请基于以上综合信息给出推荐。`;

  return { system, user };
}

export async function requestRecommendation(args: RequestRecArgs): Promise<AiRecommendation> {
  const text = await callLlm({
    systemPrompt: buildRecBody(args).system,
    userPrompt: buildRecBody(args).user,
    cacheKey: recCacheKey(args),
    maxTokens: 800,
  });
  let parsed: AiRecResponse;
  try {
    parsed = JSON.parse(text) as AiRecResponse;
  } catch (e) {
    console.error('[A7] LLM 返回非 JSON:', text);
    throw new Error('Bad JSON shape from LLM');
  }
  // 兼容两种返回结构：扁平（实际）/ 嵌套（老 prompt 残留）
  const rec: AiRecommendation = 'reasons' in parsed && Array.isArray(parsed.reasons)
    ? (parsed as AiRecommendation)
    : (parsed as { recommendation: AiRecommendation }).recommendation;
  if (!rec || typeof rec.recommendation !== 'string' || !Array.isArray(rec.reasons)) {
    console.error('[A7] LLM 返回缺字段:', parsed);
    throw new Error('Missing recommendation object');
  }
  return {
    recommendation: rec.recommendation.trim(),
    confidence: (['高', '中', '低'] as const).includes(rec.confidence) ? rec.confidence : '中',
    reasons: rec.reasons.map((r) => String(r ?? '').trim()).filter((r) => r.length > 0).slice(0, 3),
  };
}
