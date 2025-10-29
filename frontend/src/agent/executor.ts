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
  ToolSchemaMap,
  ToolExecutionRecord,
  SendEventFn,
  PhaseCompleteEventData,
} from "./types";
import { TOOL_SCHEMAS } from "./types";
import { logger } from "@/src/lib/logger";
import { redactString } from "./synthesizer";
import type { PlannerResultJson } from "@/src/contracts/planner";

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
            await executeToolCall(
              tc,
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
async function executeToolCall(
  tc: {
    id: string;
    function: { name: string; arguments?: string };
  },
  customerId: string,
  ownerUserId: string,
  cache: Partial<ToolDataMap>,
  messages: LlmMessage[],
  usedTools: ToolExecutionRecord[],
  send: SendEventFn
): Promise<void> {
  const name = tc.function.name as ToolName;

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
    let envelope:
      | ResponseEnvelope<unknown>
      | { ok: false; data: null; error: { code: string; message: string } };

    try {
      const schema = TOOL_SCHEMAS[name];
      const t0 = performance.now();
      const res = await invokeTool(name, { customerId: cid, params }, schema);
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
        try {
          const d = (res as EnvelopeSuccess<Record<string, unknown>>).data as
            | Record<string, unknown>
            | undefined;
          if (d && (d as any).missingData) {
            endRecord.missing = true;
          }
        } catch {}

        // Send patches for immediate UI updates
        if (name === "calculate_health")
          send("patch", { health: cache.calculate_health });
        if (name === "generate_email")
          send("patch", { emailDraft: cache.generate_email });
        if (name === "generate_qbr_outline")
          send("patch", {
            actions: (cache.generate_qbr_outline as any)?.sections || [],
          });
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
      endRecord.error = (e as Error).message;
      usedTools.push({ name, error: endRecord.error });
      send("tool:complete", {
        name,
        status: "error",
        error: endRecord.error,
      });
      envelope = {
        ok: false,
        data: null,
        error: { code: "EXCEPTION", message: (e as Error).message },
      };
    }

    // Add tool result to messages
    messages.push({
      role: "tool",
      tool_call_id: tc.id,
      content: JSON.stringify(envelope),
    });
  } catch (outerError) {
    const safeName = isSafeToolName(name) ? name : "unknown";
    logger.error("[Tool outer error]", { tool: safeName, error: outerError });

    endRecord.error = redactString(
      (outerError as Error).message || "UNKNOWN_ERROR"
    );
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
      const safeName = isSafeToolName(name) ? name : "unknown";
      logger.error("[Failed to send tool:end]", {
        tool: safeName,
        error: sendError,
      });
    }
  }
}

/**
 * Cache tool result in the cache object
 */
function cacheToolResult(
  name: ToolName,
  res: EnvelopeSuccess<unknown>,
  cache: Partial<ToolDataMap>
): void {
  switch (name) {
    case "get_customer_usage":
      cache.get_customer_usage = res.data as any;
      break;
    case "get_recent_tickets":
      cache.get_recent_tickets = res.data as any;
      break;
    case "get_contract_info":
      cache.get_contract_info = res.data as any;
      break;
    case "calculate_health":
      cache.calculate_health = res.data as any;
      break;
    case "generate_email":
      cache.generate_email = res.data as any;
      break;
    case "generate_qbr_outline":
      cache.generate_qbr_outline = res.data as any;
      break;
  }
}

/**
 * Check if tool name is safe to log
 */
function isSafeToolName(name: string): name is ToolName {
  return [
    "get_customer_usage",
    "get_recent_tickets",
    "get_contract_info",
    "calculate_health",
    "generate_email",
    "generate_qbr_outline",
  ].includes(name);
}
