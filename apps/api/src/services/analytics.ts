/**
 * Analytics Service
 *
 * Business logic for analytics and reporting operations.
 */

import { db } from '@prism-era/db';
import {
  analyticsEvents,
  campaigns,
  content,
  organizationMembers,
} from '@prism-era/db';
import { eq, and, gte, lte, inArray, sql, count, desc, SQL } from 'drizzle-orm';

// Types
export type AnalyticsEventType = 
  | 'content_viewed' | 'content_shared' | 'content_liked'
  | 'campaign_sent' | 'campaign_delivered' | 'campaign_opened' | 'campaign_clicked'
  | 'campaign_bounced' | 'campaign_unsubscribed' | 'campaign_complained'
  | 'lead_captured' | 'form_submitted' | 'purchase_completed' | 'signup_completed'
  | 'session_started' | 'session_ended' | 'page_viewed';

export interface EventMetadata {
  url?: string;
  linkText?: string;
  duration?: number;
  scrollDepth?: number;
  value?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface EventSource {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
}

export interface TrackEventInput {
  organizationId: string;
  eventType: AnalyticsEventType;
  contentId?: string;
  campaignId?: string;
  userId?: string;
  anonymousId?: string;
  sessionId?: string;
  metadata?: EventMetadata;
  source?: EventSource;
  occurredAt?: Date;
}

export interface AnalyticsQueryOptions {
  organizationId: string;
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AnalyticsEventType[];
  contentId?: string;
  campaignId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'event_type';
  page?: number;
  limit?: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  count: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface ContentPerformance {
  contentId: string;
  contentTitle: string;
  views: number;
  shares: number;
  likes: number;
  avgDuration?: number;
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
 * Track an analytics event
 */
export async function trackEvent(input: TrackEventInput) {
  const [event] = await db
    .insert(analyticsEvents)
    .values({
      organizationId: input.organizationId,
      eventType: input.eventType,
      contentId: input.contentId,
      campaignId: input.campaignId,
      userId: input.userId,
      anonymousId: input.anonymousId,
      sessionId: input.sessionId,
      metadata: input.metadata as any,
      source: input.source as any,
      occurredAt: input.occurredAt || new Date(),
    })
    .returning();

  return event;
}

/**
 * Track multiple events in batch
 */
export async function trackEvents(events: TrackEventInput[]) {
  if (events.length === 0) return [];

  const inserted = await db
    .insert(analyticsEvents)
    .values(
      events.map((e) => ({
        organizationId: e.organizationId,
        eventType: e.eventType,
        contentId: e.contentId,
        campaignId: e.campaignId,
        userId: e.userId,
        anonymousId: e.anonymousId,
        sessionId: e.sessionId,
        metadata: e.metadata as any,
        source: e.source as any,
        occurredAt: e.occurredAt || new Date(),
      }))
    )
    .returning();

  return inserted;
}

/**
 * Get analytics events with filtering
 */
export async function getEvents(options: AnalyticsQueryOptions) {
  const {
    organizationId,
    startDate,
    endDate,
    eventTypes,
    contentId,
    campaignId,
    page = 1,
    limit = 100,
  } = options;

  const conditions: SQL[] = [eq(analyticsEvents.organizationId, organizationId)];

  if (startDate) {
    conditions.push(gte(analyticsEvents.occurredAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(analyticsEvents.occurredAt, endDate));
  }

  if (eventTypes && eventTypes.length > 0) {
    conditions.push(inArray(analyticsEvents.eventType, eventTypes));
  }

  if (contentId) {
    conditions.push(eq(analyticsEvents.contentId, contentId));
  }

  if (campaignId) {
    conditions.push(eq(analyticsEvents.campaignId, campaignId));
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(analyticsEvents)
    .where(and(...conditions));

  // Get paginated results
  const results = await db
    .select()
    .from(analyticsEvents)
    .where(and(...conditions))
    .orderBy(desc(analyticsEvents.occurredAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get event counts grouped by time period
 */
export async function getEventTimeSeries(options: AnalyticsQueryOptions): Promise<TimeSeriesDataPoint[]> {
  const {
    organizationId,
    startDate,
    endDate,
    eventTypes,
    groupBy = 'day',
  } = options;

  const conditions: SQL[] = [eq(analyticsEvents.organizationId, organizationId)];

  if (startDate) {
    conditions.push(gte(analyticsEvents.occurredAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(analyticsEvents.occurredAt, endDate));
  }

  if (eventTypes && eventTypes.length > 0) {
    conditions.push(inArray(analyticsEvents.eventType, eventTypes));
  }

  // Determine date truncation format
  const dateFormat = groupBy === 'month' ? 'month' : groupBy === 'week' ? 'week' : 'day';

  const results = await db.execute(sql`
    SELECT 
      DATE_TRUNC(${sql.raw(`'${dateFormat}'`)}, occurred_at) as date,
      COUNT(*) as count
    FROM analytics_events
    WHERE organization_id = ${organizationId}
      ${startDate ? sql`AND occurred_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND occurred_at <= ${endDate}` : sql``}
    GROUP BY DATE_TRUNC(${sql.raw(`'${dateFormat}'`)}, occurred_at)
    ORDER BY date ASC
  `);

  return results.map((row: any) => ({
    date: row.date,
    count: parseInt(row.count),
  }));
}

/**
 * Get event counts by event type
 */
export async function getEventCountsByType(options: AnalyticsQueryOptions) {
  const {
    organizationId,
    startDate,
    endDate,
    contentId,
    campaignId,
  } = options;

  const results = await db.execute(sql`
    SELECT 
      event_type,
      COUNT(*) as count
    FROM analytics_events
    WHERE organization_id = ${organizationId}
      ${startDate ? sql`AND occurred_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND occurred_at <= ${endDate}` : sql``}
      ${contentId ? sql`AND content_id = ${contentId}` : sql``}
      ${campaignId ? sql`AND campaign_id = ${campaignId}` : sql``}
    GROUP BY event_type
    ORDER BY count DESC
  `);

  return results.map((row: any) => ({
    eventType: row.event_type,
    count: parseInt(row.count),
  }));
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignPerformance(
  organizationId: string,
  campaignId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<CampaignPerformance[]> {
  // Get campaigns to analyze
  const campaignsQuery = campaignId
    ? db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.organizationId, organizationId)))
    : db.select().from(campaigns).where(eq(campaigns.organizationId, organizationId));

  const campaignsList = await campaignsQuery;

  if (campaignsList.length === 0) {
    return [];
  }

  // Get campaign events aggregated
  const results = await db.execute(sql`
    SELECT 
      campaign_id,
      event_type,
      COUNT(*) as count
    FROM analytics_events
    WHERE organization_id = ${organizationId}
      ${startDate ? sql`AND occurred_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND occurred_at <= ${endDate}` : sql``}
      AND campaign_id IS NOT NULL
    GROUP BY campaign_id, event_type
  `);

  // Build performance map
  const performanceMap = new Map<string, Map<string, number>>();

  for (const row of results as any[]) {
    const cid = row.campaign_id;
    if (!performanceMap.has(cid)) {
      performanceMap.set(cid, new Map());
    }
    performanceMap.get(cid)!.set(row.event_type, parseInt(row.count));
  }

  // Calculate metrics for each campaign
  return campaignsList.map((campaign) => {
    const events = performanceMap.get(campaign.id) || new Map();

    const sent = events.get('campaign_sent') || 0;
    const delivered = events.get('campaign_delivered') || 0;
    const opened = events.get('campaign_opened') || 0;
    const clicked = events.get('campaign_clicked') || 0;
    const bounced = events.get('campaign_bounced') || 0;
    const unsubscribed = events.get('campaign_unsubscribed') || 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
    };
  });
}

/**
 * Get content performance metrics
 */
export async function getContentPerformance(
  organizationId: string,
  contentId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<ContentPerformance[]> {
  // Get content to analyze
  const contentQuery = contentId
    ? db.select().from(content).where(and(eq(content.id, contentId), eq(content.organizationId, organizationId)))
    : db.select().from(content).where(eq(content.organizationId, organizationId));

  const contentList = await contentQuery;

  if (contentList.length === 0) {
    return [];
  }

  // Get content events aggregated
  const results = await db.execute(sql`
    SELECT 
      content_id,
      event_type,
      COUNT(*) as count,
      AVG((metadata->>'duration')::numeric) as avg_duration
    FROM analytics_events
    WHERE organization_id = ${organizationId}
      ${startDate ? sql`AND occurred_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND occurred_at <= ${endDate}` : sql``}
      AND content_id IS NOT NULL
    GROUP BY content_id, event_type
  `);

  // Build performance map
  const performanceMap = new Map<string, { events: Map<string, number>; avgDuration: number | null }>();

  for (const row of results as any[]) {
    const cid = row.content_id;
    if (!performanceMap.has(cid)) {
      performanceMap.set(cid, { events: new Map(), avgDuration: null });
    }
    performanceMap.get(cid)!.events.set(row.event_type, parseInt(row.count));
    if (row.avg_duration && row.event_type === 'content_viewed') {
      performanceMap.get(cid)!.avgDuration = parseFloat(row.avg_duration);
    }
  }

  // Calculate metrics for each content
  return contentList.map((item) => {
    const data = performanceMap.get(item.id) || { events: new Map(), avgDuration: null };

    return {
      contentId: item.id,
      contentTitle: item.title,
      views: data.events.get('content_viewed') || 0,
      shares: data.events.get('content_shared') || 0,
      likes: data.events.get('content_liked') || 0,
      avgDuration: data.avgDuration ?? undefined,
    };
  });
}

/**
 * Get dashboard summary statistics
 */
export async function getDashboardStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
) {
  // Get total events
  const conditions: SQL[] = [eq(analyticsEvents.organizationId, organizationId)];

  if (startDate) {
    conditions.push(gte(analyticsEvents.occurredAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(analyticsEvents.occurredAt, endDate));
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(analyticsEvents)
    .where(and(...conditions));

  // Get unique visitors (by user_id and anonymous_id)
  const uniqueVisitorsResult = await db.execute(sql`
    SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as count
    FROM analytics_events
    WHERE organization_id = ${organizationId}
      ${startDate ? sql`AND occurred_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND occurred_at <= ${endDate}` : sql``}
  `);

  const uniqueVisitors = parseInt((uniqueVisitorsResult[0] as any)?.count || '0');

  // Get conversion events
  const conversionsResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM analytics_events
    WHERE organization_id = ${organizationId}
      ${startDate ? sql`AND occurred_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND occurred_at <= ${endDate}` : sql``}
      AND event_type IN ('lead_captured', 'form_submitted', 'purchase_completed', 'signup_completed')
  `);

  const conversions = parseInt((conversionsResult[0] as any)?.count || '0');

  return {
    totalEvents: total,
    uniqueVisitors,
    conversions,
    conversionRate: uniqueVisitors > 0 ? (conversions / uniqueVisitors) * 100 : 0,
  };
}
