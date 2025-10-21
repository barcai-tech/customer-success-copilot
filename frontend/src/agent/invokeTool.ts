"use server";

import { signHmac, nowMs } from "@/src/lib/hmac";
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
  const secret = mustEnv("HMAC_SECRET");
  const clientId = process.env["HMAC_CLIENT_ID"] ?? "copilot-frontend";

  const url = `${base.replace(/\/$/, "")}/${tool}`;
  const raw = JSON.stringify({ customerId: body.customerId, params: body.params ?? {} });
  const ts = nowMs();
  const sig = signHmac(secret, ts, clientId, raw);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Timestamp": ts,
      "X-Client": clientId,
      "X-Signature": sig,
    },
    body: raw,
    // Important: server action fetch (no caching)
    cache: "no-store",
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Invalid JSON from tool ${tool}`);
  }
  if (!schema) return json as ResponseEnvelope<T>;
  // Validate envelope with provided schema
  const parsed = await EnvelopeSchema(schema).safeParseAsync(json);
  if (!parsed.success) {
    throw new Error(`Schema validation failed for ${tool}: ${parsed.error.message}`);
  }
  return parsed.data as ResponseEnvelope<T>;
}
