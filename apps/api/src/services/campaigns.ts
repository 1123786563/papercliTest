/**
 * Campaigns Service
 *
 * Business logic for marketing campaign management operations.
 */

import { db } from '@prism-era/db';
import {
  campaigns,
  campaignSteps,
  campaignContent,
  audiences,
  campaignAudiences,
  content,
  organizationMembers,
} from '@prism-era/db';
import { eq, and, or, desc, asc, like, inArray, sql, count, SQL } from 'drizzle-orm';

// Types
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignType = 'drip' | 'broadcast' | 'nurture' | 'onboarding' | 're_engagement' | 'promotional' | 'newsletter';

export interface CampaignSettings {
  sendWindow?: {
    startHour: number;
    endHour: number;
    daysOfWeek: number[];
  };
  throttling?: {
    maxPerHour: number;
    maxPerDay: number;
  };
  tracking?: {
    openTracking: boolean;
    clickTracking: boolean;
  };
  retryPolicy?: {
    maxRetries: number;
    retryIntervalHours: number;
  };
}

export interface CreateCampaignInput {
  organizationId: string;
  name: string;
  description?: string;
  type?: CampaignType;
  status?: CampaignStatus;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  timezone?: string;
  settings?: CampaignSettings;
  audienceIds?: string[];
  steps?: CreateCampaignStepInput[];
}

export interface CreateCampaignStepInput {
  name: string;
  order: number;
  stepType: 'content' | 'delay' | 'condition' | 'action';
  contentId?: string;
  delayHours?: number;
  config?: Record<string, unknown>;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  type?: CampaignType;
  status?: CampaignStatus;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  timezone?: string;
  settings?: CampaignSettings;
}

export interface CampaignQueryOptions {
  organizationId: string;
  status?: CampaignStatus[];
  type?: CampaignType[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'scheduledStart';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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
 * Create a new campaign
 */
export async function createCampaign(input: CreateCampaignInput) {
  const { audienceIds, steps, ...campaignData } = input;

  // Insert campaign
  const [newCampaign] = await db
    .insert(campaigns)
    .values({
      ...campaignData,
      status: campaignData.status || 'draft',
      type: campaignData.type || 'broadcast',
      timezone: campaignData.timezone || 'UTC',
    })
    .returning();

  // Link audiences if provided
  if (audienceIds && audienceIds.length > 0) {
    await db.insert(campaignAudiences).values(
      audienceIds.map((audienceId) => ({
        campaignId: newCampaign.id,
        audienceId,
      }))
    );
  }

  // Create steps if provided
  if (steps && steps.length > 0) {
    await db.insert(campaignSteps).values(
      steps.map((step) => ({
        ...step,
        campaignId: newCampaign.id,
      }))
    );
  }

  return getCampaignById(newCampaign.id, newCampaign.organizationId);
}

/**
 * Get campaign by ID with related data
 */
export async function getCampaignById(campaignId: string, organizationId: string) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.id, campaignId),
        eq(campaigns.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!campaign) {
    return null;
  }

  // Get steps
  const steps = await db
    .select()
    .from(campaignSteps)
    .where(eq(campaignSteps.campaignId, campaignId))
    .orderBy(asc(campaignSteps.order));

  // Get linked audiences
  const linkedAudiences = await db
    .select({ audience: audiences })
    .from(campaignAudiences)
    .innerJoin(audiences, eq(campaignAudiences.audienceId, audiences.id))
    .where(eq(campaignAudiences.campaignId, campaignId));

  // Get linked content
  const linkedContent = await db
    .select({ content: content, campaignContent: campaignContent })
    .from(campaignContent)
    .innerJoin(content, eq(campaignContent.contentId, content.id))
    .where(eq(campaignContent.campaignId, campaignId))
    .orderBy(asc(campaignContent.order));

  return {
    ...campaign,
    steps,
    audiences: linkedAudiences.map((la) => la.audience),
    contentItems: linkedContent,
  };
}

/**
 * List campaigns with filtering and pagination
 */
