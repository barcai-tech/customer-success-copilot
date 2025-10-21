"use server";

import { runPlanner } from "@/src/agent/planner";

export type PlannerActionState =
  | { ok: true; result: Awaited<ReturnType<typeof runPlanner>> }
  | { ok?: false; error: string }
  | undefined;

export async function runPlannerAction(prevState: PlannerActionState, formData: FormData): Promise<PlannerActionState> {
  const customerId = String(formData.get("customerId") || "").trim();
  if (!customerId) return { error: "customerId required" };
  try {
    const result = await runPlanner(customerId);
    return { ok: true, result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

