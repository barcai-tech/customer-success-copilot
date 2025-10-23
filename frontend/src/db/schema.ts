import { pgTable, serial, text, timestamp, jsonb, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(), // e.g., acme-001
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id").notNull(), // Clerk userId
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companiesOwnerIdx: index("companies_owner_idx").on(t.ownerUserId),
    companiesExternalIdx: index("companies_external_idx").on(t.externalId),
    companiesOwnerExternalUx: uniqueIndex("companies_owner_external_ux").on(t.ownerUserId, t.externalId),
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    messagesOwnerIdx: index("messages_owner_idx").on(t.ownerUserId),
    messagesCompanyIdx: index("messages_company_idx").on(t.companyExternalId),
  })
);

export const companiesRelations = relations(companies, ({ many }) => ({
  messages: many(messages),
}));
