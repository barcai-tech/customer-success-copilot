"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { db } from "@/src/db/client";
import {
  companies,
  contracts,
  ticketSummaries,
  usageSummaries,
} from "@/src/db/schema";
import { and, eq } from "drizzle-orm";
import {
  RunEvalRequestSchema,
  EvalSessionSchema,
  type EvalSession,
  type EvalResult,
  type QuickActionType,
} from "@/src/contracts/eval";
import { requireEvalAccess } from "@/src/lib/authz";
import { logger } from "@/src/lib/logger";

// ============================================================================
// Validation Schemas
// ============================================================================

const ClerkUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

export type ClerkUser = z.infer<typeof ClerkUserSchema>;

const CustomerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerUserId: z.string(),
  trend: z.string().nullable().optional(),
  openTickets: z.number().nullable().optional(),
  renewalDate: z.instanceof(Date).nullable().optional(),
});

export type CustomerRow = z.infer<typeof CustomerRowSchema>;

// ============================================================================
// User and Customer Fetching
// ============================================================================

/**
 * Fetch all Clerk users accessible to the current user
 */
export async function listAllUsers(): Promise<ClerkUser[]> {
  try {
    await requireEvalAccess();
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 100 });

    const formattedUsers = users.data
      .map((user) => ({
        id: user.id,
        name:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.primaryEmailAddress?.emailAddress || "Unknown",
        email: user.primaryEmailAddress?.emailAddress,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return z.array(ClerkUserSchema).parse(formattedUsers);
  } catch (error) {
    logger.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * Fetch customers assigned to a specific user
 */
export async function getCustomersForUser(
  targetUserId: string
): Promise<CustomerRow[]> {
  try {
    await requireEvalAccess();
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Validate input
    const validatedUserId = z.string().min(1).parse(targetUserId);

    // Fetch customers for the specified user
    const rows = await db
      .select({
        id: companies.externalId,
        name: companies.name,
        ownerUserId: companies.ownerUserId,
        trend: usageSummaries.trend,
        openTickets: ticketSummaries.openTickets,
        renewalDate: contracts.renewalDate,
      })
      .from(companies)
      .leftJoin(
        usageSummaries,
        and(
          eq(usageSummaries.companyExternalId, companies.externalId),
          eq(usageSummaries.ownerUserId, companies.ownerUserId)
        )
      )
      .leftJoin(
        ticketSummaries,
        and(
          eq(ticketSummaries.companyExternalId, companies.externalId),
          eq(ticketSummaries.ownerUserId, companies.ownerUserId)
        )
      )
      .leftJoin(
        contracts,
        and(
          eq(contracts.companyExternalId, companies.externalId),
          eq(contracts.ownerUserId, companies.ownerUserId)
        )
      )
      .where(eq(companies.ownerUserId, validatedUserId));

    // Deduplicate by id
    const map = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!map.has(r.id)) map.set(r.id, r);

    return z.array(CustomerRowSchema).parse(Array.from(map.values()));
  } catch (error) {
    logger.error("Error fetching customers:", error);
    throw new Error("Failed to fetch customers");
  }
}

// ============================================================================
// Evaluation Execution
// ============================================================================

/**
 * Run evaluation for specified customers and actions
 */
export async function runEvaluation(input: unknown): Promise<EvalSession> {
  try {
    await requireEvalAccess();
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Validate input
    const { customerIds, actions } = RunEvalRequestSchema.parse(input);

    // Fetch customer details from database
    const customerDetails = await db
      .select({
        id: companies.externalId,
        name: companies.name,
        ownerUserId: companies.ownerUserId,
      })
      .from(companies)
      .where(eq(companies.ownerUserId, userId));

    const customerMap = new Map(
      customerDetails.map((c) => [
        c.id,
        { name: c.name, ownerUserId: c.ownerUserId },
      ])
    );

    // Run evaluations
    const sessionId = randomUUID();
    const results: EvalResult[] = [];

    for (const customerId of customerIds) {
      const customerInfo = customerMap.get(customerId);
      if (!customerInfo) continue;

      for (const action of actions) {
        const startTime = Date.now();
        const resultId = randomUUID();

        try {
          // Trigger the quick action via the streaming endpoint
          const searchParams = new URLSearchParams({
            message: generatePromptForAction(action, customerInfo.name),
            selectedCustomerId: customerId,
            ownerUserId: customerInfo.ownerUserId,
          });

          const response = await fetch(
            `${getBaseUrl()}/api/copilot/stream?${searchParams}`,
            {
              method: "GET",
              headers: {
                "User-Agent": "EvalRunner/1.0",
              },
            }
          );

          if (!response.ok) {
            results.push({
              id: resultId,
              timestamp: new Date().toISOString(),
              customerId,
              customerName: customerInfo.name,
              action,
              status: "failure",
              error: `Stream returned ${response.status}`,
              durationMs: Date.now() - startTime,
              metrics: {
                hasSummary: false,
                hasActions: false,
                hasHealth: false,
                hasEmail: false,
                toolsUsed: [],
                toolErrors: [],
              },
            });
            continue;
          }

          // Parse streaming response and collect final result
          const finalResult = await parseStreamResponse(response);

          const durationMs = Date.now() - startTime;
          const toolsUsed = Array.isArray(finalResult.usedTools)
            ? finalResult.usedTools
                .filter((t: unknown) => {
                  const tool = t as Record<string, unknown>;
                  return !tool.error;
                })
                .map((t: unknown) => {
                  const tool = t as Record<string, unknown>;
                  return String(tool.name);
                })
            : [];
          const toolErrors = Array.isArray(finalResult.usedTools)
            ? finalResult.usedTools
                .filter((t: unknown) => {
                  const tool = t as Record<string, unknown>;
                  return tool.error;
                })
                .map((t: unknown) => {
                  const tool = t as Record<string, unknown>;
                  return `${String(tool.name)}: ${String(tool.error)}`;
                })
            : [];

          const metrics = {
            hasSummary: !!finalResult.summary,
            hasActions: Array.isArray(finalResult.actions)
              ? finalResult.actions.length > 0
              : false,
            hasHealth: !!finalResult.health,
            hasEmail: !!finalResult.emailDraft,
            toolsUsed,
            toolErrors,
          };

          results.push({
            id: resultId,
            timestamp: new Date().toISOString(),
            customerId,
            customerName: customerInfo.name,
            action,
            status: finalResult.summary ? "success" : "failure",
            error:
              typeof finalResult.planHint === "string"
                ? finalResult.planHint
                : undefined,
            planSource:
              (finalResult.planSource as "llm" | "heuristic") || undefined,
            planHint:
              typeof finalResult.planHint === "string"
                ? finalResult.planHint
                : undefined,
            durationMs,
            result: finalResult as Record<string, unknown>,
            metrics,
          });
        } catch (e) {
          results.push({
            id: resultId,
            timestamp: new Date().toISOString(),
            customerId,
            customerName: customerInfo.name,
            action,
            status: "timeout",
            error: (e as Error).message,
            durationMs: Date.now() - startTime,
            metrics: {
              hasSummary: false,
              hasActions: false,
              hasHealth: false,
              hasEmail: false,
              toolsUsed: [],
              toolErrors: [],
            },
          });
        }
      }
    }

    // Calculate summary
    const passed = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status !== "success").length;
    const avgDurationMs =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.durationMs, 0) / results.length
        : 0;

    const session: EvalSession = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      customerIds,
      actions,
      userId,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        avgDurationMs,
        successRate: results.length > 0 ? passed / results.length : 0,
      },
    };

    // Validate output
    return EvalSessionSchema.parse(session);
  } catch (error) {
    logger.error("Error running evaluation:", error);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.message}`);
    }
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generatePromptForAction(
  action: QuickActionType,
  customerName: string
): string {
  switch (action) {
    case "health":
      return `What's the health status of ${customerName}?`;
    case "renewal":
      return `Generate a renewal brief for ${customerName}`;
    case "qbr":
      return `Create a QBR outline for ${customerName}`;
    case "email":
      return `Draft a check-in email for ${customerName}`;
    case "churn":
      return `Analyze churn risk for ${customerName}`;
    default:
      return `Analyze ${customerName}`;
  }
}

function getBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

async function parseStreamResponse(
  response: Response
): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) return {};

  let finalResult: Record<string, unknown> = {};
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: final")) {
          continue;
        }
        if (line.startsWith("data: ")) {
          try {
            finalResult = JSON.parse(line.slice(6));
          } catch (e) {
            logger.error("Failed to parse final result:", e);
          }
        }
      }
    }
  } catch (e) {
    logger.error("Error reading stream:", e);
  }

  return finalResult;
}
