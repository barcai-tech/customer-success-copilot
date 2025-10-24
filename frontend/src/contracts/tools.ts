import { z } from "zod";

// Envelope
export const EnvelopeSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ ok: z.literal(true), data, error: z.null() });
export const EnvelopeError = z.object({
  ok: z.literal(false),
  data: z.null(),
  error: z.object({ code: z.string(), message: z.string() }),
});
export const Envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.union([EnvelopeSuccess(data), EnvelopeError]);

// Tool payloads
export const UsageSchema = z.object({
  trend: z.enum(["up", "down", "flat"]),
  avgDailyUsers: z.number(),
  sparkline: z.array(z.number()),
  missingData: z.boolean().optional(),
});

export const TicketsSchema = z.object({
  openTickets: z.number(),
  recentTickets: z.array(z.object({ id: z.string(), severity: z.string() })),
  missingData: z.boolean().optional(),
});

export const ContractSchema = z.object({
  renewalDate: z.string().optional().nullable(),
  arr: z.number().optional().default(0),
});

export const HealthSchema = z.object({
  score: z.number(),
  riskLevel: z.string(),
  signals: z.array(z.string()),
});

export const EmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export const QbrSchema = z.object({
  sections: z.array(z.string()),
});

export type Usage = z.infer<typeof UsageSchema>;
export type Tickets = z.infer<typeof TicketsSchema>;
export type Contract = z.infer<typeof ContractSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type Qbr = z.infer<typeof QbrSchema>;
