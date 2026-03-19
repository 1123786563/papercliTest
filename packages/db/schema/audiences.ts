import { pgTable, text, timestamp, varchar, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { campaigns } from './campaigns';

/**
 * Audiences Table
 *
 * Target audience segments for marketing campaigns.
 * Supports dynamic segmentation using criteria rules.
 *
 * Indexes:
 * - organization_id - Find audiences by org
 */
export const audiences = pgTable('audiences', {
  id: uuid('id').primaryKey().defaultRandom(),

  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  // Audience details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Segmentation criteria (JSON rules for dynamic segments)
  // Supports AND/OR logic with multiple conditions
  criteria: jsonb('criteria').$type<SegmentCriteria>(),

  // Calculated member count (cached for performance)
  memberCount: jsonb('member_count').$type<MemberCountStats>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Campaign Audiences Table
 *
 * Junction table linking campaigns to target audiences.
 */
export const campaignAudiences = pgTable('campaign_audiences', {
  id: uuid('id').primaryKey().defaultRandom(),

  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),

  audienceId: uuid('audience_id')
    .notNull()
    .references(() => audiences.id, { onDelete: 'cascade' }),

  // Timestamps
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  campaignAudienceUnique: {
    columns: [table.campaignId, table.audienceId],
    isUnique: true,
  },
}));

// Relations
export const audiencesRelations = relations(audiences, ({ many, one }) => ({
  campaigns: many(campaignAudiences),
  organization: one(organizations, {
    fields: [audiences.organizationId],
    references: [organizations.id],
  }),
}));

export const campaignAudiencesRelations = relations(campaignAudiences, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignAudiences.campaignId],
    references: [campaigns.id],
  }),
  audience: one(audiences, {
    fields: [campaignAudiences.audienceId],
    references: [audiences.id],
  }),
}));

// Types for segmentation criteria
interface SegmentCriteria {
  // Operator for combining conditions
  operator: 'and' | 'or';

  // Array of conditions
  conditions: SegmentCondition[];

  // Nested groups (for complex queries)
  groups?: SegmentCriteria[];
}

interface SegmentCondition {
  field: string;  // e.g., 'email', 'createdAt', 'tags', 'lastActiveAt'
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' |
             'starts_with' | 'ends_with' | 'greater_than' | 'less_than' |
             'is_set' | 'is_not_set' | 'in_list';
  value: unknown;
}

interface MemberCountStats {
  total: number;
  lastCalculatedAt: string; // ISO timestamp
}

export type Audience = typeof audiences.$inferSelect;
export type NewAudience = typeof audiences.$inferInsert;
export type CampaignAudience = typeof campaignAudiences.$inferSelect;
export type NewCampaignAudience = typeof campaignAudiences.$inferInsert;
