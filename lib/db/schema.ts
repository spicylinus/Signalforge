import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("cf_plan", ["solo", "business", "agency"]);

export const jobTypeEnum = pgEnum("cf_job_type", [
  "blog",
  "social",
  "newsletter",
]);

export const jobStatusEnum = pgEnum("cf_job_status", [
  "pending",
  "running",
  "done",
  "failed",
]);

export const subscriptionStatusEnum = pgEnum("cf_subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
]);

// ── Tables ────────────────────────────────────────────────────────────────────

export const customers = pgTable("cf_customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  fanbasisCustomerId: text("fanbasis_customer_id").unique(),
  plan: planEnum("plan"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status"),
  subscriptionId: text("subscription_id"),
  foundingMember: boolean("founding_member").notNull().default(false),
  foundingRate: integer("founding_rate"), // monthly cents locked forever
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brands = pgTable("cf_brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  tone: text("tone").array().notNull().default([]),
  topics: text("topics").array().notNull().default([]),
  targetAudience: text("target_audience").notNull(),
  sampleContent: text("sample_content"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentJobs = pgTable("cf_content_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedContent = pgTable("cf_generated_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => contentJobs.id, { onDelete: "cascade" }),
  title: text("title"),
  body: text("body").notNull(),
  platform: text("platform"),
  wordCount: integer("word_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fanbasisEvents = pgTable("cf_fanbasis_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export const contentEventTypeEnum = pgEnum("cf_content_event_type", [
  "copy",
  "download",
  "regenerate",
]);

export const contentEvents = pgTable("cf_content_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id")
    .notNull()
    .references(() => generatedContent.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  eventType: contentEventTypeEnum("event_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sampleRequests = pgTable("cf_sample_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipHash: text("ip_hash").notNull(),
  businessName: text("business_name").notNull(),
  industry: text("industry").notNull(),
  topic: text("topic").notNull(),
  targetAudience: text("target_audience").notNull(),
  resultTitle: text("result_title"),
  resultBody: text("result_body"),
  leadEmail: text("lead_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wpPublishStatusEnum = pgEnum("cf_wp_publish_status", [
  "draft",
  "publish",
]);

export const distributionSettings = pgTable("cf_distribution_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  wpSiteUrl: text("wp_site_url").notNull(),
  wpUsername: text("wp_username").notNull(),
  wpAppPassword: text("wp_app_password").notNull(),
  wpPublishStatus: wpPublishStatusEnum("wp_publish_status")
    .notNull()
    .default("draft"),
  autoPublishBlog: boolean("auto_publish_blog").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const distributionStatusEnum = pgEnum("cf_distribution_status", [
  "success",
  "failed",
]);

export const distributionLog = pgTable("cf_distribution_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id")
    .notNull()
    .references(() => generatedContent.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  status: distributionStatusEnum("status").notNull(),
  publishedUrl: text("published_url"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ many, one }) => ({
  brands: many(brands),
  distributionSettings: one(distributionSettings, {
    fields: [customers.id],
    references: [distributionSettings.customerId],
  }),
  distributionLogs: many(distributionLog),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  customer: one(customers, {
    fields: [brands.customerId],
    references: [customers.id],
  }),
  contentJobs: many(contentJobs),
}));

export const contentJobsRelations = relations(contentJobs, ({ one, many }) => ({
  brand: one(brands, {
    fields: [contentJobs.brandId],
    references: [brands.id],
  }),
  generatedContent: many(generatedContent),
}));

export const generatedContentRelations = relations(
  generatedContent,
  ({ one, many }) => ({
    job: one(contentJobs, {
      fields: [generatedContent.jobId],
      references: [contentJobs.id],
    }),
    events: many(contentEvents),
    distributionLogs: many(distributionLog),
  })
);

export const distributionSettingsRelations = relations(
  distributionSettings,
  ({ one }) => ({
    customer: one(customers, {
      fields: [distributionSettings.customerId],
      references: [customers.id],
    }),
  })
);

export const distributionLogRelations = relations(distributionLog, ({ one }) => ({
  content: one(generatedContent, {
    fields: [distributionLog.contentId],
    references: [generatedContent.id],
  }),
  customer: one(customers, {
    fields: [distributionLog.customerId],
    references: [customers.id],
  }),
}));

export const contentEventsRelations = relations(contentEvents, ({ one }) => ({
  content: one(generatedContent, {
    fields: [contentEvents.contentId],
    references: [generatedContent.id],
  }),
  customer: one(customers, {
    fields: [contentEvents.customerId],
    references: [customers.id],
  }),
}));
