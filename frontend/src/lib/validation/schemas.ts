import { z } from "zod";
import { sanitizeString } from "./sanitizers";
import { hasXSSPatterns } from "./xss";

/**
 * All Zod Schemas
 * Used for validation throughout the application
 */

// ============================================================================
// Basic Schemas
// ============================================================================

/**
 * Generic text schema with configurable max length
 */
export const textSchema = (maxLength = 500) =>
  z
    .string()
    .transform(sanitizeString)
    .pipe(
      z.string().max(maxLength, `Text too long (max ${maxLength} characters)`)
    );

/**
 * External ID schema
 * Only allows lowercase alphanumeric, hyphens, and underscores
 */
export const externalIdSchema = z
  .string()
  .transform((val) =>
    val
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9\-_]/g, "") // Remove other special characters
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .slice(0, 100)
  )
  .pipe(z.string().min(1, "External ID cannot be empty"));

/**
 * Company name schema
 * Blocks XSS patterns and enforces length limits
 */
export const companyNameSchema = z
  .string()
  .transform(sanitizeString)
  .pipe(
    z
      .string()
      .min(1, "Company name is required")
      .max(200, "Company name too long (max 200 characters)")
      .refine((val) => !hasXSSPatterns(val), {
        message:
          "Company name contains forbidden characters. Please use only standard business names.",
      })
  );

/**
 * ISO date schema
 * Validates and normalizes to ISO 8601 format
 */
export const isoDateSchema = z
  .string()
  .transform(sanitizeString)
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, "Date must be in YYYY-MM-DD format")
      .refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid date" }
      )
      .transform((val) => new Date(val).toISOString())
  );

/**
 * Number schema with optional min/max bounds
 */
export const numberSchema = (min?: number, max?: number) => {
  let schema = z.number().finite("Must be a valid number");

  if (typeof min === "number") {
    schema = schema.min(min, `Must be at least ${min}`);
  }

  if (typeof max === "number") {
    schema = schema.max(max, `Must be at most ${max}`);
  }

  return schema;
};

/**
 * Number array schema (for sparkline data)
 * Filters out non-finite values
 */
export const numberArraySchema = (maxLength = 100) =>
  z
    .array(z.unknown())
    .max(maxLength, `Array too long (max ${maxLength})`)
    .transform((arr) =>
      arr
        .map((item) => {
          const num = Number(item);
          return Number.isFinite(num) ? num : null;
        })
        .filter((n): n is number => n !== null)
    );

/**
 * Ticket schema
 * Validates ticket structure with id and severity
 */
export const ticketSchema = z.object({
  id: textSchema(100),
  severity: textSchema(50),
});

/**
 * Tickets array schema
 * Max 50 tickets
 */
export const ticketsArraySchema = z
  .array(ticketSchema)
  .max(50, "Too many tickets (max 50)");

// ============================================================================
// Domain Schemas (for database operations)
// ============================================================================

/**
 * Customer creation schema
 */
export const createCustomerSchema = z.object({
  name: companyNameSchema,
  externalId: z.string().transform((val) => {
    return externalIdSchema.parse(val);
  }),
});

/**
 * Contract upsert schema
 */
export const upsertContractSchema = z.object({
  customerId: z.string().min(1),
  renewalDate: isoDateSchema,
  arr: numberSchema(0, 1_000_000_000),
});

/**
 * Tickets upsert schema
 */
export const upsertTicketsSchema = z.object({
  customerId: z.string().min(1),
  tickets: ticketsArraySchema,
});

/**
 * Usage upsert schema
 */
export const upsertUsageSchema = z.object({
  customerId: z.string().min(1),
  sparkline: numberArraySchema(365),
});

// ============================================================================
// Form Schemas
// ============================================================================

/**
 * Complete customer form schema
 * Used for the edit/create customer modal in CustomersTable
 */
export const customerFormSchema = z.object({
  // Company Information
  name: companyNameSchema,
  externalId: z.string().default(""),

  // Contract Information
  renewalDate: z.string().optional(),
  arr: z.union([z.string(), z.number()]).default(0),

  // Tickets
  tickets: z
    .array(
      z.object({
        id: z.string().min(1, "Ticket ID required"),
        severity: z.enum(["low", "medium", "high"], {
          message: "Select a severity level",
        }),
      })
    )
    .max(50, "Too many tickets (max 50)")
    .default([]),

  // Usage (sparkline as string for form input)
  sparkline: z.string().default(""),
});

/**
 * Transformed schema for server actions
 */
export const customerFormSchemaTransformed = customerFormSchema.transform(
  (data) => {
    const externalId = data.externalId || externalIdSchema.parse(data.name);

    const renewalDate = data.renewalDate
      ? isoDateSchema.parse(data.renewalDate)
      : undefined;

    // Parse ARR from string or number
    const arrStr = String(data.arr).replace(/[$,]/g, "");
    const arr = numberSchema(0, 1_000_000_000).parse(Number(arrStr));

    // Parse sparkline from comma-separated string
    const sparkline = data.sparkline
      ? numberArraySchema(365).parse(
          data.sparkline
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n))
        )
      : [];

    return {
      name: data.name,
      externalId,
      renewalDate,
      arr,
      tickets: data.tickets,
      sparkline,
    };
  }
);

/**
 * Planner form schema
 * Validates user input for the copilot planner
 */
export const plannerFormSchema = z.object({
  customerId: z
    .string()
    .min(1, "Customer is required")
    .refine((val) => !hasXSSPatterns(val), {
      message: "Customer ID contains forbidden characters",
    }),
  task: z.enum(["renewal", "qbr", "churn", "eval"], {
    message: "Select a valid task type",
  }),
  message: z
    .string()
    .min(0)
    .max(2000, "Message too long (max 2000 characters)")
    .transform(sanitizeString)
    .pipe(
      z.string().refine((val) => !hasXSSPatterns(val), {
        message: "Message contains forbidden characters",
      })
    ),
});

/**
 * Eval form schema (for evaluation mode)
 * Includes all planner fields plus eval-specific fields
 */
export const evalFormSchema = z.object({
  customerId: z
    .string()
    .min(1, "Customer is required")
    .refine((val) => !hasXSSPatterns(val), {
      message: "Customer ID contains forbidden characters",
    }),
  expectedActions: z
    .string()
    .min(1, "Expected actions are required")
    .max(2000, "Text too long (max 2000 characters)")
    .transform(sanitizeString),
  message: z
    .string()
    .min(1, "Message is required")
    .max(2000, "Message too long (max 2000 characters)")
    .transform(sanitizeString)
    .pipe(
      z.string().refine((val) => !hasXSSPatterns(val), {
        message: "Message contains forbidden characters",
      })
    ),
});
