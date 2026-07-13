CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"booking_date" timestamp with time zone NOT NULL,
	"amount_cents" integer NOT NULL,
	"reference" text,
	"counterparty" text,
	"external_id" text,
	"matched_payment_id" uuid,
	"confidence_basis_points" integer,
	"status" text DEFAULT 'unmatched' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rent_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"old_cold_rent_cents" integer NOT NULL,
	"new_cold_rent_cents" integer NOT NULL,
	"change_type" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processing_status" text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "parent_document_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "issuer" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "document_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "service_period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "service_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matched_payment_id_payments_id_fk" FOREIGN KEY ("matched_payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_changes" ADD CONSTRAINT "rent_changes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_changes" ADD CONSTRAINT "rent_changes_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_transactions_org_date_idx" ON "bank_transactions" USING btree ("organization_id","booking_date");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_transactions_org_external_unique" ON "bank_transactions" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE INDEX "rent_changes_tenancy_idx" ON "rent_changes" USING btree ("organization_id","tenancy_id","effective_from");