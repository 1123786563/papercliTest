/**
 * Content Routes
 *
 * API endpoints for content management operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import * as contentService from '../services/content';
import type { ContentStatus, ContentType, UpdateContentInput } from '../services/content';
import { requireAuth, getCurrentUser } from '../middleware/auth';

const content = new Hono();

// All content routes require authentication
content.use('*', requireAuth);

// Validation schemas
const createContentSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  slug: z.string().max(500).optional(),
  body: z.string().min(1, 'Body content is required'),
  excerpt: z.string().optional(),
  type: z.enum(['article', 'social_post', 'email', 'landing_page', 'ad_copy', 'video_script', 'other']).optional(),
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  metaTitle: z.string().max(500).optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  featuredImageUrl: z.string().url().optional(),
  featuredImageAlt: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().max(500).optional(),
  body: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  type: z.enum(['article', 'social_post', 'email', 'landing_page', 'ad_copy', 'video_script', 'other']).optional(),
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  metaTitle: z.string().max(500).optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  featuredImageUrl: z.string().url().optional().nullable(),
  featuredImageAlt: z.string().max(500).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const listQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  status: z.string().optional(),
  type: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  authorId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/**
 * Validate request body helper
 */
function validateBody<T extends z.ZodType<any, any>>(
  body: unknown,
  schema: T
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.errors.map((e: any) => e.message).join('. '),
    });
  }
  return result.data;
}

/**
 * Validate query params helper
 */
function validateQuery(c: any) {
  const query = {
    organizationId: c.req.query('organizationId'),
    status: c.req.query('status'),
    type: c.req.query('type'),
    tags: c.req.query('tags'),
    search: c.req.query('search'),
    authorId: c.req.query('authorId'),
    sortBy: c.req.query('sortBy') as 'createdAt' | 'updatedAt' | 'publishedAt' | 'title' | undefined,
    sortOrder: c.req.query('sortOrder') as 'asc' | 'desc' | undefined,
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  };

  const result = listQuerySchema.safeParse(query);
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.errors.map((e: any) => e.message).join('. '),
    });
  }

  const data = result.data;
  return {
    organizationId: data.organizationId,
    status: data.status?.split(',') as ContentStatus[] | undefined,
    type: data.type?.split(',') as ContentType[] | undefined,
    tags: data.tags?.split(','),
    search: data.search,
    authorId: data.authorId,
    sortBy: data.sortBy,
    sortOrder: data.sortOrder,
    page: data.page ? parseInt(data.page) : 1,
    limit: data.limit ? Math.min(parseInt(data.limit), 100) : 20,
  };
}

/**
 * Check organization access
 */
async function checkOrgAccess(c: any, organizationId: string) {
  const user = getCurrentUser(c);
  const access = await contentService.verifyOrganizationAccess(user.userId, organizationId);
  
  if (!access.hasAccess) {
    throw new HTTPException(403, {
      message: 'You do not have access to this organization',
    });
  }
  
  return { userId: user.userId, role: access.role };
}

/**
 * POST /content
 * Create new content
 */
content.post('/', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, createContentSchema);
  const user = getCurrentUser(c);

  // Verify organization access
  await checkOrgAccess(c, validated.organizationId);

  try {
    const newContent = await contentService.createContent({
      ...validated,
      authorId: user.userId,
    });

    return c.json(
      {
        success: true,
        data: newContent,
      },
      201
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * GET /content
 * List content with filtering and pagination
 */
content.get('/', async (c) => {
  const validated = validateQuery(c);

  // Verify organization access
  await checkOrgAccess(c, validated.organizationId);

  try {
    const result = await contentService.listContent(validated);

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * GET /content/stats
 * Get content statistics for an organization
 */
content.get('/stats', async (c) => {
  const organizationId = c.req.query('organizationId');
  
  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const stats = await contentService.getContentStats(organizationId);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /content/tags
 * Get all available tags for an organization
 */
content.get('/tags', async (c) => {
  const organizationId = c.req.query('organizationId');
  
  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const tags = await contentService.getOrganizationTags(organizationId);

  return c.json({
    success: true,
    data: tags,
  });
});

/**
 * GET /content/:id
 * Get content by ID
 */
content.get('/:id', async (c) => {
  const contentId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  const result = await contentService.getContentById(contentId, organizationId);

  if (!result) {
    throw new HTTPException(404, { message: 'Content not found' });
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /content/slug/:slug
 * Get content by slug
 */
content.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  const result = await contentService.getContentBySlug(slug, organizationId);

  if (!result) {
    throw new HTTPException(404, { message: 'Content not found' });
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * PATCH /content/:id
 * Update content
 */
content.patch('/:id', async (c) => {
  const contentId = c.req.param('id');
  const body = await c.req.json();
  const validated = validateBody(body, updateContentSchema);
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    const updated = await contentService.updateContent(contentId, organizationId, validated as UpdateContentInput);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Content not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * DELETE /content/:id
 * Delete content (hard delete)
 */
content.delete('/:id', async (c) => {
  const contentId = c.req.param('id');
  const organizationId = c.req.query('organizationId');
  const soft = c.req.query('soft') === 'true';

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  const { role } = await checkOrgAccess(c, organizationId);

  // Only owner and admin can delete content
  if (role !== 'owner' && role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Only organization owners and admins can delete content',
    });
  }

  try {
    if (soft) {
      await contentService.archiveContent(contentId, organizationId);
    } else {
      await contentService.deleteContent(contentId, organizationId);
    }

    return c.json({
      success: true,
      message: soft ? 'Content archived successfully' : 'Content deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Content not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * Error handler for content routes
 */
content.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: err.status,
        },
      },
      err.status
    );
  }

  console.error('Content error:', err);

  return c.json(
    {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 500,
      },
    },
    500
  );
});

export { content as contentRoutes };
