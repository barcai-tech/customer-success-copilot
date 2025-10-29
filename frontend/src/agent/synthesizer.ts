/**
 * Result synthesis module
 * Converts raw tool outputs and LLM responses into final formatted results
 */

import type { TaskType } from "@/src/store/copilot-store";
import type { ToolDataMap, MissingState } from "./types";
import type { PlannerResultJson } from "@/src/contracts/planner";
import { logger } from "@/src/lib/logger";

/**
 * Calculate days between now and a date
 */
export function daysUntilDate(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Format a date in unambiguous format (e.g., "12 January 2026")
 */
export function formatDateUnambiguous(date: Date): string {
  const day = date.getUTCDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Generate action items based on cached tool data and task hint
 */
export function synthesizeActions(
  cache: Partial<ToolDataMap>,
  taskHint?: TaskType | null
): string[] {
  const usage = cache.get_customer_usage;
  const tickets = cache.get_recent_tickets;
  const contract = cache.get_contract_info;
  const health = cache.calculate_health;
  const actions: string[] = [];

  // Health-based actions
  if (health?.riskLevel) {
    const risk = String(health.riskLevel).toLowerCase();
    if (risk === "low") {
      actions.push(
        "Share recent wins and outcomes with sponsor",
        "Identify expansion opportunities and champions",
        "Schedule next QBR"
      );
    } else if (risk === "medium") {
      actions.push(
        "Confirm rollout of priority features",
        "Schedule health review with champion",
        "Review support tickets for emerging risks"
      );
    } else if (risk === "high") {
      actions.push(
        "Create recovery plan with measurable milestones",
        "Escalate to executive sponsor for alignment",
        "Daily check-in until risk subsides"
      );
    }
  }

  // Usage trend actions
  if (usage?.trend === "down") {
    actions.push(
      "Investigate drop in usage with product analytics",
      "Run adoption campaign and refresher training"
    );
  } else if (usage?.trend === "flat") {
    actions.push("Drive adoption of underused features");
  } else if (usage?.trend === "up") {
    actions.push("Highlight adoption growth in executive update");
  }

  // Support ticket actions
  if (typeof tickets?.openTickets === "number") {
    if (tickets.openTickets > 3)
      actions.push("Triage and resolve open tickets with support lead");
    else if (tickets.openTickets > 0)
      actions.push("Follow up on open tickets and communicate ETA");
  }

  // Contract renewal actions
  if (contract?.renewalDate) {
    const days = daysUntilDate(contract.renewalDate);
    if (days !== null) {
      if (days <= 30) {
        actions.push(
          "Lock renewal timeline and decision owners",
          "Deliver value realization deck",
          "Draft order form and route for legal review",
          "Set weekly exec cadence until signature"
        );
      } else if (days <= 60) {
        actions.push(
          "Run stakeholder alignment call",
          "Confirm procurement steps and blockers",
          "Share pricing and packaging options"
        );
      } else if (days <= 90) {
        actions.push(
          "Prepare renewal brief and value summary",
          "Book renewal prep call",
          "Align pricing and legal timelines"
        );
      } else if (days <= 180) {
        actions.push("Plan pre-renewal business review and success plan");
      }
    }
  }

  // Task-specific action prioritization
  const t = (taskHint || "").toLowerCase();
  if (t === "renewal") {
    actions.unshift(
      "Create renewal success summary",
      "Identify expansion levers and risks"
    );
  } else if (t === "qbr") {
    actions.unshift(
      "Draft QBR agenda and collect metrics",
      "Confirm attendee list and goals"
    );
  } else if (
    t === "churn" ||
    String(health?.riskLevel || "").toLowerCase() === "high"
  ) {
    actions.unshift("Open risk mitigation plan", "Assign DRI and timeline");
  }

  // Deduplicate actions while preserving order
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of actions) {
    const k = a.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(a);
    }
  }

  return out;
}

/**
 * Generate human-friendly summary from cached tool data
 */
