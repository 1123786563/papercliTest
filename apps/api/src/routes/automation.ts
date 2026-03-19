/**
 * Automation Routes
 *
 * API endpoints for marketing automation rule engine operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import * as automationService from '../services/automation';
import * as campaignService from '../services/campaigns';
import { requireAuth, getCurrentUser } from '../middleware/auth';

const automationRouter = new Hono();

// All automation routes require authentication
automationRouter.use('*', requireAuth);

// Validation schemas
const triggerConfigSchema = z.object({
  type: z.enum([
    'event', 'time', 'segment_enter', 'segment_exit',
    'form_submit', 'page_view', 'email_opened', 'email_clicked',
    'tag_added', 'tag_removed',
  ]),
  config: z.record(z.unknown()),
});

const actionConfigSchema = z.object({
  type: z.enum([
    'send_email', 'add_tag', 'remove_tag', 'notify_webhook',
    'add_to_segment', 'remove_from_segment', 'wait', 'conditional', 'update_field',
  ]),
  order: z.number().int().min(0),
  config: z.record(z.unknown()),
  delayMinutes: z.number().int().min(0).optional(),
});

const conditionConfigSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals', 'not_equals', 'contains', 'not_contains',
    'greater_than', 'less_than', 'in', 'not_in',
    'exists', 'not_exists', 'starts_with', 'ends_with',
  ]),
  value: z.unknown(),
});

const processTriggerSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  trigger: triggerConfigSchema,
  context: z.object({
    userId: z.string().uuid().optional(),
    anonymousId: z.string().optional(),
    eventData: z.record(z.unknown()).optional(),
    userData: z.record(z.unknown()).optional(),
  }),
});

const scheduleAutomationSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  scheduledAt: z.string().datetime(),
  targetData: z.object({
    userId: z.string().uuid().optional(),
    anonymousId: z.string().optional(),
  }),
});

const evaluateSegmentSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  criteria: z.object({
    operator: z.enum(['and', 'or']),
    conditions: z.array(conditionConfigSchema).min(1),
  }),
  userData: z.record(z.unknown()),
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
  const access = await automationService.verifyOrganizationAccess(user.userId, organizationId);

  if (!access.hasAccess) {
    throw new HTTPException(403, {
      message: 'You do not have access to this organization',
    });
  }

  return { userId: user.userId, role: access.role };
}

/**
 * POST /automation/trigger
 * Process an automation trigger
 * This is the main endpoint for triggering automation workflows
 */
automationRouter.post('/trigger', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, processTriggerSchema);

  const { role } = await checkOrgAccess(c, validated.organizationId);

  // Only admins and owners can manually trigger automations
  if (role !== 'owner' && role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Only organization owners and admins can trigger automations',
    });
  }

  try {
    const results = await automationService.processTrigger(
      validated.organizationId,
      validated.trigger,
      validated.context
    );

    return c.json({
      success: true,
      data: results,
      executedCount: results.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /automation/schedule
 * Schedule an automation for future execution
 */
automationRouter.post('/schedule', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, scheduleAutomationSchema);

  // Verify campaign access
  const campaign = await campaignService.getCampaignById(
    validated.campaignId,
    c.req.query('organizationId') || ''
  );

  if (!campaign) {
    // Need organizationId to verify access
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  await checkOrgAccess(c, campaign.organizationId);

  try {
    const result = await automationService.scheduleAutomation(
      validated.campaignId,
      new Date(validated.scheduledAt),
      validated.targetData
    );

    return c.json({
      success: true,
      data: result,
      message: 'Automation scheduled successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

/**
 * POST /automation/evaluate-segment
 * Evaluate if a user matches segment criteria
 */
automationRouter.post('/evaluate-segment', async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, evaluateSegmentSchema);

  await checkOrgAccess(c, validated.organizationId);

  const matches = await automationService.evaluateSegmentCriteria(
    validated.criteria,
    validated.userData
  );

  return c.json({
    success: true,
    data: {
      matches,
      criteria: validated.criteria,
    },
  });
});

/**
 * GET /automation/history
 * Get automation execution history
 */
automationRouter.get('/history', async (c) => {
  const organizationId = c.req.query('organizationId');
  const campaignId = c.req.query('campaignId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const limit = c.req.query('limit');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const history = await automationService.getExecutionHistory(
    organizationId,
    campaignId,
    {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
    }
  );

  return c.json({
    success: true,
    data: history,
  });
});

/**
 * POST /automation/validate
 * Validate an automation rule configuration
 */
automationRouter.post('/validate', async (c) => {
  const body = await c.req.json();

  const ruleSchema = z.object({
    name: z.string().optional(),
    trigger: z.object({
      type: z.string(),
    }).optional(),
    actions: z.array(z.object({
      type: z.string(),
      order: z.number(),
    })).optional(),
  });

  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: 'Invalid rule structure',
    });
  }

  const result = automationService.validateAutomationRule(parsed.data as any);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /automation/campaigns/:campaignId/activate
 * Activate automation for a campaign
 */
automationRouter.post('/campaigns/:campaignId/activate', async (c) => {
  const campaignId = c.req.param('campaignId');
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId query parameter is required' });
  }

  const { role } = await checkOrgAccess(c, organizationId);

  if (role !== 'owner' && role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Only organization owners and admins can activate automations',
    });
  }

  try {
    const updated = await campaignService.updateCampaignStatus(campaignId, organizationId, 'active');

    return c.json({
      success: true,
      data: updated,
      message: 'Campaign automation activated successfully',
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
 * POST /automation/campaigns/:campaignId/pause
 * Pause automation for a campaign
 */
automationRouter.post('/campaigns/:campaignId/pause', async (c) => {
  const campaignId = c.req.param('campaignId');
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
      message: 'Campaign automation paused successfully',
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
 * Error handler
 */
automationRouter.onError((err, c) => {
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

  console.error('Automation error:', err);

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

export { automationRouter };
