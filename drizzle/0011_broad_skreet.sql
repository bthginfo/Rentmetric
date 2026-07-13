ALTER TABLE "properties" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenancies" ADD COLUMN "deposit_paid_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenancies" ADD COLUMN "deposit_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenancies" ADD COLUMN "rent_due_day" integer;--> statement-breakpoint
ALTER TABLE "tenancies" ADD COLUMN "payment_reference" text;