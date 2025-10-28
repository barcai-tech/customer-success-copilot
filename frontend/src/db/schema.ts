import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  uuid,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(), // e.g., acme-001
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id").notNull(), // Clerk userId
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    companiesOwnerIdx: index("companies_owner_idx").on(t.ownerUserId),
    companiesExternalIdx: index("companies_external_idx").on(t.externalId),
    companiesOwnerExternalUx: uniqueIndex("companies_owner_external_ux").on(
      t.ownerUserId,
      t.externalId
    ),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyExternalId: text("company_external_id").notNull(), // business-key link
    ownerUserId: text("owner_user_id").notNull(), // Clerk userId for tenancy
    role: text("role").notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull(),
    resultJson: jsonb("result_json"), // optional structured result
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    messagesOwnerIdx: index("messages_owner_idx").on(t.ownerUserId),
    messagesCompanyIdx: index("messages_company_idx").on(t.companyExternalId),
  })
);

export const companiesRelations = relations(companies, ({ many }) => ({
  messages: many(messages),
}));

// Tool data tables (DB-native instead of S3)
export const contracts = pgTable(
  "contracts",
  {
    companyExternalId: text("company_external_id").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    renewalDate: timestamp("renewal_date").notNull(),
    arr: integer("arr").notNull(),
  },
  (t) => ({
    contractsOwnerIdx: index("contracts_owner_idx").on(t.ownerUserId),
    contractsCompanyIdx: index("contracts_company_idx").on(t.companyExternalId),
    // Enforce one row per (owner, company)
    contractsPk: primaryKey({ columns: [t.ownerUserId, t.companyExternalId] }),
  })
);

export const usageSummaries = pgTable(
  "usage_summaries",
  {
    companyExternalId: text("company_external_id").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    trend: text("trend").notNull(), // up | down | flat
    avgDailyUsers: integer("avg_daily_users").notNull(),
    sparkline: jsonb("sparkline").$type<number[]>().notNull(),
  },
  (t) => ({
    usageOwnerIdx: index("usage_owner_idx").on(t.ownerUserId),
    usageCompanyIdx: index("usage_company_idx").on(t.companyExternalId),
    usagePk: primaryKey({ columns: [t.ownerUserId, t.companyExternalId] }),
  })
);

export const ticketSummaries = pgTable(
  "ticket_summaries",
  {
    companyExternalId: text("company_external_id").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    openTickets: integer("open_tickets").notNull(),
    recentTickets: jsonb("recent_tickets")
      .$type<Array<{ id: string; severity: string }>>()
      .notNull(),
  },
  (t) => ({
    ticketsOwnerIdx: index("tickets_owner_idx").on(t.ownerUserId),
    ticketsCompanyIdx: index("tickets_company_idx").on(t.companyExternalId),
    ticketsPk: primaryKey({ columns: [t.ownerUserId, t.companyExternalId] }),
  })
);

// Evaluation sessions table
export const evalSessions = pgTable(
  "eval_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: text("owner_user_id").notNull(), // Clerk userId for tenancy
    totalTests: integer("total_tests").notNull(),
    passedTests: integer("passed_tests").notNull(),
    failedTests: integer("failed_tests").notNull(),
    timedOutTests: integer("timed_out_tests").notNull(),
    successRate: integer("success_rate").notNull(), // percentage 0-100
    avgDurationMs: integer("avg_duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    evalSessionsOwnerIdx: index("eval_sessions_owner_idx").on(t.ownerUserId),
    evalSessionsCreatedIdx: index("eval_sessions_created_idx").on(t.createdAt),
  })
);

// Evaluation results table
export const evalResults = pgTable(
  "eval_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => evalSessions.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    customerName: text("customer_name").notNull(),
    action: text("action").notNull(), // health | renewal | qbr | email | churn
    status: text("status").notNull(), // success | failure | timeout
    durationMs: integer("duration_ms").notNull(),
    error: text("error"), // error message if applicable
    planSource: text("plan_source"), // llm | heuristic
    planHint: text("plan_hint"),
    result: jsonb("result"), // full result object
    metrics: jsonb("metrics"), // hasSummary, hasActions, hasHealth, etc.
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    evalResultsSessionIdx: index("eval_results_session_idx").on(t.sessionId),
    evalResultsStatusIdx: index("eval_results_status_idx").on(t.status),
  })
);

// Execution steps table (for detailed timeline in eval results)
export const execSteps = pgTable(
  "exec_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => evalResults.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    level: text("level").notNull(), // info | success | error | warning | debug
    durationMs: integer("duration_ms"),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    execStepsResultIdx: index("exec_steps_result_idx").on(t.resultId),
  })
);

export const evalSessionsRelations = relations(evalSessions, ({ many }) => ({
  results: many(evalResults),
}));

export const evalResultsRelations = relations(evalResults, ({ one, many }) => ({
  session: one(evalSessions, {
    fields: [evalResults.sessionId],
    references: [evalSessions.id],
  }),
  execSteps: many(execSteps),
}));

export const execStepsRelations = relations(execSteps, ({ one }) => ({
  result: one(evalResults, {
    fields: [execSteps.resultId],
    references: [evalResults.id],
  }),
}));
