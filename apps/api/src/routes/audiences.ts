/**
 * Audiences Routes
 *
 * API endpoints for audience segment management operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import * as audienceService from '../services/audiences';
import { requireAuth, getCurrentUser } from '../middleware/auth';

const audiencesRouter = new Hono();

// All audience routes require authentication
audiencesRouter.use('*', requireAuth);

// Validation schemas
const segmentConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    'equals', 'not_equals', 'contains', 'not_contains',
    'starts_with', 'ends_with', 'greater_than', 'less_than',
    'is_set', 'is_not_set', 'in_list'
  ]),
  value: z.unknown(),
});

const segmentCriteriaSchema = z.object({
  operator: z.enum(['and', 'or']),
  conditions: z.array(segmentConditionSchema).min(1),
  groups: z.array(z.lazy(() => segmentCriteriaSchema)).optional(),
});

const createAudienceSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  criteria: segmentCriteriaSchema.optional(),
});

const updateAudienceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  criteria: segmentCriteriaSchema.optional(),
});

const listQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/**
 * Validate helper
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
 * Check organization access
 */
async function checkOrgAccess(c: any, organizationId: string) {
  const user = getCurrentUser(c);
  const access = await audienceService.verifyOrganizationAccess(user.userId, organizationId);

  if (!access.hasAccess) {
    throw new HTTPException(403, {
      message: 'You do not have access to this organization',
    });
  }

  return { userId: user.userId, role: access.role };
}

/**
 * POST /audiences
 * Create new audience
 */
audiencesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, createAudienceSchema);

  await checkOrgAccess(c, validated.organizationId);

  try {
    const newAudience = await audienceService.createAudience({
      organizationId: validated.organizationId,
      name: validated.name,
      description: validated.description,
      criteria: validated.criteria as audienceService.SegmentCriteria | undefined,
    });

    return c.json(
      {
        success: true,
        data: newAudience,
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
 * GET /audiences
 * List audiences with filtering and pagination
 */
audiencesRouter.get('/', async (c) => {
  const query = {
    organizationId: c.req.query('organizationId'),
    search: c.req.query('search'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  };

  const result = listQuerySchema.safeParse(query);
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.errors.map((e: any) => e.message).join('. '),
    });
  }

  const validated = result.data;
  await checkOrgAccess(c, validated.organizationId);

  const listResult = await audienceService.listAudiences({
    organizationId: validated.organizationId,
    search: validated.search,
    page: validated.page ? parseInt(validated.page) : 1,
    limit: validated.limit ? Math.min(parseInt(validated.limit), 100) : 20,
  });

  return c.json({
    success: true,
    data: listResult.data,
    pagination: listResult.pagination,
  });
});

/**
 * GET /audiences/stats
 * Get audience statistics for an organization
 */
audiencesRouter.get('/stats', async (c) => {
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const stats = await audienceService.getAudienceStats(organizationId);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /audiences/:id
 * Get audience by ID
 */
audiencesRouter.get('/:id', async (c) => {
  const audienceId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  const result = await audienceService.getAudienceById(audienceId, organizationId);

  if (!result) {
    throw new HTTPException(404, { message: 'Audience not found' });
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * PATCH /audiences/:id
 * Update audience
 */
audiencesRouter.patch('/:id', async (c) => {
  const audienceId = c.req.param('id');
  const body = await c.req.json();
  const validated = validateBody(body, updateAudienceSchema);
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    const updated = await audienceService.updateAudience(audienceId, organizationId, {
      name: validated.name,
      description: validated.description,
      criteria: validated.criteria as audienceService.SegmentCriteria | undefined,
    });

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Audience not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /audiences/:id/recalculate
 * Recalculate audience member count
 */
audiencesRouter.post('/:id/recalculate', async (c) => {
  const audienceId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    const updated = await audienceService.recalculateMemberCount(audienceId, organizationId);

    return c.json({
      success: true,
      data: updated,
      message: 'Audience member count recalculated',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Audience not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * DELETE /audiences/:id
 * Delete audience
 */
audiencesRouter.delete('/:id', async (c) => {
  const audienceId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  const { role } = await checkOrgAccess(c, organizationId);

  if (role !== 'owner' && role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Only organization owners and admins can delete audiences',
    });
  }

  try {
    await audienceService.deleteAudience(audienceId, organizationId);

    return c.json({
      success: true,
      message: 'Audience deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Audience not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * Error handler
 */
audiencesRouter.onError((err, c) => {
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

  console.error('Audience error:', err);

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

export { audiencesRouter };
