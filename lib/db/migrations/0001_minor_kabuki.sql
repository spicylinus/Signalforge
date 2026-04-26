CREATE TABLE "sf_payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"processor_event_id" text NOT NULL,
	"type" text NOT NULL,
	"customer_id" integer,
	"amount_cents" integer,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sf_payment_events_processor_event_id_unique" UNIQUE("processor_event_id")
);
--> statement-breakpoint
ALTER TABLE "sf_credit_purchases" ADD COLUMN "processor" text;--> statement-breakpoint
ALTER TABLE "sf_customers" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "sf_customers" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "sf_payment_events" ADD CONSTRAINT "sf_payment_events_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sfpe_event_id_idx" ON "sf_payment_events" USING btree ("processor_event_id");