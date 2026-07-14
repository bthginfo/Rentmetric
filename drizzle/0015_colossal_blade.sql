CREATE TYPE "public"."portal_entry_author" AS ENUM('landlord', 'renter', 'system');--> statement-breakpoint
CREATE TYPE "public"."portal_entry_type" AS ENUM('reply', 'status');--> statement-breakpoint
CREATE TYPE "public"."portal_item_kind" AS ENUM('message', 'task');--> statement-breakpoint
CREATE TYPE "public"."portal_task_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TABLE "portal_item_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"portal_item_id" uuid NOT NULL,
	"author" "portal_entry_author" NOT NULL,
	"type" "portal_entry_type" NOT NULL,
	"user_id" uuid,
	"share_link_id" uuid,
	"body" text,
	"metadata" jsonb,
	"request_key" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"kind" "portal_item_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"due_at" timestamp with time zone,
	"severity" text DEFAULT 'normal' NOT NULL,
	"task_status" "portal_task_status" DEFAULT 'open' NOT NULL,
	"task_completed_at" timestamp with time zone,
	"task_completed_by" text,
	"tenant_acknowledged_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_item_entries" ADD CONSTRAINT "portal_item_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_item_entries" ADD CONSTRAINT "portal_item_entries_portal_item_id_portal_items_id_fk" FOREIGN KEY ("portal_item_id") REFERENCES "public"."portal_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_item_entries" ADD CONSTRAINT "portal_item_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_item_entries" ADD CONSTRAINT "portal_item_entries_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_items" ADD CONSTRAINT "portal_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_items" ADD CONSTRAINT "portal_items_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_items" ADD CONSTRAINT "portal_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portal_item_entries_org_item_created_idx" ON "portal_item_entries" USING btree ("organization_id","portal_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_item_entries_item_request_unique" ON "portal_item_entries" USING btree ("portal_item_id","request_key");--> statement-breakpoint
CREATE INDEX "portal_items_org_tenancy_archive_created_idx" ON "portal_items" USING btree ("organization_id","tenancy_id","archived_at","created_at");
--> statement-breakpoint
UPDATE "share_links"
SET "permissions" = jsonb_set("permissions", '{communication}', 'true'::jsonb, true),
    "updated_at" = now()
WHERE NOT ("permissions" ? 'communication');
