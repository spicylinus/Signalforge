import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

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
