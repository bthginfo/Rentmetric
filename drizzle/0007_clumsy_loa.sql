CREATE TABLE "maintenance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "utility_period_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "extracted_data" jsonb;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "category" text DEFAULT 'repair' NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "assignee_contact_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "estimated_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "actual_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "recurrence" text;--> statement-breakpoint
ALTER TABLE "utility_cost_items" ADD COLUMN "is_recoverable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "utility_cost_items" ADD COLUMN "invoice_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "utility_cost_items" ADD COLUMN "vendor" text;--> statement-breakpoint
ALTER TABLE "utility_cost_items" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_case_id_maintenance_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."maintenance_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_events_case_idx" ON "maintenance_events" USING btree ("organization_id","case_id","created_at");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_utility_period_id_utility_periods_id_fk" FOREIGN KEY ("utility_period_id") REFERENCES "public"."utility_periods"("id") ON DELETE set null ON UPDATE no action;