import { pgTable, text, timestamp, varchar, boolean, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizationMembers } from './organizations';
import { content } from './content';
import { analyticsEvents } from './analytics';

/**
 * Users Table
 *
 * Stores user account information. Authentication supports both:
 * - Clerk (external auth provider)
 * - Local JWT (email/password with bcrypt)
 *
 * Indexes:
 * - clerk_id (unique) - For Clerk auth integration
 * - email (unique) - For email lookups
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Clerk authentication integration (nullable for local auth users)
  clerkId: varchar('clerk_id', { length: 255 }).unique(),

  // Local authentication (nullable for Clerk users)
  passwordHash: varchar('password_hash', { length: 255 }),

  // Profile information
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),

  // Role: 'owner' | 'admin' | 'member' | 'viewer'
  role: varchar('role', { length: 50 }).notNull().default('member'),

  // Account status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizationMembers),
  content: many(content),
  analyticsEvents: many(analyticsEvents),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
