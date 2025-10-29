"use server";

import { db } from "@/src/db/client";
import { evalSessions, evalResults, execSteps } from "@/src/db/schema";
import { auth } from "@clerk/nextjs/server";
import type { EvalSession } from "@/src/contracts/eval";
import type { ExecutionStep } from "@/src/store/eval-detail-store";
import { logger } from "@/src/lib/logger";

/**
 * Save an evaluation session to the database
 */
export async function saveEvalSession(session: EvalSession) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  logger.debug("[saveEvalSession] Saving session", {
    results: session.results.length,
  });

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
  logger.debug("[saveEvalSession] Created session", { sessionId });

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
      logger.debug("[saveEvalSession] Saved result", {
        resultId: result.id,
        dbId: dbResultId,
      });
    } catch (error) {
      logger.error("[saveEvalSession] Error saving result:", error);
      throw error;
    }
  }

  logger.debug("[saveEvalSession] Successfully saved session and all results");
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

  logger.debug("[saveExecutionSteps] Saving steps", {
    resultId,
    count: steps.length,
  });

  // Insert steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    try {
      await db.insert(execSteps).values({
        resultId,
        title: step.title,
        description: step.description,
        level: step.level,
        durationMs: step.durationMs,
        orderIndex: i,
      });
      logger.debug("[saveExecutionSteps] Saved step", {
        ordinal: i + 1,
        total: steps.length,
        title: step.title,
      });
    } catch (error) {
      logger.error(`[saveExecutionSteps] Error saving step ${i}:`, error);
      throw error;
    }
  }

  logger.debug("[saveExecutionSteps] Successfully saved all steps", {
    count: steps.length,
  });
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
