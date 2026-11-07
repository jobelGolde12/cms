import type { z } from "zod";

/**
 * AI provider adapter — server-side ONLY. Never import from a client
 * component; the API key lives in server environment variables and must
 * never reach the browser.
 *
 * Design notes (see plan/ai-assisted-student-records-implementation-plan.md §7):
 *  - dependency-free fetch adapter (Option C-shaped micro-adapter) instead of
 *    an AI SDK: the project has no AI infrastructure and this keeps the
 *    dependency surface (and risk surface) minimal;
 *  - provider is selected purely by environment variables:
 *      AI_PROVIDER      "anthropic" (default) | "openai"
 *      AI_API_KEY       server key (also accepts ANTHROPIC_API_KEY / OPENAI_API_KEY)
 *      AI_MODEL         optional override
 *      AI_BASE_URL      optional base override (self-hosted/proxy gateways)
 *      AI_ENABLED       optional explicit "true"/"false" kill switch
 *  - the model is asked for a single JSON object; the raw text is parsed and
 *    validated against a caller-provided Zod schema before ANY use;
 *  - system/user roles come from the caller prompts; context JSON is framed
 *    as data-only (prompt-injection defense lives in prompts.ts).
 */

const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_BACKOFF_MS = 600;

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; retryable: boolean };

export type GenerateStructuredInput<T> = {
  system: string;
  /** User message text (data framing included). */
  prompt: string;
  /** Maximum tokens the model may emit. */
  maxTokens?: number;
  /** Zod schema the JSON response must satisfy. */
  schema: z.ZodType<T>;
};

export function aiEnabled(): boolean {
  if (process.env.AI_ENABLED === "false") return false;
  return resolveCredentials() !== null;
}

type Credentials = { provider: "anthropic" | "openai"; apiKey: string; model: string; baseUrl: string };

