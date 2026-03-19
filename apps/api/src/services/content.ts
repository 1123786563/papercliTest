/**
 * Content Service
 *
 * Business logic for content management operations.
 */

import { db } from '@prism-era/db';
import { content, organizations, users, organizationMembers, contentStatusEnum, contentTypeEnum } from '@prism-era/db';
import { eq, and, or, desc, asc, like, inArray, sql, count, SQL } from 'drizzle-orm';

// Types
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
export type ContentType = 'article' | 'social_post' | 'email' | 'landing_page' | 'ad_copy' | 'video_script' | 'other';

export interface CreateContentInput {
  organizationId: string;
  authorId: string;
  title: string;
  slug?: string;
  body: string;
  excerpt?: string;
  type?: ContentType;
  status?: ContentStatus;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateContentInput {
  title?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  type?: ContentType;
  status?: ContentStatus;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContentQueryOptions {
  organizationId: string;
  status?: ContentStatus[];
  type?: ContentType[];
  tags?: string[];
  search?: string;
  authorId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Generate a URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .substring(0, 500);
}

/**
 * Verify user has access to organization
 */
export async function verifyOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<{ hasAccess: boolean; role?: string }> {
  const membership = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      )
    )
    .limit(1);

  if (membership.length === 0) {
    return { hasAccess: false };
  }

  return { hasAccess: true, role: membership[0].role };
}

/**
 * Create new content
 */
export async function createContent(input: CreateContentInput) {
  const slug = input.slug || generateSlug(input.title);

  const [newContent] = await db
    .insert(content)
    .values({
      organizationId: input.organizationId,
      authorId: input.authorId,
      title: input.title,
      slug,
      body: input.body,
      excerpt: input.excerpt || null,
      type: input.type || 'article',
      status: input.status || 'draft',
      metaTitle: input.metaTitle || null,
      metaDescription: input.metaDescription || null,
      keywords: input.keywords || null,
      tags: input.tags || [],
      featuredImageUrl: input.featuredImageUrl || null,
      featuredImageAlt: input.featuredImageAlt || null,
      metadata: input.metadata || null,
    })
    .returning();

  return newContent;
}

/**
 * Get content by ID
 */
export async function getContentById(contentId: string, organizationId: string) {
  const [result] = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.id, contentId),
        eq(content.organizationId, organizationId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Get content by slug
 */
export async function getContentBySlug(slug: string, organizationId: string) {
  const [result] = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.slug, slug),
        eq(content.organizationId, organizationId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * List content with filtering and pagination
 */
export async function listContent(options: ContentQueryOptions) {
  const {
    organizationId,
    status,
    type,
    tags,
    search,
    authorId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = options;

  // Build where conditions
  const conditions: SQL[] = [eq(content.organizationId, organizationId)];

  if (status && status.length > 0) {
    conditions.push(inArray(content.status, status as any));
  }

  if (type && type.length > 0) {
    conditions.push(inArray(content.type, type as any));
  }

  if (authorId) {
    conditions.push(eq(content.authorId, authorId));
  }

  if (search) {
    // Search in title, body, and excerpt
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(content.title, searchPattern),
        like(content.body, searchPattern),
        like(content.excerpt, searchPattern)
      )!
    );
  }

  // Determine sort column
  const sortColumn = sortBy === 'createdAt' ? content.createdAt
    : sortBy === 'updatedAt' ? content.updatedAt
    : sortBy === 'publishedAt' ? content.publishedAt
    : content.title;

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(content)
    .where(and(...conditions));

  // Get paginated results
  const offset = (page - 1) * limit;
  const results = await db
    .select()
    .from(content)
    .where(and(...conditions))
    .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
    .limit(limit)
    .offset(offset);

  // Filter by tags if specified (post-filter for JSONB array)
  let filteredResults = results;
  if (tags && tags.length > 0) {
    filteredResults = results.filter(item => {
      if (!item.tags) return false;
      return tags.some(tag => item.tags!.includes(tag));
    });
  }

  return {
    data: filteredResults,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update content
 */
export async function updateContent(
  contentId: string,
  organizationId: string,
  input: UpdateContentInput
) {
  // Check if content exists and belongs to organization
  const existing = await getContentById(contentId, organizationId);
  if (!existing) {
    throw new Error('Content not found');
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Copy over defined fields
  if (input.title !== undefined) updateData.title = input.title;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.body !== undefined) updateData.body = input.body;
  if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.metaTitle !== undefined) updateData.metaTitle = input.metaTitle;
  if (input.metaDescription !== undefined) updateData.metaDescription = input.metaDescription;
  if (input.keywords !== undefined) updateData.keywords = input.keywords;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.featuredImageUrl !== undefined) updateData.featuredImageUrl = input.featuredImageUrl;
  if (input.featuredImageAlt !== undefined) updateData.featuredImageAlt = input.featuredImageAlt;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  // Auto-publish if status changes to 'published'
  if (input.status === 'published' && existing.status !== 'published') {
    updateData.publishedAt = new Date();
  }

  // Increment version on significant changes
  if (input.body || input.title) {
    updateData.version = existing.version + 1;
  }

  const [updated] = await db
    .update(content)
    .set(updateData)
    .where(eq(content.id, contentId))
    .returning();

  return updated;
}

/**
 * Delete content (soft delete by archiving)
 */
export async function archiveContent(contentId: string, organizationId: string) {
  const existing = await getContentById(contentId, organizationId);
  if (!existing) {
    throw new Error('Content not found');
  }

  const [archived] = await db
    .update(content)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(eq(content.id, contentId))
    .returning();

  return archived;
}

/**
 * Hard delete content
 */
export async function deleteContent(contentId: string, organizationId: string) {
  const existing = await getContentById(contentId, organizationId);
  if (!existing) {
    throw new Error('Content not found');
  }

  await db.delete(content).where(eq(content.id, contentId));

  return { success: true, id: contentId };
}

/**
 * Get content statistics for an organization
 */
export async function getContentStats(organizationId: string) {
  const stats = await db
    .select({
      status: content.status,
      count: count(),
    })
    .from(content)
    .where(eq(content.organizationId, organizationId))
    .groupBy(content.status);

  const result: Record<string, number> = {
    total: 0,
    draft: 0,
    review: 0,
    approved: 0,
    published: 0,
    archived: 0,
  };

  for (const stat of stats) {
    result[stat.status] = stat.count;
    result.total += stat.count;
  }

  return result;
}

/**
 * Get available tags for an organization
 */
export async function getOrganizationTags(organizationId: string): Promise<string[]> {
  const results = await db
    .select({ tags: content.tags })
    .from(content)
    .where(eq(content.organizationId, organizationId));

  const tagSet = new Set<string>();
  for (const item of results) {
    if (item.tags) {
      item.tags.forEach(tag => tagSet.add(tag));
    }
  }

  return Array.from(tagSet).sort();
}
