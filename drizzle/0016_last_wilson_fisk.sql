CREATE TABLE "user_product_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tour_version" integer DEFAULT 1 NOT NULL,
	"tour_status" text DEFAULT 'pending' NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_product_state" ADD CONSTRAINT "user_product_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "user_product_state" ("user_id", "tour_version", "tour_status", "finished_at")
SELECT "id", 1, 'completed', now() FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
