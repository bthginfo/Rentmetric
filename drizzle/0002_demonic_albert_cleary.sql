CREATE TYPE "public"."rent_index_import_status" AS ENUM('uploaded', 'processing', 'needs_review', 'approved', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('vacant', 'occupied', 'owner_occupied', 'renovation');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"type" text DEFAULT 'info' NOT NULL,
	"status" "notification_status" DEFAULT 'unread' NOT NULL,
	"deduplication_key" text,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"blob_pathname" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rent_index_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid,
	"municipality" text NOT NULL,
	"title" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"blob_pathname" text NOT NULL,
	"source_type" text DEFAULT 'manual_upload' NOT NULL,
	"source_url" text,
	"external_dataset_id" text,
	"external_resource_id" text,
	"detected_format" text,
	"status" "rent_index_import_status" DEFAULT 'uploaded' NOT NULL,
	"extracted_data" jsonb,
	"warnings" jsonb,
	"error" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "status" "unit_status" DEFAULT 'vacant' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_cold_rent_cents" integer;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "utility_estimate_cents" integer;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "condition" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "heating_type" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "energy_source" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "bathroom" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "flooring" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "has_balcony" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "has_fitted_kitchen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "has_elevator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "is_accessible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "parking_spaces" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_index_imports" ADD CONSTRAINT "rent_index_imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_index_imports" ADD CONSTRAINT "rent_index_imports_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_org_status_idx" ON "notifications" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_org_dedupe_unique" ON "notifications" USING btree ("organization_id","deduplication_key");--> statement-breakpoint
CREATE INDEX "property_images_org_property_idx" ON "property_images" USING btree ("organization_id","property_id");--> statement-breakpoint
CREATE INDEX "rent_index_imports_org_created_idx" ON "rent_index_imports" USING btree ("organization_id","created_at");