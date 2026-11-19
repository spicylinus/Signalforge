CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."content_job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_source" AS ENUM('gsc', 'manual');--> statement-breakpoint
CREATE TYPE "public"."funnel_stage" AS ENUM('awareness', 'consideration', 'decision');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('make_webhook', 'csv_upload');--> statement-breakpoint
CREATE TYPE "public"."lead_type" AS ENUM('web_basic', 'web_advanced', 'b2c_search', 'b2b_search');--> statement-breakpoint
CREATE TYPE "public"."mql_sql" AS ENUM('mql', 'sql', 'not_qualified');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('floor', 'guided', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."segment" AS ENUM('A', 'B', 'C', 'off_icp');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'cancelled', 'trialing');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "sf_brand_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"topic" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sf_brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"name" text NOT NULL,
	"funnel_stage" "funnel_stage" DEFAULT 'awareness' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sf_brands_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "sf_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"name" text NOT NULL,
	"lead_type" "lead_type" NOT NULL,
	"budget_cents" integer,
	"status" "campaign_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sf_content_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"brand_id" integer NOT NULL,
	"target_query" text NOT NULL,
	"funnel_stage" "funnel_stage" NOT NULL,
	"source" "content_source" NOT NULL,
	"status" "content_job_status" DEFAULT 'pending' NOT NULL,
	"generated_content" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sf_credit_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"total_loaded_cents" integer DEFAULT 0 NOT NULL,
	"total_spent_cents" integer DEFAULT 0 NOT NULL,
	"low_balance_threshold_cents" integer DEFAULT 10000 NOT NULL,
	"last_alert_sent_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sf_credit_accounts_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "sf_credit_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"bonus_cents" integer DEFAULT 0 NOT NULL,
	"payment_reference" text,
	"loaded_by" text,
	"loaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sf_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company_name" text,
	"plan" "plan" DEFAULT 'floor' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'active' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL,
	"monthly_platform_fee_cents" integer NOT NULL,
	"is_founder" boolean DEFAULT false NOT NULL,
	"founder_spot_number" integer,
	"locked_platform_fee_cents" integer,
	"setup_fee_paid_cents" integer,
	"setup_fee_paid_at" timestamp,
	"lead_guarantee_due" timestamp,
	"icp_description" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sf_customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sf_gsc_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"site_url" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sf_gsc_connections_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "sf_gsc_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"query" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" real DEFAULT 0 NOT NULL,
	"position" real DEFAULT 0 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sf_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"keyword" text NOT NULL,
	"monthly_search_volume" integer,
	"intent_notes" text,
	"icp_relevance_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sf_lead_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"mql_sql" "mql_sql" NOT NULL,
	"iq_score" integer NOT NULL,
	"segment" "segment" NOT NULL,
	"claude_reasoning" text,
	"scored_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sf_lead_scores_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "sf_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"campaign_id" integer,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"mailing_address" text,
	"website" text,
	"company" text,
	"title" text,
	"lead_type" "lead_type" NOT NULL,
	"click_date" timestamp,
	"source" "lead_source" NOT NULL,
	"cost_cents" integer NOT NULL,
	"charge_cents" integer NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sf_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sf_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sf_signal_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"campaign_id" integer,
	"raw_payload" text NOT NULL,
	"source" "lead_source" NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"enqueued_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_brand_topics" ADD CONSTRAINT "sf_brand_topics_brand_id_sf_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."sf_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_brands" ADD CONSTRAINT "sf_brands_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_campaigns" ADD CONSTRAINT "sf_campaigns_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_content_jobs" ADD CONSTRAINT "sf_content_jobs_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_content_jobs" ADD CONSTRAINT "sf_content_jobs_brand_id_sf_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."sf_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_credit_accounts" ADD CONSTRAINT "sf_credit_accounts_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_credit_purchases" ADD CONSTRAINT "sf_credit_purchases_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_gsc_connections" ADD CONSTRAINT "sf_gsc_connections_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_gsc_queries" ADD CONSTRAINT "sf_gsc_queries_connection_id_sf_gsc_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."sf_gsc_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_gsc_queries" ADD CONSTRAINT "sf_gsc_queries_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_keywords" ADD CONSTRAINT "sf_keywords_campaign_id_sf_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."sf_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_lead_scores" ADD CONSTRAINT "sf_lead_scores_lead_id_sf_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."sf_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_lead_scores" ADD CONSTRAINT "sf_lead_scores_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_leads" ADD CONSTRAINT "sf_leads_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_leads" ADD CONSTRAINT "sf_leads_campaign_id_sf_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."sf_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_signal_queue" ADD CONSTRAINT "sf_signal_queue_customer_id_sf_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."sf_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sf_signal_queue" ADD CONSTRAINT "sf_signal_queue_campaign_id_sf_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."sf_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sfbt_brand_idx" ON "sf_brand_topics" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "sfcamp_customer_idx" ON "sf_campaigns" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sfcj_customer_idx" ON "sf_content_jobs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sfcj_brand_idx" ON "sf_content_jobs" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "sfcj_status_idx" ON "sf_content_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sfcp_customer_idx" ON "sf_credit_purchases" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sfgq_connection_idx" ON "sf_gsc_queries" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "sfgq_customer_idx" ON "sf_gsc_queries" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sfkw_campaign_idx" ON "sf_keywords" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "sfls_customer_idx" ON "sf_lead_scores" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sfl_customer_idx" ON "sf_leads" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sfl_campaign_idx" ON "sf_leads" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "sfsq_customer_idx" ON "sf_signal_queue" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sfsq_unprocessed_idx" ON "sf_signal_queue" USING btree ("processed_at");