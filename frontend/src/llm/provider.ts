"use server";

// Simple OpenAI Chat Completions wrapper with tool/function calling support

export interface LlmToolFunctionCall {
  name: string;
  arguments: string; // raw JSON string
}

export interface LlmToolCall {
  id: string;
  type: "function";
  function: LlmToolFunctionCall;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  // For tool messages only (response to assistant.tool_calls)
  tool_call_id?: string;
  // For assistant messages that proposed tool calls
  tool_calls?: LlmToolCall[];
}

export interface LlmResponse {
  type: "assistant" | "tool_calls";
  message?: string; // assistant content when no tool calls
  assistant?: { content: string | null; tool_calls: LlmToolCall[] };
}

interface ProviderOptions {
  temperature?: number;
  tools?: unknown[];
}

function parseEnvFloat(name: string, fallback?: number): number | undefined {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function supportsCustomTemperature(model: string): boolean {
  // Some models (e.g., gpt-5*) only support the default temperature.
  return !/^gpt-5/i.test(model);
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || (status >= 500 && status <= 504);
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callLLM(
  messages: LlmMessage[],
  opts: ProviderOptions = {}
): Promise<LlmResponse> {
  const apiKey = mustEnv("OPENAI_API_KEY");
  const model = process.env["OPENAI_MODEL"] ?? "gpt-4.1";
  const baseUrl = process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1";
  const maxRetries = parseEnvInt("OPENAI_MAX_RETRIES", 2);
  const timeoutMs = parseEnvInt("OPENAI_TIMEOUT_MS", 30000);

  // Map to OpenAI wire format
  const wantTemp = opts.temperature ?? parseEnvFloat("OPENAI_TEMPERATURE", 0.1);
  const payload: Record<string, unknown> = {
    model,
    // Only include temperature when the model supports it
    ...(supportsCustomTemperature(model) && typeof wantTemp === "number"
      ? { temperature: wantTemp }
      : {}),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content ?? "",
      ...(m.role === "tool" && m.tool_call_id
        ? { tool_call_id: m.tool_call_id }
        : {}),
      ...(m.role === "assistant" && m.tool_calls
        ? { tool_calls: m.tool_calls }
        : {}),
    })),
    ...(opts.tools ? { tools: opts.tools, tool_choice: "auto" } : {}),
  };

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const body = text ? stripHtml(text).slice(0, 300) : res.statusText;
        const err = new Error(`LLM HTTP ${res.status}: ${body}`);
        if (isRetryableStatus(res.status) && attempt < maxRetries) {
          const baseDelay = 400 * Math.pow(2, attempt);
          const jitter = Math.floor(Math.random() * 200);
          await sleep(baseDelay + jitter);
          lastErr = err;
          continue;
        }
        throw err;
      }

      const json = await res.json();
      const choice = json?.choices?.[0]?.message;
      if (!choice) throw new Error("LLM: empty response");

      const toolCalls = choice.tool_calls as LlmToolCall[] | undefined;
      if (toolCalls && toolCalls.length > 0) {
        return {
          type: "tool_calls",
          assistant: { content: choice.content ?? null, tool_calls: toolCalls },
        };
      }
      const content: string = choice.content ?? "";
      return { type: "assistant", message: content };
    } catch (e) {
      if (attempt < maxRetries) {
        const baseDelay = 400 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 200);
        await sleep(baseDelay + jitter);
        lastErr = e as Error;
        continue;
      }
      throw lastErr ?? (e as Error);
    }
  }
  throw new Error("LLM: unreachable state");
}
