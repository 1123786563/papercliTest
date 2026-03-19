/**
 * Analytics Routes
 *
 * API endpoints for analytics and reporting operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import * as analyticsService from '../services/analytics';
import type { AnalyticsEventType } from '../services/analytics';
import { requireAuth, getCurrentUser, optionalAuth } from '../middleware/auth';

const analyticsRouter = new Hono();

// Validation schemas
const trackEventSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  eventType: z.enum([
    'content_viewed', 'content_shared', 'content_liked',
    'campaign_sent', 'campaign_delivered', 'campaign_opened', 'campaign_clicked',
    'campaign_bounced', 'campaign_unsubscribed', 'campaign_complained',
    'lead_captured', 'form_submitted', 'purchase_completed', 'signup_completed',
    'session_started', 'session_ended', 'page_viewed',
  ]),
  contentId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  anonymousId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  source: z.object({
    referrer: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmContent: z.string().optional(),
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
  }).optional(),
  occurredAt: z.string().datetime().optional(),
});

const trackBatchSchema = z.object({
  events: z.array(trackEventSchema).min(1).max(100),
});

const querySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventTypes: z.string().optional(),
  contentId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'event_type']).optional(),
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
  const access = await analyticsService.verifyOrganizationAccess(user.userId, organizationId);

  if (!access.hasAccess) {
    throw new HTTPException(403, {
      message: 'You do not have access to this organization',
    });
  }

  return { userId: user.userId, role: access.role };
}

/**
 * POST /analytics/track
 * Track a single analytics event
 * Uses optionalAuth to allow anonymous tracking
 */
