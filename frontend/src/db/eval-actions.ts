"use server";

import { db } from "@/src/db/client";
import { evalSessions, evalResults, execSteps } from "@/src/db/schema";
import { auth } from "@clerk/nextjs/server";
import type { EvalSession } from "@/src/contracts/eval";
import type { ExecutionStep } from "@/src/store/eval-detail-store";

/**
 * Calculate timedOut count from results
 */
function calculateTimedOut(results: EvalSession["results"]): number {
  return results.filter((r) => r.status === "timeout").length;
}

/**
 * Save an evaluation session to the database
 */
export async function saveEvalSession(session: EvalSession) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  console.log(
    "[saveEvalSession] Saving session with",
    session.results.length,
    "results"
  );

  // Calculate timedOut from results
  const timedOut = session.results.filter((r) => r.status === "timeout").length;

  // Insert session
  const insertedSession = await db
    .insert(evalSessions)
    .values({
      ownerUserId: userId,
      totalTests: session.summary.total,
      passedTests: session.summary.passed,
      failedTests: session.summary.failed,
      timedOutTests: timedOut,
      successRate: Math.round(session.summary.successRate * 100),
      avgDurationMs: Math.round(session.summary.avgDurationMs),
    })
    .returning({ id: evalSessions.id });

  const sessionId = insertedSession[0].id;
  console.log("[saveEvalSession] Created session with id:", sessionId);

  // Insert results and map temporary IDs to database IDs
  const resultIdMap = new Map<string, string>();
  for (const result of session.results) {
    try {
      const insertedResult = await db
        .insert(evalResults)
        .values({
          sessionId,
          customerId: result.customerId,
          customerName: result.customerName,
          action: result.action,
          status: result.status,
          durationMs: result.durationMs,
          error: result.error,
          planSource: result.planSource,
          planHint: result.planHint,
          result: result.result as Record<string, unknown> | null,
          metrics: result.metrics as Record<string, unknown>,
        })
        .returning({ id: evalResults.id });

      const dbResultId = insertedResult[0].id;
      resultIdMap.set(result.id, dbResultId);
      console.log(
        "[saveEvalSession] Saved result:",
        result.id,
        "->",
        dbResultId
      );
    } catch (error) {
      console.error("[saveEvalSession] Error saving result:", error);
      throw error;
    }
  }

  console.log("[saveEvalSession] Successfully saved session and all results");
  return { sessionId, resultIdMap };
}

/**
 * Save execution steps for a result to the database
 */
export async function saveExecutionSteps(
  resultId: string,
  steps: ExecutionStep[]
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  console.log(
    `[saveExecutionSteps] Saving ${steps.length} steps for result ${resultId}`
  );

  // Insert steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    try {
      await db.insert(execSteps).values({
        resultId: resultId as any, // resultId from DB is a UUID string
        title: step.title,
        description: step.description,
        level: step.level,
        durationMs: step.durationMs,
        orderIndex: i,
      });
      console.log(
        `[saveExecutionSteps] Saved step ${i + 1}/${steps.length}: ${
          step.title
        }`
      );
    } catch (error) {
      console.error(`[saveExecutionSteps] Error saving step ${i}:`, error);
      throw error;
    }
  }

  console.log(
    `[saveExecutionSteps] Successfully saved all ${steps.length} steps`
  );
}

/**
 * Get eval sessions for the current user
 */
export async function getEvalSessions(limit = 50) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const sessions = await db.query.evalSessions.findMany({
    where: (s, { eq }) => eq(s.ownerUserId, userId),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
    limit,
  });

  return sessions;
}

/**
 * Get results for a specific eval session
 */
export async function getEvalSessionResults(sessionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const results = await db.query.evalResults.findMany({
    where: (r, { eq }) => eq(r.sessionId, sessionId),
    with: {
      execSteps: {
        orderBy: (steps, { asc }) => [asc(steps.orderIndex)],
      },
    },
  });

  return results;
}

/**
 * Get execution steps for a specific eval result
 */
export async function getExecutionSteps(resultId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const steps = await db.query.execSteps.findMany({
    where: (s, { eq }) => eq(s.resultId, resultId),
    orderBy: (s, { asc }) => [asc(s.orderIndex)],
  });

  return steps;
}
