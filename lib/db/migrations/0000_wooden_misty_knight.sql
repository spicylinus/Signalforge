CREATE TYPE "public"."cf_job_status" AS ENUM('pending', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."cf_job_type" AS ENUM('blog', 'social', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."cf_plan" AS ENUM('solo', 'business', 'agency');--> statement-breakpoint
CREATE TYPE "public"."cf_subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "cf_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"tone" text[] DEFAULT '{}' NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"target_audience" text NOT NULL,
	"sample_content" text,
	"website_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cf_content_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"type" "cf_job_type" NOT NULL,
	"status" "cf_job_status" DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cf_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"fanbasis_customer_id" text,
	"plan" "cf_plan",
	"subscription_status" "cf_subscription_status",
	"subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cf_customers_email_unique" UNIQUE("email"),
	CONSTRAINT "cf_customers_fanbasis_customer_id_unique" UNIQUE("fanbasis_customer_id")
);
--> statement-breakpoint
CREATE TABLE "cf_fanbasis_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cf_fanbasis_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "cf_generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"platform" text,
	"word_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cf_brands" ADD CONSTRAINT "cf_brands_customer_id_cf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."cf_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cf_content_jobs" ADD CONSTRAINT "cf_content_jobs_brand_id_cf_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."cf_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cf_generated_content" ADD CONSTRAINT "cf_generated_content_job_id_cf_content_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."cf_content_jobs"("id") ON DELETE cascade ON UPDATE no action;