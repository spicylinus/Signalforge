CREATE TYPE "public"."cf_distribution_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."cf_wp_publish_status" AS ENUM('draft', 'publish');--> statement-breakpoint
CREATE TABLE "cf_distribution_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"status" "cf_distribution_status" NOT NULL,
	"published_url" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cf_distribution_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"wp_site_url" text NOT NULL,
	"wp_username" text NOT NULL,
	"wp_app_password" text NOT NULL,
	"wp_publish_status" "cf_wp_publish_status" DEFAULT 'draft' NOT NULL,
	"auto_publish_blog" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cf_distribution_settings_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "cf_sample_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"business_name" text NOT NULL,
	"industry" text NOT NULL,
	"topic" text NOT NULL,
	"target_audience" text NOT NULL,
	"result_title" text,
	"result_body" text,
	"lead_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cf_customers" ADD COLUMN "founding_member" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cf_customers" ADD COLUMN "founding_rate" integer;--> statement-breakpoint
ALTER TABLE "cf_distribution_log" ADD CONSTRAINT "cf_distribution_log_content_id_cf_generated_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."cf_generated_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cf_distribution_log" ADD CONSTRAINT "cf_distribution_log_customer_id_cf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."cf_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cf_distribution_settings" ADD CONSTRAINT "cf_distribution_settings_customer_id_cf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."cf_customers"("id") ON DELETE cascade ON UPDATE no action;