ALTER TABLE "sf_credit_accounts" ADD COLUMN "top_up_mode" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "sf_credit_accounts" ADD COLUMN "auto_top_up_trigger_cents" integer;--> statement-breakpoint
ALTER TABLE "sf_credit_accounts" ADD COLUMN "auto_top_up_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "sf_credit_accounts" ADD COLUMN "last_auto_top_up_at" timestamp;--> statement-breakpoint
ALTER TABLE "sf_customers" ADD COLUMN "stripe_payment_method_saved" boolean DEFAULT false NOT NULL;