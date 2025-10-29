/**
 * Utility functions for the Copilot agent
 */

import { db } from "@/src/db/client";
import { companies } from "@/src/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "@/src/lib/logger";

/**
 * Extract customer display name from database
 * Returns undefined if not found
 */
export async function getDisplayName(
  customerId: string,
  ownerUserId: string
): Promise<string | undefined> {
  try {
    const row = await db
      .select({ name: companies.name })
      .from(companies)
      .where(
        and(
          eq(companies.ownerUserId, ownerUserId),
          eq(companies.externalId, customerId)
        )
      )
      .limit(1);
    return row?.[0]?.name;
  } catch (e) {
    logger.error("[getDisplayName error]", e);
    return undefined;
  }
}

/**
 * Validate that a customer belongs to a specific owner
 * Returns true if valid, false otherwise
 */
export async function validateCustomerOwnership(
  customerId: string,
  ownerUserId: string
): Promise<boolean> {
  try {
    const row = await db
      .select({ id: companies.externalId })
      .from(companies)
      .where(
        and(
          eq(companies.ownerUserId, ownerUserId),
          eq(companies.externalId, customerId)
        )
      )
      .limit(1);
    return row && row.length > 0;
  } catch (e) {
    logger.error("[validateCustomerOwnership error]", e);
    return false;
  }
}

/**
 * Heuristic extraction of a customer name mentioned by the user.
 * Looks for:
 * 1) quoted text, e.g. "Acme Corp"
 * 2) patterns after 'of' or 'for', e.g. health of Initech or QBR for Mega Corp
 * 3) a capitalized multi-word phrase fallback
 */
export function extractRequestedCustomerName(
  message: string
): string | undefined {
  const text = message.trim();

  // 1) Quoted phrase
  const quoted = text.match(/["""''']([^"""''']{2,})["""''']/);
  if (quoted?.[1]) return quoted[1].trim();

  // 2) of|for pattern
  const ofFor = text.match(/\b(?:of|for)\s+([A-Z][\w&-]*(?:\s+[A-Z][\w&-]*)*)/);
  if (ofFor?.[1]) return ofFor[1].trim();

  // 3) Capitalized multi-word sequence
  const caps = text.match(/\b([A-Z][\w&-]*(?:\s+[A-Z][\w&-]*){1,3})\b/);
  if (caps?.[1]) return caps[1].trim();

  return undefined;
}

/**
 * Compare two names ignoring case and whitespace variations
 */
export function namesEqualIgnoreCase(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Determine if a message is out of scope for customer success
 */
export function isOutOfScope(message: string): boolean {
  const s = message.toLowerCase();

  // Keywords that indicate CS domain
  const csKeywords = [
    "customer",
    "health",
    "renewal",
    "qbr",
    "ticket",
    "contract",
    "usage",
    "adoption",
    "email",
    "churn",
    "account",
    "onboard",
    "support",
    "escalat",
  ];
  const hasCs = csKeywords.some((k) => s.includes(k));

  // Out-of-scope indicators
  const likelyOos = [
    "movie",
    "actor",
    "celebrity",
    "lyrics",
    "recipe",
    "game cheat",
    "hack",
    "exploit",
    "bypass",
    "jailbreak",
    "weather",
    "what month",
    "what day",
    "what year",
    "math problem",
    "joke",
    "story",
    "poem",
  ].some((k) => s.includes(k));

  return !hasCs && likelyOos;
}

/**
 * Check if user explicitly requested email draft
 */
export function requestsEmail(
  message: string,
  task: string | null = null
): boolean {
  const messageLower = message.toLowerCase();
  const taskLower = (task || "").toLowerCase();

  return (
    messageLower.includes("email") ||
    messageLower.includes("draft") ||
    messageLower.includes("message") ||
    taskLower === "renewal" ||
    taskLower.includes("email")
  );
}

/**
 * Check if user explicitly requested QBR outline
 */
export function requestsQbr(
  message: string,
  task: string | null = null
): boolean {
  const messageLower = message.toLowerCase();
  const taskLower = (task || "").toLowerCase();

  return (
    messageLower.includes("qbr") ||
    messageLower.includes("quarterly") ||
    messageLower.includes("business review") ||
    messageLower.includes("outline") ||
    taskLower === "qbr"
  );
}
