"use server";

/**
 * Backend Client Utility
 *
 * Centralized HMAC-signed fetch for backend service calls.
 * Consolidates security logic to a single audit point.
 *
 * Used by:
 * - src/agent/invokeTool.ts (tool invocations)
 * - src/llm/provider.ts (LLM integrations)
 * - app/api/eval/stream/route.ts (evaluation streaming)
 */

import { signHmac, nowMs } from "@/src/lib/hmac";
import { logger } from "@/src/lib/logger";

export interface BackendClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  cache?: "no-store" | "default";
  timeout?: number;
}

export interface BackendClientResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  text: string;
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getClientId(): string {
  return process.env["HMAC_CLIENT_ID"] ?? "copilot-frontend";
}

/**
 * Make an HMAC-signed request to the backend service.
 *
 * Handles:
 * - HMAC signing (SHA-256 with timestamp, client ID, and body)
 * - Request timeout
 * - Error logging
 *
 * @param url - Backend URL (e.g., "https://backend.example.com/tool/get_customer_usage")
 * @param opts - Request options
 * @returns Response with parsed JSON data
 *
 * @throws Error if:
 * - Missing required environment variables
 * - Network error
 * - Response parsing fails
 * - Timeout occurs
 */
export async function backendFetch<T = unknown>(
  url: string,
  opts: BackendClientOptions = {}
): Promise<BackendClientResponse<T>> {
  const secret = mustEnv("HMAC_SECRET");
  const clientId = getClientId();
  const method = opts.method ?? "POST";
  const timeout = opts.timeout ?? 30000;

  // Serialize body
  let bodyStr = "";
  if (opts.body) {
    bodyStr =
      typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  }

  // Sign request
  const timestamp = nowMs();
  const signature = signHmac(secret, timestamp, clientId, bodyStr);

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Timestamp": timestamp,
    "X-Client": clientId,
    "X-Signature": signature,
    ...(opts.headers ?? {}),
  };

  // Execute with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: bodyStr || undefined,
      cache: opts.cache ?? "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let text = "";
    let data: T | undefined;

    try {
      text = await response.text();
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch (parseErr) {
      logger.error("[backend-client] JSON parse failed", {
        url,
        status: response.status,
        text: text.slice(0, 200),
      });
      throw new Error(
        `Failed to parse backend response: ${
          parseErr instanceof Error ? parseErr.message : String(parseErr)
        }`
      );
    }

    return {
      ok: response.ok,
      status: response.status,
      data: data as T,
      text,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Backend request timeout (${timeout}ms): ${url}`);
    }

    throw error;
  }
}

/**
 * Make a simple GET request to the backend with HMAC signing.
 */
export async function backendGet<T = unknown>(
  url: string,
  opts: Omit<BackendClientOptions, "method" | "body"> = {}
): Promise<BackendClientResponse<T>> {
  return backendFetch<T>(url, { ...opts, method: "GET" });
}

/**
 * Make a simple POST request to the backend with HMAC signing.
 */
export async function backendPost<T = unknown>(
  url: string,
  body?: Record<string, unknown>,
  opts: Omit<BackendClientOptions, "method" | "body"> = {}
): Promise<BackendClientResponse<T>> {
  return backendFetch<T>(url, { ...opts, method: "POST", body });
}
