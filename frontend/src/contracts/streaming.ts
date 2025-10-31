import { z } from "zod";
import { EvalResultSchema, QuickActionType } from "./eval";

// Streaming event types for structured error and phase events

/**
 * Error event sent during streaming
 */
export const StreamErrorEventSchema = z.object({
  type: z.literal("error"),
  error: z.string(),
  timestamp: z.string(), // ISO 8601
  context: z
    .object({
      customerId: z.string().optional(),
      customerName: z.string().optional(),
      action: QuickActionType.optional(),
      resultId: z.string().optional(),
    })
    .optional(),
});

export type StreamErrorEvent = z.infer<typeof StreamErrorEventSchema>;

/**
 * Phase completion event (planning, synthesis, etc.)
 */
export const StreamPhaseEventSchema = z.object({
  type: z.literal("phase:complete"),
  phase: z.enum(["planning", "synthesis"]),
  durationMs: z.number(),
  timestamp: z.string(), // ISO 8601
});

export type StreamPhaseEvent = z.infer<typeof StreamPhaseEventSchema>;

/**
 * Tool completion event
 */
export const StreamToolEventSchema = z.object({
  type: z.literal("tool:complete"),
  name: z.string(),
  status: z.enum(["success", "failure"]),
  tookMs: z.number(),
  error: z.string().optional(),
  timestamp: z.string(), // ISO 8601
});

export type StreamToolEvent = z.infer<typeof StreamToolEventSchema>;

/**
 * Test start event
 */
export const StreamTestStartEventSchema = z.object({
  type: z.literal("test_start"),
  resultId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  action: QuickActionType,
  timestamp: z.string(), // ISO 8601
});

export type StreamTestStartEvent = z.infer<typeof StreamTestStartEventSchema>;

/**
 * Test completion event
 */
export const StreamTestCompleteEventSchema = z.object({
  type: z.literal("test_complete"),
  resultId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  action: QuickActionType,
  status: z.enum(["success", "failure", "timeout"]),
  durationMs: z.number(),
  result: z
    .object({
      results: z.array(EvalResultSchema),
      summary: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
        avgDurationMs: z.number(),
        successRate: z.number(),
      }),
    })
    .optional(),
  timestamp: z.string(), // ISO 8601
});

export type StreamTestCompleteEvent = z.infer<
  typeof StreamTestCompleteEventSchema
>;

/**
 * Final session event
 */
export const StreamFinalEventSchema = z.object({
  type: z.literal("final"),
  session: z.record(z.string(), z.unknown()), // Full EvalSession
  timestamp: z.string(), // ISO 8601
});

export type StreamFinalEvent = z.infer<typeof StreamFinalEventSchema>;

/**
 * Union of all streaming events
 */
export const StreamEventSchema = z.union([
  StreamErrorEventSchema,
  StreamPhaseEventSchema,
  StreamToolEventSchema,
  StreamTestStartEventSchema,
  StreamTestCompleteEventSchema,
  StreamFinalEventSchema,
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;

/**
 * Type for streaming event callbacks
 */
export type StreamEventCallback = (event: StreamEvent) => void;
