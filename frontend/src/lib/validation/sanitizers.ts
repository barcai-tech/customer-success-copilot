import { hasXSSPatterns } from "./xss";

/**
 * Text Sanitization Functions
 * Removes dangerous characters and normalizes input
 */

/**
 * Remove null bytes and trim whitespace
 */
export const sanitizeString = (val: string) => val.replace(/\0/g, "").trim();

/**
 * Sanitize generic text (backward compatible)
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize external ID
 * Only allows lowercase alphanumeric, hyphens, and underscores
 */
export function sanitizeExternalId(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9\-_]/g, "") // Remove other special characters
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .slice(0, 100);
}

/**
 * Sanitize company name
 */
export function sanitizeCompanyName(input: string): string {
  const sanitized = sanitizeString(input);
  if (hasXSSPatterns(sanitized)) {
    throw new Error(
      "Company name contains forbidden characters. Please use only standard business names."
    );
  }
  return sanitized.slice(0, 200);
}

/**
 * Sanitize number
 */
export function sanitizeNumber(
  input: unknown,
  min?: number,
  max?: number
): number {
  const num = Number(input);

  if (!Number.isFinite(num)) {
    throw new Error("Must be a valid number");
  }

  if (typeof min === "number" && num < min) {
    throw new Error(`Must be at least ${min}`);
  }

  if (typeof max === "number" && num > max) {
    throw new Error(`Must be at most ${max}`);
  }

  return num;
}

/**
 * Sanitize number array
 */
export function sanitizeNumberArray(input: unknown, maxLength = 100): number[] {
  if (!Array.isArray(input)) {
    throw new Error("Must be an array");
  }

  if (input.length > maxLength) {
    throw new Error(`Array too long (max ${maxLength})`);
  }

  return input
    .map((item) => {
      const num = Number(item);
      return Number.isFinite(num) ? num : null;
    })
    .filter((n): n is number => n !== null);
}

/**
 * Sanitize tickets
 */
export function sanitizeTickets(
  input: unknown
): Array<{ id: string; severity: string }> {
  if (!Array.isArray(input)) {
    throw new Error("Tickets must be an array");
  }

  if (input.length > 50) {
    throw new Error("Too many tickets (max 50)");
  }

  return input.map((ticket) => {
    if (typeof ticket.id !== "string" || !ticket.id) {
      throw new Error("Ticket ID is required");
    }
    if (typeof ticket.severity !== "string" || !ticket.severity) {
      throw new Error("Ticket severity is required");
    }
    return {
      id: sanitizeText(ticket.id, 100),
      severity: sanitizeText(ticket.severity, 50),
    };
  });
}

/**
 * Validate ISO date
 */
export function validateISODate(input: string): string {
  const sanitized = sanitizeString(input);
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;

  if (!dateRegex.test(sanitized)) {
    throw new Error("Date must be in YYYY-MM-DD format");
  }

  const date = new Date(sanitized);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  return date.toISOString();
}
