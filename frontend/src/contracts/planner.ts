import { z } from "zod";
import { HealthSchema } from "@/src/contracts/tools";

// Schema for the explicit planning phase (Hybrid Planning approach)
export const PlanStepSchema = z.object({
  step: z.number(),
  description: z.string(),
  tool: z.string(),
  reasoning: z.string(),
});

export const ExecutionPlanSchema = z.object({
  plan: z.array(PlanStepSchema),
  summary: z.string().optional(), // Optional initial summary of what will be done
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const PlannerResultSchema = z.object({
  summary: z.string().optional(),
  health: HealthSchema.optional(),
  actions: z.array(z.string()).optional(),
  emailDraft: z.object({ subject: z.string(), body: z.string() }).optional(),
  // Be permissive with usedTools coming from the LLM (we overwrite it later)
  usedTools: z.array(z.any()).optional().default([]),
  notes: z.string().optional(),
  // Timing information for performance analysis
  timingInfo: z
    .object({
      planningPhaseMs: z.number().optional(),
      toolExecutionMs: z.number().optional(),
      totalExecutionMs: z.number().optional(),
    })
    .optional(),
  // Accept either a structured array or an array of strings and normalize to objects
  decisionLog: z
    .union([
      z.array(
        z.object({
          step: z.number().optional(),
          tool: z.string().optional(),
          action: z.string().optional(),
          reason: z.string(),
        })
      ),
      z.array(z.string()),
    ])
    .optional()
    .transform((v) => {
      if (!v) return v;
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") {
        return (v as string[]).map((reason) => ({ reason }));
      }
      return v;
    }) as z.ZodType<
    | Array<{
        step?: number;
        tool?: string;
        action?: string;
        reason: string;
      }>
    | undefined
  >,
  planSource: z.enum(["llm", "heuristic"]).optional(),
  planHint: z.string().optional(),
  planSummary: z.string().optional(), // Hybrid planning: summary of planned execution
  customerId: z.string().optional(),
  task: z.enum(["health", "renewal", "qbr", "email", "churn"]).optional(),
});

export type PlannerResultJson = z.infer<typeof PlannerResultSchema>;
