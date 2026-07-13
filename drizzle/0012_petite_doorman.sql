ALTER TABLE "maintenance_cases" ADD COLUMN "portal_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "portal_tenancy_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "portal_renter_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "portal_share_link_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD COLUMN "portal_report_key" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_events" ADD COLUMN "portal_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "bic" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "transfer_note" text;--> statement-breakpoint
ALTER TABLE "tenancies" ADD COLUMN "deposit_returned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD CONSTRAINT "maintenance_cases_portal_tenancy_id_tenancies_id_fk" FOREIGN KEY ("portal_tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_cases" ADD CONSTRAINT "maintenance_cases_portal_renter_id_renters_id_fk" FOREIGN KEY ("portal_renter_id") REFERENCES "public"."renters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_portal_report_key_unique" ON "maintenance_cases" USING btree ("organization_id","portal_report_key");