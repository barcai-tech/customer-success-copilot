import { pgTable, serial, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(), // e.g., acme-001
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyExternalId: text("company_external_id").notNull(), // business-key link
  role: text("role").notNull(), // "user" | "assistant" | "system"
  content: text("content").notNull(),
  resultJson: jsonb("result_json"), // optional structured result
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  messages: many(messages),
}));

