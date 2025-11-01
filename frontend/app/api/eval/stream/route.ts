/**
 * Evaluation Streaming Endpoint
 *
 * Server-side API route for streaming evaluation results.
 * Uses SSE (Server-Sent Events) for real-time test execution and progress updates.
 *
 * Justification for API endpoint (vs. Server Action):
 * - Server Actions cannot stream responses; they require full completion before returning
 * - SSE protocol requires persistent connection with chunked transfer encoding
 * - This endpoint runs multiple tests in sequence and streams progress events
 *
 * POST /api/eval/stream
 * Body: { customerIds: string[], actions: string[], selectedUserId?: string }
 * Returns: text/event-stream with JSON events
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import type {
  EvalResult,
  EvalSession,
  RunEvalRequest,
} from "@/src/contracts/eval";
import type {
  StreamErrorEvent,
  StreamTestStartEvent,
  StreamTestCompleteEvent,
  StreamFinalEvent,
} from "@/src/contracts/streaming";
import { db } from "@/src/db/client";
import { companies } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/src/lib/logger";
import { hasEvalAccess } from "@/src/lib/authz";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin-only endpoint: verify eval access
  const allowed = await hasEvalAccess();
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: RunEvalRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { customerIds, actions, ownerUserId: targetOwnerUserId } = body;

  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return NextResponse.json(
      { error: "customerIds must be a non-empty array" },
      { status: 400 }
    );
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    return NextResponse.json(
      { error: "actions must be a non-empty array" },
      { status: 400 }
    );
  }

  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch customer details from database
        // Determine which user's customers to use for this eval
        const ownerForEval = targetOwnerUserId || userId;
        const customerDetails = await db
          .select({
            id: companies.externalId,
            name: companies.name,
            ownerUserId: companies.ownerUserId,
          })
          .from(companies)
          .where(eq(companies.ownerUserId, ownerForEval));

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

            // Send test start event
            const testStartEvent: StreamTestStartEvent = {
              type: "test_start",
              resultId,
              customerId,
              customerName: customerInfo.name,
              action,
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(
              new TextEncoder().encode(
                `event: progress\ndata: ${JSON.stringify(testStartEvent)}\n\n`
              )
            );

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
                    // Signal to the copilot route that this is an eval-run and
                    // that ownerUserId override is intentional
                    "x-eval-run": "1",
                  },
                }
              );

              if (!response.ok) {
                const durationMs = Date.now() - startTime;
                results.push({
                  id: resultId,
                  timestamp: new Date().toISOString(),
                  customerId,
                  customerName: customerInfo.name,
                  action: action as unknown as EvalResult["action"],
                  status: "failure",
                  error: `Stream returned ${response.status}`,
                  durationMs,
                  metrics: {
                    hasSummary: false,
                    hasActions: false,
                    hasHealth: false,
                    hasEmail: false,
                    toolsUsed: [],
                    toolErrors: [],
                  },
                });

                // Send error event
                const errorEvent: StreamErrorEvent = {
                  type: "error",
                  error: `Stream returned ${response.status}`,
                  timestamp: new Date().toISOString(),
                  context: {
                    customerId,
                    customerName: customerInfo.name,
                    action,
                    resultId,
                  },
                };
                controller.enqueue(
                  new TextEncoder().encode(
                    `event: progress\ndata: ${JSON.stringify(errorEvent)}\n\n`
                  )
                );

                // Send completion event
                const testCompleteEvent: StreamTestCompleteEvent = {
                  type: "test_complete",
                  resultId,
                  customerId,
                  customerName: customerInfo.name,
                  action,
                  status: "failure",
                  durationMs,
                  result: {
                    results,
                    summary: calculateSummary(results),
                  },
                  timestamp: new Date().toISOString(),
                };
                controller.enqueue(
                  new TextEncoder().encode(
                    `event: progress\ndata: ${JSON.stringify(
                      testCompleteEvent
                    )}\n\n`
                  )
                );
                continue;
              }

              // Parse streaming response and collect final result
              // Also relay intermediate events to the client
              const finalResult = await parseStreamResponse(
                response,
                (event) => {
                  controller.enqueue(
                    new TextEncoder().encode(
                      `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                    )
                  );
                }
              );
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

              const status = finalResult.summary ? "success" : "failure";

              results.push({
                id: resultId,
                timestamp: new Date().toISOString(),
                customerId,
                customerName: customerInfo.name,
                action: action as unknown as EvalResult["action"],
                status,
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

              // Send completion event
              const testCompleteEvent: StreamTestCompleteEvent = {
                type: "test_complete",
                resultId,
                customerId,
                customerName: customerInfo.name,
                action,
                status,
                durationMs,
                result: {
                  results,
                  summary: calculateSummary(results),
                },
                timestamp: new Date().toISOString(),
              };
              controller.enqueue(
                new TextEncoder().encode(
                  `event: progress\ndata: ${JSON.stringify(
                    testCompleteEvent
                  )}\n\n`
                )
              );
            } catch (e) {
              const durationMs = Date.now() - startTime;
              const errorMsg = (e as Error).message;
              results.push({
                id: resultId,
                timestamp: new Date().toISOString(),
                customerId,
                customerName: customerInfo?.name || "",
                action: action as unknown as EvalResult["action"],
                status: "timeout",
                error: errorMsg,
                durationMs,
                metrics: {
                  hasSummary: false,
                  hasActions: false,
                  hasHealth: false,
                  hasEmail: false,
                  toolsUsed: [],
                  toolErrors: [],
                },
              });

              // Send error event
              const errorEvent: StreamErrorEvent = {
                type: "error",
                error: errorMsg,
                timestamp: new Date().toISOString(),
                context: {
                  customerId,
                  customerName: customerInfo?.name,
                  action,
                  resultId,
                },
              };
              controller.enqueue(
                new TextEncoder().encode(
                  `event: progress\ndata: ${JSON.stringify(errorEvent)}\n\n`
                )
              );

              // Send completion event
              const testCompleteEvent: StreamTestCompleteEvent = {
                type: "test_complete",
                resultId,
                customerId,
                customerName: customerInfo?.name || "",
                action,
                status: "timeout",
                durationMs,
                result: {
                  results,
                  summary: calculateSummary(results),
                },
                timestamp: new Date().toISOString(),
              };
              controller.enqueue(
                new TextEncoder().encode(
                  `event: progress\ndata: ${JSON.stringify(
                    testCompleteEvent
                  )}\n\n`
                )
              );
            }
          }
        }

        // Send final session
        const summary = calculateSummary(results);
        const session: EvalSession = {
          id: sessionId,
          timestamp: new Date().toISOString(),
          customerIds,
          actions: actions as unknown as EvalSession["actions"],
          userId: ownerForEval,
          results,
          summary,
        };

        const finalEvent: StreamFinalEvent = {
          type: "final",
          session,
          timestamp: new Date().toISOString(),
        };
        controller.enqueue(
          new TextEncoder().encode(
            `event: final\ndata: ${JSON.stringify(finalEvent)}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

interface Summary {
  total: number;
  passed: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
}

function calculateSummary(results: EvalResult[]): Summary {
  const passed = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status !== "success").length;
  const avgDurationMs =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.durationMs, 0) / results.length
      : 0;

  return {
    total: results.length,
    passed,
    failed,
    avgDurationMs,
    successRate: results.length > 0 ? passed / results.length : 0,
  };
}

function generatePromptForAction(action: string, customerName: string): string {
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
  response: Response,
  onIntermediateEvent?: (event: {
    type: string;
    [key: string]: unknown;
  }) => void
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

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("event: final")) {
          continue;
        }
        if (line.startsWith("event: ")) {
          // Relay intermediate events (tool:complete, phase:complete, etc)
          const eventType = line.slice(7); // Remove "event: " prefix
          const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
          if (nextLine && nextLine.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(nextLine.slice(6));
              if (onIntermediateEvent) {
                onIntermediateEvent({ type: eventType, ...eventData });
              }
            } catch (e) {
              logger.error("Failed to parse intermediate event:", e);
            }
          }
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
