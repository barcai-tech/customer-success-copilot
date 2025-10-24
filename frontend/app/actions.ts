"use server";

import { runPlanner } from "@/src/agent/planner";
import { parseIntent } from "@/src/agent/intent";
import { runLlmPlanner } from "@/src/agent/llmPlanner";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/src/db/client";
import { companies } from "@/src/db/schema";
import { inArray } from "drizzle-orm";

export type PlannerActionState =
  | { ok: true; result: Awaited<ReturnType<typeof runPlanner>> }
  | { ok?: false; error: string }
  | undefined;

// Shared server action: list companies for current viewer (public + user-owned)
export async function listCompaniesForViewer() {
  const { userId } = await auth();
  const owners = userId ? ["public", userId] : ["public"];
  const rows = await db
    .select({ id: companies.externalId, name: companies.name, owner: companies.ownerUserId })
    .from(companies)
    .where(inArray(companies.ownerUserId, owners));
  // Deduplicate by id, prefer user-owned last write wins
  const map = new Map<string, { id: string; name: string }>();
  for (const r of rows) map.set(r.id, { id: r.id, name: r.name });
  return Array.from(map.values());
}

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

// Natural language entrypoint: resolve intent then run planner
export type CopilotFromPromptActionState =
  | { ok: true; result: Awaited<ReturnType<typeof runPlanner>> }
  | { ok?: false; error: string; hint?: string }
  | undefined;

export async function runCopilotFromPromptAction(
  prevState: CopilotFromPromptActionState,
  formData: FormData
): Promise<CopilotFromPromptActionState> {
  const message = String(formData.get("message") || "").trim();
  const selectedCustomerId = String(formData.get("selectedCustomerId") || "").trim();

  if (!message) return { error: "message required" };

  // Parse intent from free text
  const { customerId: parsedCustomerId, task } = await parseIntent(message);
  const customerId = parsedCustomerId || selectedCustomerId;

  if (!customerId) {
    return {
      error: "I couldn’t determine which customer you mean.",
      hint: "Select a customer or mention its name in your message.",
    };
  }

  try {
    const result = await runPlanner(customerId, task);
    if (task) result.task = task;
    result.planSource = "heuristic";
    return { ok: true, result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// LLM-driven planner with graceful fallback to heuristic planner
export type LlmPlannerActionState =
  | { ok: true; result: Awaited<ReturnType<typeof runPlanner>> }
  | { ok?: false; error: string; hint?: string }
  | undefined;

export async function runLlmPlannerFromPromptAction(
  prevState: LlmPlannerActionState,
  formData: FormData
): Promise<LlmPlannerActionState> {
  const message = String(formData.get("message") || "").trim();
  const selectedCustomerId = String(formData.get("selectedCustomerId") || "").trim();
  if (!message) return { error: "message required" };

  // Try LLM planner if configured; otherwise fallback to heuristic planner
  const hasKey = !!process.env["OPENAI_API_KEY"];
  const enabled = process.env["LLM_PLANNER_ENABLED"] !== "0"; // default on if key present
  let fallbackHint: string | undefined;

  // Resolve customer up-front to avoid mismatch between prose and tool calls
  let resolvedCustomerId: string | undefined;
  try {
    const parsed = await parseIntent(message);
    // Prefer explicit customer mentioned in the prompt; otherwise use UI-selected
    resolvedCustomerId = parsed.customerId || (selectedCustomerId || undefined);
  } catch {
    resolvedCustomerId = selectedCustomerId || undefined;
  }

  if (hasKey && enabled) {
    try {
      const result = await runLlmPlanner(message, resolvedCustomerId);
      result.planSource = "llm";
      return { ok: true, result };
    } catch (e) {
      fallbackHint = (e as Error).message || "LLM planner error";
    }
  } else {
    fallbackHint = !hasKey
      ? "Missing OPENAI_API_KEY"
      : "LLM planner disabled (LLM_PLANNER_ENABLED=0)";
  }

  // Fallback path uses simple intent parsing + deterministic planner
  const heuristic = await runCopilotFromPromptAction(undefined, formData);
  if (!heuristic?.ok) return heuristic as LlmPlannerActionState;

  // Annotate the result to indicate fallback reason
  const result = heuristic.result;
  result.planSource = "heuristic";
  if (fallbackHint) result.planHint = fallbackHint;
  // Attach selected customer context for display
  if (!result.customerId && (resolvedCustomerId || selectedCustomerId)) {
    result.customerId = resolvedCustomerId || selectedCustomerId;
  }
  return { ok: true, result } as LlmPlannerActionState;
}
