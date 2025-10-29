/**
 * Centralized type definitions for the Copilot agent
 * Used across planning, execution, and synthesis phases
 */

import type { LlmMessage } from "@/src/llm/provider";
import type {
  Usage,
  Tickets,
  Contract,
  Health,
  Email,
  Qbr,
} from "@/src/contracts/tools";
import type { TaskType } from "@/src/store/copilot-store";
import { z } from "zod";

/**
 * Schemas for all tool outputs (for validation)
 */
import {
  UsageSchema,
  TicketsSchema,
  ContractSchema,
  HealthSchema,
  EmailSchema,
  QbrSchema,
} from "@/src/contracts/tools";

/**
 * Tool name enum
 */
export type ToolName =
  | "get_customer_usage"
  | "get_recent_tickets"
  | "get_contract_info"
  | "calculate_health"
  | "generate_email"
  | "generate_qbr_outline";

/**
 * Cache of tool results during execution
 */
export type ToolDataMap = {
  get_customer_usage?: Usage;
  get_recent_tickets?: Tickets;
  get_contract_info?: Contract;
  calculate_health?: Health;
  generate_email?: Email;
  generate_qbr_outline?: Qbr;
};

export type ToolResult<T extends ToolName> = NonNullable<ToolDataMap[T]>;

/**
 * Mapping of tool names to their output schemas
 */
export type ToolSchemaMap = {
  [K in ToolName]: z.ZodType<ToolResult<K>>;
};

export const TOOL_SCHEMAS = {
  get_customer_usage: UsageSchema,
  get_recent_tickets: TicketsSchema,
  get_contract_info: ContractSchema,
  calculate_health: HealthSchema,
  generate_email: EmailSchema,
  generate_qbr_outline: QbrSchema,
} satisfies ToolSchemaMap;

/**
 * Tool execution metadata
 */
export interface ToolExecutionRecord {
  name: string;
  tookMs?: number;
  error?: string;
}

/**
 * Execution plan step (from LLM planning phase)
 */
export interface ExecutionPlanStep {
  step: number;
  tool: ToolName;
  description: string;
  reasoning: string;
}

/**
 * Decision log entry (simplified for frontend)
 */
export interface DecisionLogEntry {
  step: number;
  tool: ToolName;
  reason: string;
}

/**
 * Timing information for performance analysis
 */
export interface TimingInfo {
  planningPhaseMs: number;
  toolExecutionMs: number;
  totalExecutionMs: number;
}

/**
 * Events sent to frontend via SSE
 */
export type StreamEventType =
  | "plan"
  | "phase:complete"
  | "tool:start"
  | "tool:complete"
  | "tool:end"
  | "patch"
  | "final"
  | "error";

/**
 * Plan event payload
 */
export interface PlanEventData {
  planSource: "llm" | "heuristic";
  customerId?: string;
  task?: TaskType | null;
  decisionLog?: DecisionLogEntry[];
  planSummary?: string;
}

/**
 * Phase completion event payload
 */
export interface PhaseCompleteEventData {
  phase: "planning" | "synthesis";
  durationMs: number;
}

/**
 * Tool start event payload
 */
export interface ToolStartEventData {
  name: ToolName;
}

/**
 * Tool complete event payload
 */
export interface ToolCompleteEventData {
  name: ToolName;
  tookMs?: number;
  status: "success" | "error";
  error?: string;
}

/**
 * Tool end event payload
 */
export interface ToolEndEventData extends ToolExecutionRecord {
  missing?: boolean;
}

/**
 * Patch event payload (incremental updates)
 */
export interface PatchEventData {
  health?: Health;
  emailDraft?: Email;
  actions?: string[];
}

/**
 * Final result event payload
 */
export interface FinalEventData {
  planSource: "llm" | "heuristic";
  planHint?: string;
  summary?: string;
  health?: Health;
  actions?: string[];
  emailDraft?: Email;
  notes?: string;
  usedTools: ToolExecutionRecord[];
  decisionLog?: Array<{
    reason: string;
    step?: number;
    tool?: string;
    action?: string;
  }>;
  customerId?: string;
  task?: TaskType;
  timingInfo?: TimingInfo;
}

/**
 * Type for function that sends events to frontend
 */
export type SendEventFn = (type: StreamEventType, data: unknown) => void;

/**
 * Query parameters for /api/copilot/stream
 */
export interface CopilotStreamQuery {
  message: string;
  selectedCustomerId?: string;
  ownerUserId?: string;
  eval?: string;
}

/**
 * Re-export LlmMessage for convenience
 */
export type { LlmMessage };

/**
 * Re-export TaskType for convenience
 */
export type { TaskType };
