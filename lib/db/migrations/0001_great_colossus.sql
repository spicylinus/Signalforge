CREATE TYPE "public"."cf_content_event_type" AS ENUM('copy', 'download', 'regenerate');--> statement-breakpoint
CREATE TABLE "cf_content_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"event_type" "cf_content_event_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cf_content_events" ADD CONSTRAINT "cf_content_events_content_id_cf_generated_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."cf_generated_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cf_content_events" ADD CONSTRAINT "cf_content_events_customer_id_cf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."cf_customers"("id") ON DELETE cascade ON UPDATE no action;