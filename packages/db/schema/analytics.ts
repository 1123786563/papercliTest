import { pgTable, text, timestamp, varchar, uuid, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';
import { content } from './content';
import { campaigns } from './campaigns';

/**
 * Analytics Event Type Enum
 */
export const analyticsEventTypeEnum = pgEnum('analytics_event_type', [
  // Content events
  'content_viewed',
  'content_shared',
  'content_liked',

  // Campaign events
  'campaign_sent',
  'campaign_delivered',
  'campaign_opened',
  'campaign_clicked',
  'campaign_bounced',
  'campaign_unsubscribed',
  'campaign_complained',

  // Conversion events
  'lead_captured',
  'form_submitted',
  'purchase_completed',
  'signup_completed',

  // Engagement events
  'session_started',
  'session_ended',
  'page_viewed',
]);

/**
 * Analytics Events Table
 *
 * Stores all analytics events for content and campaigns.
 * Optimized for high-volume writes with time-series data.
 *
 * Indexes:
 * - organization_id + created_at - Time-series queries by org
 * - event_type - Filter by event type
 * - content_id - Content performance analytics
 * - campaign_id - Campaign performance analytics
 */
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  // Event classification
  eventType: analyticsEventTypeEnum('event_type').notNull(),

  // Related entities (nullable - not all events have all relations)
  contentId: uuid('content_id')
    .references(() => content.id, { onDelete: 'set null' }),

  campaignId: uuid('campaign_id')
    .references(() => campaigns.id, { onDelete: 'set null' }),

  // User tracking
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }),

  // Anonymous user tracking (for non-authenticated users)
  anonymousId: varchar('anonymous_id', { length: 255 }),

  // Session tracking
  sessionId: varchar('session_id', { length: 255 }),

  // Event details
  metadata: jsonb('metadata').$type<EventMetadata>(),

  // Source tracking
  source: jsonb('source').$type<EventSource>(),

  // Timestamp
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxOrgTime: index('idx_analytics_org_time').on(table.organizationId, table.occurredAt),
  idxEventType: index('idx_analytics_event_type').on(table.eventType),
  idxContent: index('idx_analytics_content').on(table.contentId),
  idxCampaign: index('idx_analytics_campaign').on(table.campaignId),
}));

// Relations
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [analyticsEvents.organizationId],
    references: [organizations.id],
  }),
  content: one(content, {
    fields: [analyticsEvents.contentId],
    references: [content.id],
  }),
  campaign: one(campaigns, {
    fields: [analyticsEvents.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

// Types - exported for use in services
export interface EventMetadata {
  // For click events
  url?: string;
  linkText?: string;

  // For view events
  duration?: number; // seconds
  scrollDepth?: number; // percentage

  // For conversion events
  value?: number;
  currency?: string;

  // Custom fields
  [key: string]: unknown;
}

export interface EventSource {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  userAgent?: string;
  ip?: string; // Hashed for privacy
  country?: string;
  city?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
}

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