export async function listCampaigns(options: CampaignQueryOptions) {
  const {
    organizationId,
    status,
    type,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = options;

  const conditions: SQL[] = [eq(campaigns.organizationId, organizationId)];

  if (status && status.length > 0) {
    conditions.push(inArray(campaigns.status, status));
  }

  if (type && type.length > 0) {
    conditions.push(inArray(campaigns.type, type));
  }

  if (search) {
    conditions.push(
      or(
        like(campaigns.name, `%${search}%`),
        like(campaigns.description, `%${search}%`)
      )!
    );
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(campaigns)
    .where(and(...conditions));

  // Get paginated results
  const orderFn = sortOrder === 'asc' ? asc : desc;
  const orderByColumn = campaigns[sortBy];

  const results = await db
    .select()
    .from(campaigns)
    .where(and(...conditions))
    .orderBy(orderFn(orderByColumn))
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
 * Update campaign
 */
export async function updateCampaign(
  campaignId: string,
  organizationId: string,
  input: UpdateCampaignInput
) {
  const existing = await getCampaignById(campaignId, organizationId);

  if (!existing) {
    throw new Error('Campaign not found');
  }

  const [updated] = await db
    .update(campaigns)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId))
    .returning();

  return updated;
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  campaignId: string,
  organizationId: string,
  status: CampaignStatus
) {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'active') {
    updateData.startedAt = new Date();
  } else if (status === 'completed' || status === 'cancelled') {
    updateData.completedAt = new Date();
  }

  const [updated] = await db
    .update(campaigns)
    .set(updateData)
    .where(
      and(
        eq(campaigns.id, campaignId),
        eq(campaigns.organizationId, organizationId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Campaign not found');
  }

  return updated;
}

/**
 * Delete campaign
 */
export async function deleteCampaign(campaignId: string, organizationId: string) {
  const result = await db
    .delete(campaigns)
    .where(
      and(
        eq(campaigns.id, campaignId),
        eq(campaigns.organizationId, organizationId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error('Campaign not found');
  }

  return true;
}

/**
 * Add step to campaign
 */
export async function addCampaignStep(
  campaignId: string,
  input: CreateCampaignStepInput
) {
  const [step] = await db
    .insert(campaignSteps)
    .values({
      ...input,
      campaignId,
    })
    .returning();

  return step;
}

/**
 * Update campaign step
 */
export async function updateCampaignStep(
  stepId: string,
  campaignId: string,
  input: Partial<CreateCampaignStepInput>
) {
  const [updated] = await db
    .update(campaignSteps)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(campaignSteps.id, stepId),
        eq(campaignSteps.campaignId, campaignId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Campaign step not found');
  }

  return updated;
}

/**
 * Delete campaign step
 */
export async function deleteCampaignStep(stepId: string, campaignId: string) {
  const result = await db
    .delete(campaignSteps)
    .where(
      and(
        eq(campaignSteps.id, stepId),
        eq(campaignSteps.campaignId, campaignId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error('Campaign step not found');
  }

  return true;
}

/**
 * Link content to campaign
 */
export async function linkContentToCampaign(
  campaignId: string,
  contentId: string,
  order: number = 0
) {
  const [linked] = await db
    .insert(campaignContent)
    .values({
      campaignId,
      contentId,
      order,
    })
    .returning();

  return linked;
}

/**
 * Unlink content from campaign
 */
export async function unlinkContentFromCampaign(
  campaignId: string,
  contentId: string
) {
  await db
    .delete(campaignContent)
    .where(
      and(
        eq(campaignContent.campaignId, campaignId),
        eq(campaignContent.contentId, contentId)
      )
    );

  return true;
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(organizationId: string) {
  const [totalResult] = await db
    .select({ count: count() })
    .from(campaigns)
    .where(eq(campaigns.organizationId, organizationId));

  const statusCounts = await db
    .select({
      status: campaigns.status,
      count: count(),
    })
    .from(campaigns)
    .where(eq(campaigns.organizationId, organizationId))
    .groupBy(campaigns.status);

  const typeCounts = await db
    .select({
      type: campaigns.type,
      count: count(),
    })
    .from(campaigns)
    .where(eq(campaigns.organizationId, organizationId))
    .groupBy(campaigns.type);

  return {
    total: totalResult.count,
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s.count])),
    byType: Object.fromEntries(typeCounts.map((t) => [t.type, t.count])),
  };
}
