import { pgTable, text, timestamp, varchar, boolean, uuid, jsonb, integer, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { content } from './content';

/**
 * Campaign Status Enum
 */
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',      // Being created/edited
  'scheduled',  // Scheduled for future
  'active',     // Currently running
  'paused',     // Temporarily paused
  'completed',  // Finished
  'cancelled',  // Cancelled before completion
]);

/**
 * Campaign Type Enum
 */
export const campaignTypeEnum = pgEnum('campaign_type', [
  'drip',           // Automated drip sequence
  'broadcast',      // One-time broadcast
  'nurture',        // Lead nurturing sequence
  'onboarding',     // User onboarding flow
  're_engagement',  // Re-engage inactive users
  'promotional',    // Promotional campaign
  'newsletter',     // Regular newsletter
]);

/**
 * Campaigns Table
 *
 * Marketing automation campaigns that orchestrate content delivery
 * to target audiences on defined schedules.
 *
 * Indexes:
 * - organization_id + status - Filter campaigns by org and status
 * - scheduled_start - Find campaigns starting soon
 */
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  // Campaign basics
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Classification
  type: campaignTypeEnum('type').notNull().default('broadcast'),
  status: campaignStatusEnum('status').notNull().default('draft'),

  // Scheduling
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
  timezone: varchar('timezone', { length: 100 }).default('UTC'),

  // Execution settings
  settings: jsonb('settings').$type<CampaignSettings>(),

  // Metrics (denormalized for performance)
  metrics: jsonb('metrics').$type<CampaignMetrics>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

/**
 * Campaign Steps Table
 *
 * Individual steps/nodes in a campaign workflow.
 * Each step can deliver content or perform an action.
 */
export const campaignSteps = pgTable('campaign_steps', {
  id: uuid('id').primaryKey().defaultRandom(),

  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),

  // Step details
  name: varchar('name', { length: 255 }).notNull(),
  order: integer('order').notNull(),

  // Step type: 'content' | 'delay' | 'condition' | 'action'
  stepType: varchar('step_type', { length: 50 }).notNull(),

  // Linked content (if step delivers content)
  contentId: uuid('content_id')
    .references(() => content.id, { onDelete: 'set null' }),

  // Delay before this step (in hours)
  delayHours: integer('delay_hours').default(0),

  // Step configuration
  config: jsonb('config').$type<StepConfig>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Campaign Content Table
 *
 * Junction table linking campaigns to content with scheduling.
 */
export const campaignContent = pgTable('campaign_content', {
  id: uuid('id').primaryKey().defaultRandom(),

  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),

  contentId: uuid('content_id')
    .notNull()
    .references(() => content.id, { onDelete: 'cascade' }),

  // Order in campaign sequence
  order: integer('order').notNull().default(0),

  // When this content should be sent
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  campaignContentUnique: {
    columns: [table.campaignId, table.contentId],
    isUnique: true,
  },
}));

// Relations
export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  steps: many(campaignSteps),
  contentItems: many(campaignContent),
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
}));

export const campaignStepsRelations = relations(campaignSteps, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSteps.campaignId],
    references: [campaigns.id],
  }),
  content: one(content, {
    fields: [campaignSteps.contentId],
    references: [content.id],
  }),
}));

export const campaignContentRelations = relations(campaignContent, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignContent.campaignId],
    references: [campaigns.id],
  }),
  content: one(content, {
    fields: [campaignContent.contentId],
    references: [content.id],
  }),
}));

// Types - exported for use in services
export interface CampaignSettings {
  sendWindow?: {
    startHour: number;
    endHour: number;
    daysOfWeek: number[];
  };
  throttling?: {
    maxPerHour: number;
    maxPerDay: number;
  };
  tracking?: {
    openTracking: boolean;
    clickTracking: boolean;
  };
  retryPolicy?: {
    maxRetries: number;
    retryIntervalHours: number;
  };
}

export interface CampaignMetrics {
  totalRecipients?: number;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  unsubscribed?: number;
  complained?: number;
}

export interface StepConfig {
  // For condition steps
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: unknown;
  };
  // For action steps
  action?: {
    type: 'tag' | 'webhook' | 'email_notification';
    params: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignStep = typeof campaignSteps.$inferSelect;
export type NewCampaignStep = typeof campaignSteps.$inferInsert;
export type CampaignContent = typeof campaignContent.$inferSelect;
export type NewCampaignContent = typeof campaignContent.$inferInsert;
