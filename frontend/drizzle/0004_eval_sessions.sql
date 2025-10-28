CREATE TABLE "eval_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"error" text,
	"plan_source" text,
	"plan_hint" text,
	"result" jsonb,
	"metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"total_tests" integer NOT NULL,
	"passed_tests" integer NOT NULL,
	"failed_tests" integer NOT NULL,
	"timed_out_tests" integer NOT NULL,
	"success_rate" integer NOT NULL,
	"avg_duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exec_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"level" text NOT NULL,
	"duration_ms" integer,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_results" ADD CONSTRAINT "eval_results_session_id_eval_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."eval_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exec_steps" ADD CONSTRAINT "exec_steps_result_id_eval_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."eval_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eval_results_session_idx" ON "eval_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "eval_results_status_idx" ON "eval_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "eval_sessions_owner_idx" ON "eval_sessions" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "eval_sessions_created_idx" ON "eval_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "exec_steps_result_idx" ON "exec_steps" USING btree ("result_id");