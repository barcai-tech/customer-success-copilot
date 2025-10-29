import { z } from "zod";
import type { PlannerResult } from "@/src/agent/planner";

// Quick action types
export const QuickActionType = z.enum([
  "health",
  "renewal",
  "qbr",
  "email",
  "churn",
]);
export type QuickActionType = z.infer<typeof QuickActionType>;

// Evaluation result for a single quick action
export const EvalResultSchema = z.object({
  id: z.string(), // unique identifier
  timestamp: z.string(), // ISO 8601
  customerId: z.string(),
  customerName: z.string(),
  action: QuickActionType,
  status: z.enum(["success", "failure", "timeout"]),
  error: z.string().optional(),
  planSource: z.enum(["llm", "heuristic"]).optional(),
  planHint: z.string().optional(),
  durationMs: z.number(),
  result: z.record(z.string(), z.unknown()).optional(), // Full PlannerResult as JSON
  metrics: z.object({
    hasSummary: z.boolean(),
    hasActions: z.boolean(),
    hasHealth: z.boolean(),
    hasEmail: z.boolean(),
    toolsUsed: z.array(z.string()),
    toolErrors: z.array(z.string()),
  }),
});

export type EvalResult = z.infer<typeof EvalResultSchema>;

// Evaluation session (runs multiple quick actions)
export const EvalSessionSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  customerIds: z.array(z.string()),
  actions: z.array(QuickActionType),
  userId: z.string().optional(),
  results: z.array(EvalResultSchema),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    avgDurationMs: z.number(),
    successRate: z.number(), // 0-1
  }),
});

export type EvalSession = z.infer<typeof EvalSessionSchema>;

// Request to run evaluations
export const RunEvalRequestSchema = z.object({
  customerIds: z.array(z.string()).min(1),
  actions: z.array(QuickActionType).min(1),
  // When running evals for another user, include their Clerk user ID
  ownerUserId: z.string().optional(),
});

export type RunEvalRequest = z.infer<typeof RunEvalRequestSchema>;