analyticsRouter.post('/track', optionalAuth, async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, trackEventSchema);

  // For authenticated users, verify org access
  const user = c.get('user');
  if (user) {
    await checkOrgAccess(c, validated.organizationId);
  }

  const input: analyticsService.TrackEventInput = {
    ...validated,
    occurredAt: validated.occurredAt ? new Date(validated.occurredAt) : undefined,
    userId: validated.userId || user?.userId,
  };

  try {
    const event = await analyticsService.trackEvent(input);

    return c.json(
      {
        success: true,
        data: event,
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
 * POST /analytics/track/batch
 * Track multiple analytics events in batch
 */
analyticsRouter.post('/track/batch', optionalAuth, async (c) => {
  const body = await c.req.json();
  const validated = validateBody(body, trackBatchSchema);

  // For authenticated users, verify org access for all events
  const user = c.get('user');
  if (user) {
    // All events should be for the same org (validate first event)
    const orgId = validated.events[0].organizationId;
    await checkOrgAccess(c, orgId);
  }

  const events = validated.events.map((e) => ({
    ...e,
    occurredAt: e.occurredAt ? new Date(e.occurredAt) : undefined,
    userId: e.userId || user?.userId,
  }));

  try {
    const inserted = await analyticsService.trackEvents(events);

    return c.json(
      {
        success: true,
        data: inserted,
        count: inserted.length,
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
 * GET /analytics/events
 * Get analytics events with filtering
 */
analyticsRouter.get('/events', requireAuth, async (c) => {
  const query = {
    organizationId: c.req.query('organizationId'),
    startDate: c.req.query('startDate'),
    endDate: c.req.query('endDate'),
    eventTypes: c.req.query('eventTypes'),
    contentId: c.req.query('contentId'),
    campaignId: c.req.query('campaignId'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  };

  const result = querySchema.safeParse(query);
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.errors.map((e: any) => e.message).join('. '),
    });
  }

  const validated = result.data;
  await checkOrgAccess(c, validated.organizationId);

  const eventsResult = await analyticsService.getEvents({
    organizationId: validated.organizationId,
    startDate: validated.startDate ? new Date(validated.startDate) : undefined,
    endDate: validated.endDate ? new Date(validated.endDate) : undefined,
    eventTypes: validated.eventTypes?.split(',') as AnalyticsEventType[] | undefined,
    contentId: validated.contentId,
    campaignId: validated.campaignId,
    page: validated.page ? parseInt(validated.page) : 1,
    limit: validated.limit ? Math.min(parseInt(validated.limit), 100) : 50,
  });

  return c.json({
    success: true,
    data: eventsResult.data,
    pagination: eventsResult.pagination,
  });
});

/**
 * GET /analytics/timeseries
 * Get event counts over time
 */
analyticsRouter.get('/timeseries', requireAuth, async (c) => {
  const query = {
    organizationId: c.req.query('organizationId'),
    startDate: c.req.query('startDate'),
    endDate: c.req.query('endDate'),
    eventTypes: c.req.query('eventTypes'),
    groupBy: c.req.query('groupBy') as 'day' | 'week' | 'month' | undefined,
  };

  const result = querySchema.safeParse(query);
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.errors.map((e: any) => e.message).join('. '),
    });
  }

  const validated = result.data;
  await checkOrgAccess(c, validated.organizationId);

  if (!validated.startDate || !validated.endDate) {
    throw new HTTPException(400, {
      message: 'startDate and endDate are required for timeseries queries',
    });
  }

  const timeseries = await analyticsService.getEventTimeSeries({
    organizationId: validated.organizationId,
    startDate: new Date(validated.startDate),
    endDate: new Date(validated.endDate),
    eventTypes: validated.eventTypes?.split(',') as AnalyticsEventType[] | undefined,
    groupBy: validated.groupBy || 'day',
  });

  return c.json({
    success: true,
    data: timeseries,
  });
});

/**
 * GET /analytics/counts
 * Get event counts grouped by event type
 */
analyticsRouter.get('/counts', requireAuth, async (c) => {
  const organizationId = c.req.query('organizationId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const contentId = c.req.query('contentId');
  const campaignId = c.req.query('campaignId');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const counts = await analyticsService.getEventCountsByType({
    organizationId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    contentId: contentId,
    campaignId: campaignId,
  });

  return c.json({
    success: true,
    data: counts,
  });
});

/**
 * GET /analytics/campaigns/:campaignId/performance
 * Get performance metrics for a specific campaign
 */
analyticsRouter.get('/campaigns/:campaignId/performance', requireAuth, async (c) => {
  const campaignId = c.req.param('campaignId');
  const organizationId = c.req.query('organizationId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const performance = await analyticsService.getCampaignPerformance(
    organizationId,
    campaignId,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  if (performance.length === 0) {
    throw new HTTPException(404, { message: 'Campaign not found or no data available' });
  }

  return c.json({
    success: true,
    data: performance[0],
  });
});

/**
 * GET /analytics/campaigns/performance
 * Get performance metrics for all campaigns
 */
analyticsRouter.get('/campaigns/performance', requireAuth, async (c) => {
  const organizationId = c.req.query('organizationId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const performance = await analyticsService.getCampaignPerformance(
    organizationId,
    undefined,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  return c.json({
    success: true,
    data: performance,
  });
});

/**
 * GET /analytics/content/:contentId/performance
 * Get performance metrics for specific content
 */
analyticsRouter.get('/content/:contentId/performance', requireAuth, async (c) => {
  const contentId = c.req.param('contentId');
  const organizationId = c.req.query('organizationId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const performance = await analyticsService.getContentPerformance(
    organizationId,
    contentId,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  if (performance.length === 0) {
    throw new HTTPException(404, { message: 'Content not found or no data available' });
  }

  return c.json({
    success: true,
    data: performance[0],
  });
});

/**
 * GET /analytics/content/performance
 * Get performance metrics for all content
 */
analyticsRouter.get('/content/performance', requireAuth, async (c) => {
  const organizationId = c.req.query('organizationId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const performance = await analyticsService.getContentPerformance(
    organizationId,
    undefined,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  return c.json({
    success: true,
    data: performance,
  });
});

/**
 * GET /analytics/dashboard
 * Get dashboard summary statistics
 */
analyticsRouter.get('/dashboard', requireAuth, async (c) => {
  const organizationId = c.req.query('organizationId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!organizationId) {
    throw new HTTPException(400, { message: 'organizationId is required' });
  }

  await checkOrgAccess(c, organizationId);

  const stats = await analyticsService.getDashboardStats(
    organizationId,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * Error handler
 */
analyticsRouter.onError((err, c) => {
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

  console.error('Analytics error:', err);

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

export { analyticsRouter };