function resolveCredentials(): Credentials | null {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase() === "openai" ? "openai" : "anthropic";
  const apiKey = process.env.AI_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model =
    process.env.AI_MODEL ?? (provider === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5");
  const baseUrl = process.env.AI_BASE_URL
    ?? (provider === "openai" ? "https://api.openai.com/v1" : "https://api.anthropic.com");
  return { provider, apiKey, model, baseUrl };
}

/* ------------------------------ JSON handling ---------------------------- */

/**
 * Extract the first balanced JSON object from model text. Models occasionally
 * wrap JSON in prose or fences — we tolerate that but never tolerate missing
 * or invalid JSON (schema validation catches the rest).
 */
export function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/* ------------------------------ Provider calls --------------------------- */

export class ProviderError extends Error {
  constructor(
    public status: number | "network" | "timeout" | "parse",
    message: string,
  ) {
    super(message);
  }
}

async function callAnthropic(cred: Credentials, system: string, prompt: string, maxTokens: number, signal: AbortSignal): Promise<string> {
  const response = await fetch(`${cred.baseUrl}/v1/messages`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": cred.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cred.model,
      max_tokens: maxTokens,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new ProviderError(response.status, await response.text().catch(() => ""));
  const body = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = body.content?.map((c) => (c.type === "text" ? (c.text ?? "") : "")).join("");
  if (!text) throw new ProviderError("parse", "empty response body");
  return text;
}

async function callOpenAI(cred: Credentials, system: string, prompt: string, maxTokens: number, signal: AbortSignal): Promise<string> {
  const response = await fetch(`${cred.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cred.apiKey}`,
    },
    body: JSON.stringify({
      model: cred.model,
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new ProviderError(response.status, await response.text().catch(() => ""));
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "";
  if (!text) throw new ProviderError("parse", "empty response body");
  return text;
}

/* ---------------------------- Rate limiting ------------------------------ */

/**
 * In-process sliding-window limiter (single-instance deployment, matching the
 * project's existing rate-limiting posture for auth). Per user, across all AI
 * features; protective, not a billing control.
 */
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_MAX_REQUESTS = 8;
const rateWindows = new Map<string, number[]>();

export function aiRateLimited(userKey: string): boolean {
  const now = Date.now();
  const hits = (rateWindows.get(userKey) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX_REQUESTS) {
    rateWindows.set(userKey, hits);
    return true;
  }
  hits.push(now);
  rateWindows.set(userKey, hits);
  return false;
}

/* ------------------------------ Public API ------------------------------- */

/**
 * Generate a Zod-valid JSON object from the model. Never throws; failures are
 * returned as typed results with user-safe messages. One automatic retry for
 * transient network/5xx conditions and one re-request for an unusable parse.
 * Malformed-but-parseable responses are NOT retried when they fail Zod — the
 * schema is the contract.
 */
export async function generateStructuredJson<T>(input: GenerateStructuredInput<T>): Promise<AiResult<T>> {
  if (!aiEnabled()) {
    return {
      ok: false,
      retryable: false,
      error: "AI assistance is not configured on this deployment yet. Set AI_API_KEY (server-side) to enable it.",
    };
  }
  const cred = resolveCredentials()!;
  const maxTokens = input.maxTokens ?? 1200;

  const attempt = async (): Promise<string> => {
    try {
      return await (cred.provider === "openai"
        ? callOpenAI(cred, input.system, input.prompt, maxTokens, AbortSignal.timeout(REQUEST_TIMEOUT_MS))
        : callAnthropic(cred, input.system, input.prompt, maxTokens, AbortSignal.timeout(REQUEST_TIMEOUT_MS)));
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ProviderError("timeout", "request timed out");
      }
      // Network / DNS failures.
      throw new ProviderError("network", error instanceof Error ? error.message : String(error));
    }
  };

  const friendly = (status: number | "network" | "timeout" | "parse"): { ok: false; error: string; retryable: boolean } => {
    switch (status) {
      case "timeout":
        return { ok: false, retryable: true, error: "The assistant took too long to respond. Please try again." };
      case "network": {
        return { ok: false, retryable: true, error: "The assistant service could not be reached. Please try again." };
      }
      case "parse":
        return { ok: false, retryable: true, error: "The assistant returned an unusable response. Please try again." };
      default:
        if (status === 401 || status === 403) {
          // Server-side log only — never expose key state to the user.
          console.error("[ai] provider rejected credentials", { provider: cred.provider, status });
          return { ok: false, retryable: false, error: "The assistant is temporarily unavailable. Contact the administrator." };
        }
        if (status === 429) {
          return { ok: false, retryable: true, error: "The assistant is rate-limited right now. Please wait a moment and try again." };
        }
        return { ok: false, retryable: true, error: "The assistant service is temporarily unavailable. Please try again." };
    }
  };

  try {
    const text = await attempt();
    const parsed = parseAndValidate(text, input.schema);
    if (parsed.ok) return { ok: true, data: parsed.data };
    // Network/timeout failures retry inside the catch via a ProviderError;
    // an unusable response body is retried once (the model can wobble).
    await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
    const retryText = await attempt();
    const retryParsed = parseAndValidate(retryText, input.schema);
    if (retryParsed.ok) return { ok: true, data: retryParsed.data };
    console.error("[ai] unusable model response", { provider: cred.provider, reason: retryParsed.reason });
    return friendly("parse");
  } catch (error) {
    if (error instanceof ProviderError) {
      if ((error.status === "network" || error.status === "timeout") ) {
        try {
          await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
          const text = await attempt();
          const parsed = parseAndValidate(text, input.schema);
          if (parsed.ok) return { ok: true, data: parsed.data };
          return friendly(parsed.reason as "parse");
        } catch (retryError) {
          if (retryError instanceof ProviderError) return friendly(retryError.status);
        }
      }
      return friendly(error.status);
    }
    console.error("[ai] unexpected provider failure", error);
    return { ok: false, retryable: true, error: "The assistant failed unexpectedly. Please try again." };
  }
}

function parseAndValidate<T>(
  text: string,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; reason: "parse" } {
  const raw = extractJson(text);
  if (raw === null) return { ok: false, reason: "parse" };
  const result = schema.safeParse(raw);
  if (!result.success) return { ok: false, reason: "parse" };
  return { ok: true, data: result.data };
}
