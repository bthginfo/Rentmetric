ALTER TABLE "maintenance_cases" ADD COLUMN "reported_by_renter" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "bank_account_holder" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "iban" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "rent_due_day" integer DEFAULT 3 NOT NULL;