ALTER TABLE "companies" DROP CONSTRAINT "companies_external_id_unique";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "owner_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "owner_user_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "companies_owner_idx" ON "companies" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "companies_external_idx" ON "companies" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_owner_external_ux" ON "companies" USING btree ("owner_user_id","external_id");--> statement-breakpoint
CREATE INDEX "messages_owner_idx" ON "messages" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "messages_company_idx" ON "messages" USING btree ("company_external_id");