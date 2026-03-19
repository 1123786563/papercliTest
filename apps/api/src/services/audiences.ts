/**
 * Audiences Service
 *
 * Business logic for audience segment management operations.
 */

import { db } from '@prism-era/db';
import {
  audiences,
  campaigns,
  campaignAudiences,
  organizationMembers,
} from '@prism-era/db';
import { eq, and, or, like, inArray, sql, count, SQL } from 'drizzle-orm';

// Local types
export interface MemberCountStats {
  total: number;
  lastCalculatedAt: string;
}

// Re-export types for use in routes
export type SegmentCriteria = {
  operator: 'and' | 'or';
  conditions: SegmentCondition[];
  groups?: SegmentCriteria[];
};

export type SegmentCondition = {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' |
             'starts_with' | 'ends_with' | 'greater_than' | 'less_than' |
             'is_set' | 'is_not_set' | 'in_list';
  value: unknown;
};

export interface CreateAudienceInput {
  organizationId: string;
  name: string;
  description?: string;
  criteria?: SegmentCriteria;
}

export interface UpdateAudienceInput {
  name?: string;
  description?: string;
  criteria?: SegmentCriteria;
}

export interface AudienceQueryOptions {
  organizationId: string;
  search?: string;
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
 * Create a new audience
 */
export async function createAudience(input: CreateAudienceInput) {
  const memberCount: MemberCountStats = {
    total: 0,
    lastCalculatedAt: new Date().toISOString(),
  };

  const [newAudience] = await db
    .insert(audiences)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      criteria: input.criteria as any,
      memberCount: memberCount as any,
    })
    .returning();

  return newAudience;
}

/**
 * Get audience by ID
 */
export async function getAudienceById(audienceId: string, organizationId: string) {
  const [audience] = await db
    .select()
    .from(audiences)
    .where(
      and(
        eq(audiences.id, audienceId),
        eq(audiences.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!audience) {
    return null;
  }

  // Get linked campaigns
  const linkedCampaigns = await db
    .select({ campaign: campaigns })
    .from(campaignAudiences)
    .innerJoin(campaigns, eq(campaignAudiences.campaignId, campaigns.id))
    .where(eq(campaignAudiences.audienceId, audienceId));

  return {
    ...audience,
    campaigns: linkedCampaigns.map((lc) => lc.campaign),
  };
}

/**
 * List audiences with filtering and pagination
 */
export async function listAudiences(options: AudienceQueryOptions) {
  const {
    organizationId,
    search,
    page = 1,
    limit = 20,
  } = options;

  const conditions: SQL[] = [eq(audiences.organizationId, organizationId)];

  if (search) {
    conditions.push(
      or(
        like(audiences.name, `%${search}%`),
        like(audiences.description, `%${search}%`)
      )!
    );
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(audiences)
    .where(and(...conditions));

  // Get paginated results
  const results = await db
    .select()
    .from(audiences)
    .where(and(...conditions))
    .orderBy(sql`${audiences.createdAt} DESC`)
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
 * Update audience
 */
export async function updateAudience(
  audienceId: string,
  organizationId: string,
  input: UpdateAudienceInput
) {
  const existing = await getAudienceById(audienceId, organizationId);

  if (!existing) {
    throw new Error('Audience not found');
  }

  const [updated] = await db
    .update(audiences)
    .set({
      name: input.name,
      description: input.description,
      criteria: input.criteria as any,
      updatedAt: new Date(),
    })
    .where(eq(audiences.id, audienceId))
    .returning();

  return updated;
}

/**
 * Delete audience
 */
export async function deleteAudience(audienceId: string, organizationId: string) {
  const result = await db
    .delete(audiences)
    .where(
      and(
        eq(audiences.id, audienceId),
        eq(audiences.organizationId, organizationId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error('Audience not found');
  }

  return true;
}

/**
 * Recalculate audience member count
 * This is a placeholder - actual implementation would query user data
 */
export async function recalculateMemberCount(audienceId: string, organizationId: string) {
  const audience = await getAudienceById(audienceId, organizationId);

  if (!audience) {
    throw new Error('Audience not found');
  }

  // TODO: Implement actual member count calculation based on criteria
  // For now, just update the timestamp
  const memberCount: MemberCountStats = {
    total: 0,
    lastCalculatedAt: new Date().toISOString(),
  };

  const [updated] = await db
    .update(audiences)
    .set({
      memberCount: memberCount as any,
      updatedAt: new Date(),
    })
    .where(eq(audiences.id, audienceId))
    .returning();

  return updated;
}

/**
 * Get audience statistics for an organization
 */
export async function getAudienceStats(organizationId: string) {
  const [totalResult] = await db
    .select({ count: count() })
    .from(audiences)
    .where(eq(audiences.organizationId, organizationId));

  // Get total member count across all audiences
  const audiencesList = await db
    .select({ memberCount: audiences.memberCount })
    .from(audiences)
    .where(eq(audiences.organizationId, organizationId));

  const totalMembers = audiencesList.reduce((sum, a) => {
    const mc = a.memberCount as MemberCountStats | null;
    const count = mc?.total || 0;
    return sum + count;
  }, 0);

  return {
    total: totalResult.count,
    totalMembers,
  };
}

/**
 * Validate segment criteria structure
 */
export function validateSegmentCriteria(criteria: unknown): criteria is SegmentCriteria {
  if (!criteria || typeof criteria !== 'object') {
    return false;
  }

  const c = criteria as Record<string, unknown>;

  if (c.operator !== 'and' && c.operator !== 'or') {
    return false;
  }

  if (!Array.isArray(c.conditions)) {
    return false;
  }

  const validOperators = [
    'equals', 'not_equals', 'contains', 'not_contains',
    'starts_with', 'ends_with', 'greater_than', 'less_than',
    'is_set', 'is_not_set', 'in_list'
  ];

  for (const condition of c.conditions) {
    if (!condition || typeof condition !== 'object') {
      return false;
    }
    const cond = condition as Record<string, unknown>;
    if (typeof cond.field !== 'string' || !validOperators.includes(cond.operator as string)) {
      return false;
    }
  }

  return true;
}
