"use server";

import { backendPost } from "@/src/llm/backend-client";
import { logger } from "@/src/lib/logger";
import { randomUUID, createHash } from "crypto";
import { z } from "zod";
import { Envelope as EnvelopeSchema } from "@/src/contracts/tools";

export type ToolName =
  | "get_customer_usage"
  | "get_recent_tickets"
  | "get_contract_info"
  | "calculate_health"
  | "generate_email"
  | "generate_qbr_outline";

export interface EnvelopeRequest {
  customerId: string;
  params?: Record<string, unknown>;
}

export interface EnvelopeSuccess<T> {
  ok: true;
  data: T;
  error: null;
}

export interface EnvelopeError {
  ok: false;
  data: null;
  error: { code: string; message: string };
}

export type ResponseEnvelope<T> = EnvelopeSuccess<T> | EnvelopeError;

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function invokeTool<T = unknown>(
  tool: ToolName,
  body: EnvelopeRequest,
  schema?: z.ZodSchema<T>
): Promise<ResponseEnvelope<T>> {
  const base = mustEnv("BACKEND_BASE_URL");
  const url = `${base.replace(/\/$/, "")}/${tool}`;
  const payload = { customerId: body.customerId, params: body.params ?? {} };

  const ENABLE_RETRY = process.env.ENABLE_TOOL_RETRY === "1";
  const RETRY_CODES = (
    process.env.TOOL_RETRY_CODES ?? "UNAUTHORIZED,TOOL_FAILURE,EXCEPTION"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const RETRY_DELAY_MS = Number(process.env.TOOL_RETRY_DELAY_MS ?? "200");
  const correlationId = randomUUID();

  const postOnce = async (): Promise<ResponseEnvelope<T>> => {
    const response = await backendPost<unknown>(url, payload);

    if (!response.ok) {
      throw new Error(`Backend error for ${tool}: HTTP ${response.status}`);
    }

    const json = response.data;
    if (!schema) return json as ResponseEnvelope<T>;
    const parsed = await EnvelopeSchema(schema).safeParseAsync(json);
    if (!parsed.success) {
      throw new Error(
        `Schema validation failed for ${tool}: ${parsed.error.message}`
      );
    }
    return parsed.data as ResponseEnvelope<T>;
  };

  // First attempt
  const first = await postOnce();
  if (first.ok) return first;

  // Decide retry
  const code = first.error?.code || "";
  if (!ENABLE_RETRY || !RETRY_CODES.includes(code)) {
    return first;
  }

  try {
    const payloadStr = JSON.stringify(payload);
    const hash = createHash("sha256")
      .update(payloadStr)
      .digest("hex")
      .slice(0, 8);
    logger.debug("[tool retry]", { tool, correlationId, code, bodyHash: hash });
  } catch {}

  // Backoff then retry once
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  const second = await postOnce();
  return second;
}
