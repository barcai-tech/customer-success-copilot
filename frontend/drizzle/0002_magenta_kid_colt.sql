CREATE TABLE "contracts" (
	"company_external_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"renewal_date" text NOT NULL,
	"arr" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_summaries" (
	"company_external_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"open_tickets" integer NOT NULL,
	"recent_tickets" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_summaries" (
	"company_external_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"trend" text NOT NULL,
	"avg_daily_users" integer NOT NULL,
	"sparkline" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contracts_owner_idx" ON "contracts" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "contracts_company_idx" ON "contracts" USING btree ("company_external_id");--> statement-breakpoint
CREATE INDEX "tickets_owner_idx" ON "ticket_summaries" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "tickets_company_idx" ON "ticket_summaries" USING btree ("company_external_id");--> statement-breakpoint
CREATE INDEX "usage_owner_idx" ON "usage_summaries" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "usage_company_idx" ON "usage_summaries" USING btree ("company_external_id");