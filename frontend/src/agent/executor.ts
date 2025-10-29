/**
 * Execution phase module
 * Invokes tools in parallel, manages cache, and handles errors
 */

import {
  invokeTool,
  type ToolName,
  type ResponseEnvelope,
  type EnvelopeSuccess,
} from "@/src/agent/invokeTool";
import { getToolRegistry } from "@/src/agent/tool-registry";
import { callLLM, type LlmMessage } from "@/src/llm/provider";
import type {
  ExecutionPlanStep,
  ToolDataMap,
  ToolExecutionRecord,
  SendEventFn,
  PhaseCompleteEventData,
  ToolResult,
  ToolSchemaMap,
} from "./types";
import { TOOL_SCHEMAS } from "./types";
import { logger } from "@/src/lib/logger";
import { redactString } from "./synthesizer";
import type { z } from "zod";

const TOOL_SCHEMA_MAP: ToolSchemaMap = TOOL_SCHEMAS;

function getToolSchema<T extends ToolName>(
  name: T
): z.ZodType<ToolResult<T>> {
  return TOOL_SCHEMA_MAP[name] as z.ZodType<ToolResult<T>>;
}

/**
 * Execute a plan by invoking tools in parallel rounds
 * Returns: { messages, cache, usedTools, timingInfo }
 */
export async function executePlan(
  initialMessages: LlmMessage[],
  plan: ExecutionPlanStep[],
  customerId: string,
  ownerUserId: string,
  send: SendEventFn,
  existingCache?: Partial<ToolDataMap>
): Promise<{
  messages: LlmMessage[];
  cache: Partial<ToolDataMap>;
  usedTools: ToolExecutionRecord[];
  timingInfo: {
    toolExecutionMs: number;
    totalExecutionMs: number;
  };
}> {
  const toolExecutionStartTime = performance.now();

  const messages: LlmMessage[] = [...initialMessages];
  const tools = getToolRegistry();
  const cache: Partial<ToolDataMap> = existingCache || {};
  const usedTools: ToolExecutionRecord[] = [];

  // LLM loop for tool calling
  let toolRounds = 0;
  const maxRounds = 8;

  for (let step = 0; step < maxRounds; step++) {
    try {
      const resp = await callLLM(messages, { tools });

      // Check if LLM returned tool calls
      if (resp.type === "tool_calls" && resp.assistant?.tool_calls?.length) {
        // Stream plan/decision log
        send("plan", {
          planSource: "llm",
          customerId,
          decisionLog: resp.assistant.tool_calls.map((tc, i) => ({
            step: i + 1,
            tool: tc.function.name,
            reason: "",
          })),
        });

        // Add assistant message with tool calls
        messages.push({
          role: "assistant",
          content: resp.assistant.content ?? "",
          tool_calls: resp.assistant.tool_calls,
        });
        toolRounds++;

        // Execute all tools in this round in parallel
        await Promise.all(
          resp.assistant.tool_calls.map(async (tc) => {
            const rawName = tc.function.name;
            if (!isToolName(rawName)) {
              logger.warn("[Unknown tool call]", { tool: rawName });
              usedTools.push({
                name: rawName,
                error: "UNKNOWN_TOOL",
              });
              messages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify({
                  ok: false,
                  data: null,
                  error: {
                    code: "UNKNOWN_TOOL",
                    message: `Unhandled tool ${rawName}`,
                  },
                }),
              });
              return;
            }
            await executeToolCall(
              tc,
              rawName,
              customerId,
              ownerUserId,
              cache,
              messages,
              usedTools,
              send
            );
          })
        );

        // Nudge LLM to finalize after multiple rounds
        if (toolRounds >= 2) {
          messages.push({
            role: "user",
            content: "Return the final JSON now. No markdown.",
          });
        }

        continue;
      }

      // No tool calls - LLM has finished or returned final response
      logger.debug("[Tool execution complete] LLM finished tool calling");
      break;
    } catch (e) {
      logger.error("[Tool execution error]", e);
      throw e;
    }
  }

  const totalExecutionMs = performance.now() - toolExecutionStartTime;

  // Send synthesis phase completion event
  const phaseCompleteEvent: PhaseCompleteEventData = {
    phase: "synthesis",
    durationMs: Math.round(totalExecutionMs),
  };
  send("phase:complete", phaseCompleteEvent);

  return {
    messages,
    cache,
    usedTools,
    timingInfo: {
      toolExecutionMs: Math.round(
        usedTools.reduce((sum, t) => sum + (t.tookMs || 0), 0)
      ),
      totalExecutionMs: Math.round(totalExecutionMs),
    },
  };
}

/**
 * Execute a single tool call
 */
