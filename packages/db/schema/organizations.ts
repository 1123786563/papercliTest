import { pgTable, text, timestamp, varchar, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Organizations Table
 *
 * Multi-tenant support - each organization is a company/team using the product.
 * Supports different subscription plans.
 *
 * Indexes:
 * - slug (unique) - For URL-friendly organization identifiers
 */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),

  // Subscription plan: 'free' | 'starter' | 'pro' | 'enterprise'
  plan: varchar('plan', { length: 50 }).notNull().default('free'),

  // Plan limits and settings (flexible JSON for different plan features)
  settings: jsonb('settings').$type<OrganizationSettings>(),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Organization Members Table
 *
 * Junction table for users and organizations with role assignment.
 */
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),

  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Member role in organization: 'owner' | 'admin' | 'member' | 'viewer'
  role: varchar('role', { length: 50 }).notNull().default('member'),

  // Timestamps
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),

  // Unique constraint: user can only be member of organization once
}, (table) => ({
  organizationUserUnique: {
    columns: [table.organizationId, table.userId],
    isUnique: true,
  },
}));

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

// Types
interface OrganizationSettings {
  maxCampaigns?: number;
  maxContentItems?: number;
  maxTeamMembers?: number;
  features?: string[];
  customDomain?: string;
}

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
