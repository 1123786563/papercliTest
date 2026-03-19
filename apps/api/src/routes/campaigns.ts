/**
 * Campaigns Routes
 *
 * API endpoints for marketing campaign management operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import * as campaignService from '../services/campaigns';
import type { CampaignStatus, CampaignType, UpdateCampaignInput, CreateCampaignStepInput } from '../services/campaigns';
import { requireAuth, getCurrentUser } from '../middleware/auth';

const campaignsRouter = new Hono();

// All campaign routes require authentication
campaignsRouter.use('*', requireAuth);

// Validation schemas
const campaignSettingsSchema = z.object({
  sendWindow: z.object({
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
    daysOfWeek: z.array(z.number().min(0).max(6)),
  }).optional(),
  throttling: z.object({
    maxPerHour: z.number().positive(),
    maxPerDay: z.number().positive(),
  }).optional(),
  tracking: z.object({
    openTracking: z.boolean(),
    clickTracking: z.boolean(),
  }).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0),
    retryIntervalHours: z.number().positive(),
  }).optional(),
}).optional();

const createCampaignSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  type: z.enum(['drip', 'broadcast', 'nurture', 'onboarding', 're_engagement', 'promotional', 'newsletter']).optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  timezone: z.string().max(100).optional(),
  settings: campaignSettingsSchema,
  audienceIds: z.array(z.string().uuid()).optional(),
  steps: z.array(z.object({
    name: z.string().min(1).max(255),
    order: z.number().int().min(0),
    stepType: z.enum(['content', 'delay', 'condition', 'action']),
    contentId: z.string().uuid().optional(),
    delayHours: z.number().int().min(0).optional(),
    config: z.record(z.unknown()).optional(),
  })).optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: z.enum(['drip', 'broadcast', 'nurture', 'onboarding', 're_engagement', 'promotional', 'newsletter']).optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  timezone: z.string().max(100).optional(),
  settings: campaignSettingsSchema,
});

const createStepSchema = z.object({
  name: z.string().min(1).max(255),
  order: z.number().int().min(0),
  stepType: z.enum(['content', 'delay', 'condition', 'action']),
  contentId: z.string().uuid().optional(),
  delayHours: z.number().int().min(0).optional(),
  config: z.record(z.unknown()).optional(),
});

const updateStepSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  order: z.number().int().min(0).optional(),
  stepType: z.enum(['content', 'delay', 'condition', 'action']).optional(),
  contentId: z.string().uuid().nullable().optional(),
  delayHours: z.number().int().min(0).optional(),
  config: z.record(z.unknown()).optional(),
});

const listQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  status: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'scheduledStart']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
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
  const access = await campaignService.verifyOrganizationAccess(user.userId, organizationId);

  if (!access.hasAccess) {
    throw new HTTPException(403, {
      message: 'You do not have access to this organization',
    });
  }

  return { userId: user.userId, role: access.role };
}

/**
 * POST /campaigns
 * Create new campaign
 */
campaignsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, createCampaignSchema);

  await checkOrgAccess(c, validated.organizationId);

  const input: campaignService.CreateCampaignInput = {
    ...validated,
    scheduledStart: validated.scheduledStart ? new Date(validated.scheduledStart) : undefined,
    scheduledEnd: validated.scheduledEnd ? new Date(validated.scheduledEnd) : undefined,
  };

  try {
    const newCampaign = await campaignService.createCampaign(input);

    return c.json(
      {
        success: true,
        data: newCampaign,
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
 * GET /campaigns
 * List campaigns with filtering and pagination
 */
campaignsRouter.get('/', async (c) => {
  const query = {
    organizationId: c.req.query('organizationId'),
    status: c.req.query('status'),
    type: c.req.query('type'),
    search: c.req.query('search'),
    sortBy: c.req.query('sortBy') as 'createdAt' | 'updatedAt' | 'name' | 'scheduledStart' | undefined,
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

  const validated = result.data;
  await checkOrgAccess(c, validated.organizationId);

  const listResult = await campaignService.listCampaigns({
    organizationId: validated.organizationId,
    status: validated.status?.split(',') as CampaignStatus[] | undefined,
    type: validated.type?.split(',') as CampaignType[] | undefined,
    search: validated.search,
    sortBy: validated.sortBy,
    sortOrder: validated.sortOrder,
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
 * GET /campaigns/stats
 * Get campaign statistics for an organization
 */
campaignsRouter.get('/stats', async (c) => {
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const stats = await campaignService.getCampaignStats(organizationId);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /campaigns/:id
 * Get campaign by ID
 */
campaignsRouter.get('/:id', async (c) => {
  const campaignId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  const result = await campaignService.getCampaignById(campaignId, organizationId);

  if (!result) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * PATCH /campaigns/:id
 * Update campaign
 */
campaignsRouter.patch('/:id', async (c) => {
  const campaignId = c.req.param('id');
  const body = await c.req.json();
  const validated = validateBody(body, updateCampaignSchema);
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  const input: UpdateCampaignInput = {
    ...validated,
    scheduledStart: validated.scheduledStart ? new Date(validated.scheduledStart) : undefined,
    scheduledEnd: validated.scheduledEnd ? new Date(validated.scheduledEnd) : undefined,
  };

  try {
    const updated = await campaignService.updateCampaign(campaignId, organizationId, input);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Campaign not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /campaigns/:id/activate
 * Activate a campaign (set status to active)
 */
campaignsRouter.post('/:id/activate', async (c) => {
  const campaignId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  const { role } = await checkOrgAccess(c, organizationId);

  if (role !== 'owner' && role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Only organization owners and admins can activate campaigns',
    });
  }

  try {
    const updated = await campaignService.updateCampaignStatus(campaignId, organizationId, 'active');

    return c.json({
      success: true,
      data: updated,
      message: 'Campaign activated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Campaign not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /campaigns/:id/pause
 * Pause an active campaign
 */
campaignsRouter.post('/:id/pause', async (c) => {
  const campaignId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    const updated = await campaignService.updateCampaignStatus(campaignId, organizationId, 'paused');

    return c.json({
      success: true,
      data: updated,
      message: 'Campaign paused successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Campaign not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * DELETE /campaigns/:id
 * Delete campaign
 */
campaignsRouter.delete('/:id', async (c) => {
  const campaignId = c.req.param('id');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  const { role } = await checkOrgAccess(c, organizationId);

  if (role !== 'owner' && role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Only organization owners and admins can delete campaigns',
    });
  }

  try {
    await campaignService.deleteCampaign(campaignId, organizationId);

    return c.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Campaign not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /campaigns/:id/steps
 * Add step to campaign
 */
campaignsRouter.post('/:id/steps', async (c) => {
  const campaignId = c.req.param('id');
  const body = await c.req.json();
  const validated = validateBody(body, createStepSchema);
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  // Verify campaign exists
  const campaign = await campaignService.getCampaignById(campaignId, organizationId);
  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  try {
    const step = await campaignService.addCampaignStep(campaignId, validated as CreateCampaignStepInput);

    return c.json({
      success: true,
      data: step,
    }, 201);
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * PATCH /campaigns/:id/steps/:stepId
 * Update campaign step
 */
campaignsRouter.patch('/:id/steps/:stepId', async (c) => {
  const campaignId = c.req.param('id');
  const stepId = c.req.param('stepId');
  const body = await c.req.json();
  const validated = validateBody(body, updateStepSchema);
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    const updated = await campaignService.updateCampaignStep(stepId, campaignId, validated as Partial<CreateCampaignStepInput>);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Campaign step not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * DELETE /campaigns/:id/steps/:stepId
 * Delete campaign step
 */
campaignsRouter.delete('/:id/steps/:stepId', async (c) => {
  const campaignId = c.req.param('id');
  const stepId = c.req.param('stepId');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    await campaignService.deleteCampaignStep(stepId, campaignId);

    return c.json({
      success: true,
      message: 'Campaign step deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Campaign step not found') {
        throw new HTTPException(404, { message: error.message });
      }
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /campaigns/:id/content
 * Link content to campaign
 */
campaignsRouter.post('/:id/content', async (c) => {
  const campaignId = c.req.param('id');
  const body = await c.req.json();
  const organizationId = c.req.query('organizationId');

  const schema = z.object({
    contentId: z.string().uuid(),
    order: z.number().int().min(0).optional(),
  });

  const validated = validateBody(body, schema);

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    const linked = await campaignService.linkContentToCampaign(
      campaignId,
      validated.contentId,
      validated.order || 0
    );

    return c.json({
      success: true,
      data: linked,
    }, 201);
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * DELETE /campaigns/:id/content/:contentId
 * Unlink content from campaign
 */
campaignsRouter.delete('/:id/content/:contentId', async (c) => {
  const campaignId = c.req.param('id');
  const contentId = c.req.param('contentId');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, organizationId);

  try {
    await campaignService.unlinkContentFromCampaign(campaignId, contentId);

    return c.json({
      success: true,
      message: 'Content unlinked from campaign successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * Error handler
 */
campaignsRouter.onError((err, c) => {
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

  console.error('Campaign error:', err);

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

export { campaignsRouter };
