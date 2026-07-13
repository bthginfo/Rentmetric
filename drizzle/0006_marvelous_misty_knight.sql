ALTER TABLE "rent_index_sources" ADD COLUMN "geographic_scope" jsonb DEFAULT '{"level":"city","districts":[],"postalCodes":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rent_index_sources" ADD COLUMN "valid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rent_index_sources" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "effective_construction_year" integer;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "modernization_year" integer;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "location_category" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "building_type" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "unit_type" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "outdoor_area_times_ten" integer;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "bathroom_area_times_ten" integer;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "rent_index_features" jsonb DEFAULT '{}'::jsonb NOT NULL;