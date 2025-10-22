import { z } from "zod";
import { HealthSchema } from "@/src/contracts/tools";

export const PlannerResultSchema = z.object({
  summary: z.string().optional(),
  health: HealthSchema.optional(),
  actions: z.array(z.string()).optional(),
  // Accept partial emailDraft from the LLM and clean it up post-parse
  emailDraft: z
    .object({ subject: z.string().optional(), body: z.string().optional() })
    .partial()
    .optional(),
  // Be permissive with usedTools coming from the LLM (we overwrite it later)
  usedTools: z.array(z.any()).optional().default([]),
  notes: z.string().optional(),
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
    }),
  planSource: z.enum(["llm", "heuristic"]).optional(),
  planHint: z.string().optional(),
  customerId: z.string().optional(),
  task: z.enum(["health","renewal","qbr","email","churn"]).optional(),
});

export type PlannerResultJson = z.infer<typeof PlannerResultSchema>;