async function executeToolCall<TName extends ToolName>(
  tc: {
    id: string;
    function: { name: string; arguments?: string };
  },
  name: TName,
  customerId: string,
  ownerUserId: string,
  cache: Partial<ToolDataMap>,
  messages: LlmMessage[],
  usedTools: ToolExecutionRecord[],
  send: SendEventFn
): Promise<void> {
  const endRecord: ToolExecutionRecord & { missing?: boolean } = { name };

  try {
    send("tool:start", { name });

    // Parse tool arguments
    let args: {
      customerId?: string;
      params?: Record<string, unknown>;
    } = {};
    try {
      args = JSON.parse(tc.function.arguments || "{}");
    } catch {
      logger.warn("[Tool args parse error]", { tool: name });
    }

    const cid = args.customerId || customerId;
    const params = { ...(args.params || {}), ownerUserId };

    // Invoke tool
    let envelope: ResponseEnvelope<ToolResult<TName>>;

    try {
      const schema = getToolSchema(name);
      const t0 = performance.now();
      const res = await invokeTool<ToolResult<TName>>(
        name,
        { customerId: cid, params },
        schema
      );
      const t1 = performance.now();

      endRecord.tookMs = Math.round(t1 - t0);

      if (res.ok) {
        usedTools.push({ name, tookMs: endRecord.tookMs });
        send("tool:complete", {
          name,
          tookMs: endRecord.tookMs,
          status: "success",
        });

        // Cache the result
        cacheToolResult(name, res, cache);

        // Check for missing data
        const data = res.data;
        if (
          data &&
          typeof data === "object" &&
          "missingData" in data &&
          (data as { missingData?: unknown }).missingData === true
        ) {
          endRecord.missing = true;
        }

        // Send patches for immediate UI updates
        if (name === "calculate_health" && cache.calculate_health) {
          send("patch", { health: cache.calculate_health });
        }
        if (name === "generate_email" && cache.generate_email) {
          send("patch", { emailDraft: cache.generate_email });
        }
        if (name === "generate_qbr_outline") {
          const sections = cache.generate_qbr_outline?.sections ?? [];
          send("patch", { actions: sections });
        }
      } else {
        endRecord.error = res.error?.code || "ERROR";
        usedTools.push({ name, error: endRecord.error });
        send("tool:complete", {
          name,
          status: "error",
          error: endRecord.error,
        });
      }

      envelope = res;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      endRecord.error = error.message;
      usedTools.push({ name, error: endRecord.error });
      send("tool:complete", {
        name,
        status: "error",
        error: endRecord.error,
      });
      envelope = {
        ok: false,
        data: null,
        error: { code: "EXCEPTION", message: error.message },
      };
    }

    // Add tool result to messages
    messages.push({
      role: "tool",
      tool_call_id: tc.id,
      content: JSON.stringify(envelope),
    });
  } catch (outerError) {
    const message =
      outerError instanceof Error ? outerError.message : String(outerError);
    logger.error("[Tool outer error]", { tool: name, error: message });

    endRecord.error = redactString(message || "UNKNOWN_ERROR");
    usedTools.push({ name, error: endRecord.error });

    // Still push a message to maintain consistency
    try {
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify({
          ok: false,
          data: null,
          error: { code: "FATAL", message: endRecord.error },
        }),
      });
    } catch {}
  } finally {
    // GUARANTEE tool:end always fires
    try {
      send("tool:end", endRecord);
    } catch (sendError) {
      logger.error("[Failed to send tool:end]", {
        tool: name,
        error: sendError,
      });
    }
  }
}

/**
 * Cache tool result in the cache object
 */
const toolCacheUpdaters: {
  [K in ToolName]: (
    cache: Partial<ToolDataMap>,
    data: ToolResult<K>
  ) => void;
} = {
  get_customer_usage: (cache, data) => {
    cache.get_customer_usage = data;
  },
  get_recent_tickets: (cache, data) => {
    cache.get_recent_tickets = data;
  },
  get_contract_info: (cache, data) => {
    cache.get_contract_info = data;
  },
  calculate_health: (cache, data) => {
    cache.calculate_health = data;
  },
  generate_email: (cache, data) => {
    cache.generate_email = data;
  },
  generate_qbr_outline: (cache, data) => {
    cache.generate_qbr_outline = data;
  },
};

function cacheToolResult<T extends ToolName>(
  name: T,
  res: EnvelopeSuccess<ToolResult<T>>,
  cache: Partial<ToolDataMap>
): void {
  toolCacheUpdaters[name](cache, res.data);
}

/**
 * Check if tool name is safe to log
 */
function isToolName(name: string): name is ToolName {
  return [
    "get_customer_usage",
    "get_recent_tickets",
    "get_contract_info",
    "calculate_health",
    "generate_email",
    "generate_qbr_outline",
  ].includes(name);
}
