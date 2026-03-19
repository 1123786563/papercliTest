import { pgTable, text, timestamp, varchar, boolean, uuid, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';

/**
 * Content Type Enum
 * Different types of marketing content
 */
export const contentTypeEnum = pgEnum('content_type', [
  'article',      // Long-form blog/article
  'social_post',  // Social media post
  'email',        // Email content
  'landing_page', // Landing page copy
  'ad_copy',      // Advertisement copy
  'video_script', // Video script
  'other',        // Other content types
]);

/**
 * Content Status Enum
 */
export const contentStatusEnum = pgEnum('content_status', [
  'draft',      // Work in progress
  'review',     // Pending review
  'approved',   // Approved for publishing
  'published',  // Live/published
  'archived',   // Archived/removed
]);

/**
 * Types for metadata
 * Flexible metadata for type-specific content attributes
 */
export type ContentMetadata = {
  // For social posts
  platform?: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'weibo' | 'wechat';
  characterCount?: number;

  // For emails
  subject?: string;
  preheader?: string;

  // For video scripts
  duration?: number; // in seconds
  platformRequirements?: string[];

  // For ads
  ctaText?: string;
  targetUrl?: string;

  // Custom fields
  [key: string]: unknown;
};

/**
 * Content Table
 *
 * Stores all marketing content items with flexible metadata.
 * Supports various content types for marketing automation.
 *
 * Indexes:
 * - organization_id + status - Filter content by org and status
 * - author_id - Find content by author
 * - published_at - Find recently published content
 */
export const content = pgTable('content', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),

  // Content basics
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }),

  // Main content - supports markdown, HTML, or plain text
  body: text('body').notNull(),

  // Excerpt/summary for previews
  excerpt: text('excerpt'),

  // Content classification
  type: contentTypeEnum('type').notNull().default('article'),
  status: contentStatusEnum('status').notNull().default('draft'),

  // SEO metadata
  metaTitle: varchar('meta_title', { length: 500 }),
  metaDescription: text('meta_description'),
  keywords: jsonb('keywords').$type<string[]>(),

  // Tags for content organization
  tags: jsonb('tags').$type<string[]>().default([]),

  // Featured image
  featuredImageUrl: text('featured_image_url'),
  featuredImageAlt: varchar('featured_image_alt', { length: 500 }),

  // Flexible metadata for type-specific attributes
  metadata: jsonb('metadata').$type<ContentMetadata>(),

  // Version control
  version: integer('version').notNull().default(1),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

// Relations
export const contentRelations = relations(content, ({ one }) => ({
  organization: one(organizations, {
    fields: [content.organizationId],
    references: [organizations.id],
  }),
  author: one(users, {
    fields: [content.authorId],
    references: [users.id],
  }),
}));

export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;
