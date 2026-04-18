import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  jsonb,
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

// ── Relations ─────────────────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ many }) => ({
  brands: many(brands),
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
  })
);

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