export function synthesizeSummary(
  cache: Partial<ToolDataMap>
): string | undefined {
  const usage = cache.get_customer_usage;
  const tickets = cache.get_recent_tickets;
  const contract = cache.get_contract_info;
  const health = cache.calculate_health;
  const parts: string[] = [];

  // Health status
  if (health?.score && health?.riskLevel) {
    parts.push(
      `Health score is ${
        health.score
      }/100 with ${health.riskLevel.toLowerCase()} risk`
    );
  }

  // Usage trend
  if (usage?.trend) {
    const trendText =
      usage.trend === "up"
        ? "increasing"
        : usage.trend === "down"
        ? "declining"
        : "stable";
    parts.push(`usage is ${trendText}`);
  }

  // Open tickets
  if (typeof tickets?.openTickets === "number") {
    if (tickets.openTickets === 0) {
      parts.push("no open support tickets");
    } else if (tickets.openTickets === 1) {
      parts.push("1 open support ticket");
    } else {
      parts.push(`${tickets.openTickets} open support tickets`);
    }
  }

  // Renewal date
  if (contract?.renewalDate) {
    const renewalDate = new Date(contract.renewalDate);

    // Check if date is valid
    if (!isNaN(renewalDate.getTime())) {
      const days = daysUntilDate(contract.renewalDate);
      if (days === null) {
        logger.warn("[synthesizeSummary] Invalid renewal date calculation", {
          renewalDate: contract.renewalDate,
        });
      } else if (days < 0) {
        parts.push("renewal date has passed");
      } else if (days === 0) {
        parts.push("renewal is today");
      } else if (days <= 30) {
        parts.push(`renewal in ${days} days`);
      } else if (days <= 90) {
        const months = Math.floor(days / 30);
        parts.push(`renewal in ${months} ${months === 1 ? "month" : "months"}`);
      } else {
        parts.push(`renewal on ${formatDateUnambiguous(renewalDate)}`);
      }
    } else {
      logger.warn("[synthesizeSummary] Invalid renewal date", {
        renewalDate: contract.renewalDate,
      });
    }
  }

  return parts.length ? parts.join(", ") + "." : undefined;
}

/**
 * Redact sensitive information from strings
 */
export function redactString(input: string): string {
  const patterns: RegExp[] = [
    // Authorization headers (Bearer tokens)
    /authorization\s*:\s*bearer\s+[A-Za-z0-9\-._~+/=]{20,}/gi,
    // X-Signature headers with long hex strings (HMAC-like)
    /x-?signature\s*:\s*[0-9a-f]{32,}/gi,
    // OpenAI-style keys (sk-...)
    /\bsk-[A-Za-z0-9]{20,}\b/g,
    // GitHub PAT
    /\bghp_[A-Za-z0-9]{30,}\b/g,
    // GitLab PAT
    /\bglpat-[A-Za-z0-9\-_]{20,}\b/g,
    // AWS Access Key ID
    /\bAKIA[0-9A-Z]{16}\b/g,
    // JWT-like tokens (three base64url segments)
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    // Generic long hex (signatures, hashes)
    /\b[0-9a-f]{40,}\b/gi,
  ];

  let out = input;
  for (const re of patterns) {
    out = out.replace(re, "[REDACTED]");
  }
  return out;
}

/**
 * Sanitize and validate the final planner result
 */
export function sanitizePlannerResult(
  input: Partial<PlannerResultJson>
): PlannerResultJson {
  // Validate emailDraft has required fields
  let validEmailDraft: { subject: string; body: string } | undefined;
  if (
    input.emailDraft &&
    typeof input.emailDraft.subject === "string" &&
    typeof input.emailDraft.body === "string"
  ) {
    validEmailDraft = input.emailDraft;
  }

  const copy: PlannerResultJson = {
    usedTools: input.usedTools ?? [],
    decisionLog: input.decisionLog,
    summary: input.summary,
    health: input.health,
    actions: input.actions,
    emailDraft: validEmailDraft,
    notes: input.notes,
    planSource: input.planSource,
    planHint: input.planHint,
    customerId: input.customerId,
    task: input.task,
    timingInfo: input.timingInfo,
  };

  // Redact sensitive data
  if (copy.summary) copy.summary = redactString(copy.summary);
  if (copy.notes) copy.notes = redactString(copy.notes);
  if (copy.actions)
    copy.actions = copy.actions
      .map((a) => redactString(String(a)))
      .filter(Boolean) as string[];
  if (copy.emailDraft) {
    copy.emailDraft.subject = redactString(copy.emailDraft.subject);
    copy.emailDraft.body = redactString(copy.emailDraft.body);
  }

  if (copy.decisionLog && Array.isArray(copy.decisionLog)) {
    const first = copy.decisionLog[0] as unknown;
    if (typeof first === "string") {
      // Convert string array to object array
      const stringLog = copy.decisionLog as unknown as string[];
      copy.decisionLog = stringLog.map<{
        reason: string;
      }>((d) => ({
        reason: redactString(d),
      }));
    } else {
      copy.decisionLog = (
        copy.decisionLog as Array<{
          reason: string;
          step?: number;
          tool?: string;
          action?: string;
        }>
      ).map((d) => ({
        ...d,
        reason:
          typeof d.reason === "string" ? redactString(d.reason) : d.reason,
      }));
    }
  }

  return copy;
}
