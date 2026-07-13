CREATE TABLE "utility_cost_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cost_item_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"weight_value" integer,
	"amount_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "utility_cost_allocations" ADD CONSTRAINT "utility_cost_allocations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_cost_allocations" ADD CONSTRAINT "utility_cost_allocations_cost_item_id_utility_cost_items_id_fk" FOREIGN KEY ("cost_item_id") REFERENCES "public"."utility_cost_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_cost_allocations" ADD CONSTRAINT "utility_cost_allocations_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "utility_cost_allocations_item_unit_unique" ON "utility_cost_allocations" USING btree ("organization_id","cost_item_id","unit_id");--> statement-breakpoint
CREATE INDEX "utility_cost_allocations_item_idx" ON "utility_cost_allocations" USING btree ("organization_id","cost_item_id");