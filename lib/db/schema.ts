import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  real,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── NextAuth tables ────────────────────────────────────────────────────────────

export const authUsers = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const authAccounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const authSessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const authVerificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const planEnum = pgEnum("plan", ["floor", "guided", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
  "trialing",
]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "annual"]);
export const leadTypeEnum = pgEnum("lead_type", [
  "web_basic",
  "web_advanced",
  "b2c_search",
  "b2b_search",
]);
export const leadSourceEnum = pgEnum("lead_source", [
  "make_webhook",
  "csv_upload",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "active",
  "paused",
  "ended",
]);
export const mqlSqlEnum = pgEnum("mql_sql", ["mql", "sql", "not_qualified"]);
export const segmentEnum = pgEnum("segment", ["A", "B", "C", "off_icp"]);

export const sfCustomers = pgTable("sf_customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  companyName: text("company_name"),
  plan: planEnum("plan").notNull().default("floor"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .notNull()
    .default("active"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  monthlyPlatformFeeCents: integer("monthly_platform_fee_cents").notNull(),
  isFounder: boolean("is_founder").notNull().default(false),
  founderSpotNumber: integer("founder_spot_number"),
  lockedPlatformFeeCents: integer("locked_platform_fee_cents"),
  setupFeePaidCents: integer("setup_fee_paid_cents"),
  setupFeePaidAt: timestamp("setup_fee_paid_at"),
  leadGuaranteeDue: timestamp("lead_guarantee_due"),
  icpDescription: text("icp_description"),
  notes: text("notes"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sfCreditAccounts = pgTable("sf_credit_accounts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .unique()
    .references(() => sfCustomers.id),
  balanceCents: integer("balance_cents").notNull().default(0),
  totalLoadedCents: integer("total_loaded_cents").notNull().default(0),
  totalSpentCents: integer("total_spent_cents").notNull().default(0),
  lowBalanceThresholdCents: integer("low_balance_threshold_cents")
    .notNull()
    .default(10000),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sfCreditPurchases = pgTable(
  "sf_credit_purchases",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => sfCustomers.id),
    amountCents: integer("amount_cents").notNull(),
    bonusCents: integer("bonus_cents").notNull().default(0),
    paymentReference: text("payment_reference"),
    loadedBy: text("loaded_by"),
    processor: text("processor"),
    loadedAt: timestamp("loaded_at").notNull().defaultNow(),
  },
  (t) => [index("sfcp_customer_idx").on(t.customerId)]
);

export const sfCampaigns = pgTable(
  "sf_campaigns",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => sfCustomers.id),
    name: text("name").notNull(),
    leadType: leadTypeEnum("lead_type").notNull(),
    budgetCents: integer("budget_cents"),
    status: campaignStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("sfcamp_customer_idx").on(t.customerId)]
);

export const sfKeywords = pgTable(
  "sf_keywords",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => sfCampaigns.id),
    keyword: text("keyword").notNull(),
    monthlySearchVolume: integer("monthly_search_volume"),
    intentNotes: text("intent_notes"),
    icpRelevanceScore: integer("icp_relevance_score"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sfkw_campaign_idx").on(t.campaignId)]
);

export const sfLeads = pgTable(
  "sf_leads",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => sfCustomers.id),
    campaignId: integer("campaign_id").references(() => sfCampaigns.id),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    linkedinUrl: text("linkedin_url"),
    mailingAddress: text("mailing_address"),
    website: text("website"),
    company: text("company"),
    title: text("title"),
    leadType: leadTypeEnum("lead_type").notNull(),
    clickDate: timestamp("click_date"),
    source: leadSourceEnum("source").notNull(),
    // NEVER_EXPOSE: internal cost fields — must never appear in client-facing API responses
    costCents: integer("cost_cents").notNull(),
    chargeCents: integer("charge_cents").notNull(),
    ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
  },
  (t) => [
    index("sfl_customer_idx").on(t.customerId),
    index("sfl_campaign_idx").on(t.campaignId),
  ]
);

export const sfLeadScores = pgTable(
  "sf_lead_scores",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .unique()
      .references(() => sfLeads.id),
    customerId: integer("customer_id")
      .notNull()
      .references(() => sfCustomers.id),
    mqlSql: mqlSqlEnum("mql_sql").notNull(),
    iqScore: integer("iq_score").notNull(),
    segment: segmentEnum("segment").notNull(),
    claudeReasoning: text("claude_reasoning"),
    scoredAt: timestamp("scored_at").notNull().defaultNow(),
  },
  (t) => [index("sfls_customer_idx").on(t.customerId)]
);

export const sfSignalQueue = pgTable(
  "sf_signal_queue",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => sfCustomers.id),
    campaignId: integer("campaign_id").references(() => sfCampaigns.id),
    rawPayload: text("raw_payload").notNull(),
    source: leadSourceEnum("source").notNull(),
    processedAt: timestamp("processed_at"),
    errorMessage: text("error_message"),
    enqueuedAt: timestamp("enqueued_at").notNull().defaultNow(),
  },
  (t) => [
    index("sfsq_customer_idx").on(t.customerId),
    index("sfsq_unprocessed_idx").on(t.processedAt),
  ]
);

export const sfSettings = pgTable("sf_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Content strategy tables ────────────────────────────────────────────────────

export const funnelStageEnum = pgEnum("funnel_stage", [
  "awareness",
  "consideration",
  "decision",
]);

export const contentJobStatusEnum = pgEnum("content_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const contentSourceEnum = pgEnum("content_source", ["gsc", "manual"]);

export const sfBrands = pgTable("sf_brands", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .unique()
    .references(() => sfCustomers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  funnelStage: funnelStageEnum("funnel_stage").notNull().default("awareness"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sfBrandTopics = pgTable(
  "sf_brand_topics",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => sfBrands.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sfbt_brand_idx").on(t.brandId)]
);

export const sfGscConnections = pgTable("sf_gsc_connections", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .unique()
    .references(() => sfCustomers.id, { onDelete: "cascade" }),
  siteUrl: text("site_url").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sfGscQueries = pgTable(
  "sf_gsc_queries",
  {
    id: serial("id").primaryKey(),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => sfGscConnections.id, { onDelete: "cascade" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => sfCustomers.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: real("ctr").notNull().default(0),
    position: real("position").notNull().default(0),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  },
  (t) => [
    index("sfgq_connection_idx").on(t.connectionId),
    index("sfgq_customer_idx").on(t.customerId),
  ]
);

export const sfContentJobs = pgTable(
  "sf_content_jobs",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => sfCustomers.id, { onDelete: "cascade" }),
    brandId: integer("brand_id")
      .notNull()
      .references(() => sfBrands.id, { onDelete: "cascade" }),
    targetQuery: text("target_query").notNull(),
    funnelStage: funnelStageEnum("funnel_stage").notNull(),
    source: contentSourceEnum("source").notNull(),
    status: contentJobStatusEnum("status").notNull().default("pending"),
    generatedContent: text("generated_content"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index("sfcj_customer_idx").on(t.customerId),
    index("sfcj_brand_idx").on(t.brandId),
    index("sfcj_status_idx").on(t.status),
  ]
);

// ── Payment processor tables ───────────────────────────────────────────────────

export const sfPaymentEvents = pgTable(
  "sf_payment_events",
  {
    id: serial("id").primaryKey(),
    processorEventId: text("processor_event_id").notNull().unique(),
    type: text("type").notNull(),
    customerId: integer("customer_id").references(() => sfCustomers.id),
    amountCents: integer("amount_cents"),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
  },
  (t) => [index("sfpe_event_id_idx").on(t.processorEventId)]
);
