/**
 * Automation Service
 *
 * Business logic for marketing automation rule engine.
 * Supports trigger-based automation rules for campaign execution.
 */

import { db } from '@prism-era/db';
import {
  campaigns,
  campaignSteps,
  analyticsEvents,
  organizationMembers,
} from '@prism-era/db';
import { eq, and, inArray, sql, SQL } from 'drizzle-orm';

// Types
export type TriggerType = 
  | 'event'           // Trigger on specific event
  | 'time'            // Trigger at scheduled time
  | 'segment_enter'   // User enters segment
  | 'segment_exit'    // User exits segment
  | 'form_submit'     // Form submitted
  | 'page_view'       // Page viewed
  | 'email_opened'    // Email opened
  | 'email_clicked'   // Email clicked
  | 'tag_added'       // Tag added to user
  | 'tag_removed';    // Tag removed from user

export type ActionType =
  | 'send_email'      // Send email
  | 'add_tag'         // Add tag to user
  | 'remove_tag'      // Remove tag from user
  | 'notify_webhook'  // Call webhook
  | 'add_to_segment'  // Add user to segment
  | 'remove_from_segment' // Remove user from segment
  | 'wait'            // Wait for duration
  | 'conditional'     // Conditional branch
  | 'update_field';   // Update user field

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  enabled: boolean;
  trigger: TriggerConfig;
  actions: ActionConfig[];
  conditions?: ConditionConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerConfig {
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface ActionConfig {
  type: ActionType;
  order: number;
  config: Record<string, unknown>;
  delayMinutes?: number;
}

export interface ConditionConfig {
  field: string;
  operator: string;
  value: unknown;
}

export interface ExecutionResult {
  success: boolean;
  ruleId: string;
  userId?: string;
  anonymousId?: string;
  executedAt: Date;
  actionsExecuted: number;
  errors?: string[];
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
 * Evaluate if a segment criteria matches a user
 */
export async function evaluateSegmentCriteria(
  criteria: any,
  userData: Record<string, unknown>
): Promise<boolean> {
  if (!criteria || !criteria.conditions || criteria.conditions.length === 0) {
    return true;
  }

  const results = criteria.conditions.map((condition: ConditionConfig) => {
    const fieldValue = userData[condition.field];
    return evaluateCondition(condition, fieldValue);
  });

  // AND logic: all conditions must be true
  if (criteria.operator === 'and') {
    return results.every(Boolean);
  }

  // OR logic: at least one condition must be true
  return results.some(Boolean);
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: ConditionConfig, fieldValue: unknown): boolean {
  const { operator, value } = condition;

  switch (operator) {
    case 'equals':
      return fieldValue === value;

    case 'not_equals':
      return fieldValue !== value;

    case 'contains':
      return String(fieldValue || '').includes(String(value));

    case 'not_contains':
      return !String(fieldValue || '').includes(String(value));

    case 'greater_than':
      return Number(fieldValue) > Number(value);

    case 'less_than':
      return Number(fieldValue) < Number(value);

    case 'in_list':
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);

    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);

    case 'is_set':
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;

    case 'is_not_set':
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;

    case 'starts_with':
      return String(fieldValue || '').startsWith(String(value));

    case 'ends_with':
      return String(fieldValue || '').endsWith(String(value));

    default:
      return false;
  }
}

/**
 * Process automation trigger
 * This is the main entry point for executing automation rules
 */
export async function processTrigger(
  organizationId: string,
  trigger: TriggerConfig,
  context: {
    userId?: string;
    anonymousId?: string;
    eventData?: Record<string, unknown>;
    userData?: Record<string, unknown>;
  }
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  // Find active campaigns that match this trigger
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.organizationId, organizationId),
        eq(campaigns.status, 'active')
      )
    );

  for (const campaign of activeCampaigns) {
    // Check if campaign has matching trigger configuration
    const settings = campaign.settings as any;
    if (!settings?.automationTriggers) {
      continue;
    }

    const matchingTrigger = settings.automationTriggers.find(
      (t: TriggerConfig) => t.type === trigger.type && matchesTriggerConfig(t, trigger)
    );

    if (!matchingTrigger) {
      continue;
    }

    // Execute campaign steps
    const result = await executeCampaignSteps(
      campaign.id,
      organizationId,
      context
    );

    results.push(result);
  }

  return results;
}

/**
 * Check if trigger configs match
 */
function matchesTriggerConfig(config: TriggerConfig, trigger: TriggerConfig): boolean {
  if (config.type !== trigger.type) {
    return false;
  }

  // Type-specific matching
  switch (config.type) {
    case 'event':
      return (config.config.eventType as string) === (trigger.config.eventType as string);

    case 'page_view':
      return (config.config.pagePath as string) === (trigger.config.pagePath as string) ||
             (config.config.pagePattern as string) !== undefined;

    case 'form_submit':
      return (config.config.formId as string) === (trigger.config.formId as string);

    case 'tag_added':
    case 'tag_removed':
      return (config.config.tagName as string) === (trigger.config.tagName as string);

    default:
      return true;
  }
}

/**
 * Execute campaign steps for a user
 */
async function executeCampaignSteps(
  campaignId: string,
  organizationId: string,
  context: {
    userId?: string;
    anonymousId?: string;
    eventData?: Record<string, unknown>;
    userData?: Record<string, unknown>;
  }
): Promise<ExecutionResult> {
  const errors: string[] = [];
  let actionsExecuted = 0;

  try {
    // Get campaign steps in order
    const steps = await db
      .select()
      .from(campaignSteps)
      .where(eq(campaignSteps.campaignId, campaignId))
      .orderBy(sql`${campaignSteps.order} ASC`);

    for (const step of steps) {
      try {
        const executed = await executeStep(step, organizationId, context);
        if (executed) {
          actionsExecuted++;
        }
      } catch (error) {
        errors.push(`Step ${step.order} (${step.stepType}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      ruleId: campaignId,
      userId: context.userId,
      anonymousId: context.anonymousId,
      executedAt: new Date(),
      actionsExecuted,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      ruleId: campaignId,
      userId: context.userId,
      anonymousId: context.anonymousId,
      executedAt: new Date(),
      actionsExecuted: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Execute a single campaign step
 */
async function executeStep(
  step: typeof campaignSteps.$inferSelect,
  organizationId: string,
  context: {
    userId?: string;
    anonymousId?: string;
    eventData?: Record<string, unknown>;
    userData?: Record<string, unknown>;
  }
): Promise<boolean> {
  switch (step.stepType) {
    case 'content':
      // Log content delivery event
      if (step.contentId) {
        await db.insert(analyticsEvents).values({
          organizationId,
          eventType: 'campaign_sent',
          contentId: step.contentId,
          campaignId: step.campaignId,
          userId: context.userId,
          anonymousId: context.anonymousId,
          metadata: { stepId: step.id, stepName: step.name } as any,
          occurredAt: new Date(),
        });
      }
      return true;

    case 'delay':
      // Delays are handled by the scheduler, just mark as executed
      return true;

    case 'condition':
      // Evaluate condition and continue only if true
      const stepConfig = step.config as any;
      if (stepConfig?.condition) {
        return evaluateCondition(
          stepConfig.condition,
          context.userData?.[stepConfig.condition.field]
        );
      }
      return true;

    case 'action':
      // Execute custom action
      const actionConfig = step.config as any;
      return await executeCustomAction(actionConfig, organizationId, context);

    default:
      return false;
  }
}

/**
 * Execute a custom action
 */
async function executeCustomAction(
  action: { type?: string; [key: string]: any },
  organizationId: string,
  context: {
    userId?: string;
    anonymousId?: string;
    eventData?: Record<string, unknown>;
    userData?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (!action?.type) {
    return false;
  }

  switch (action.type) {
    case 'notify_webhook':
      // Webhook notification (implementation would use fetch)
      const webhookUrl = action.config?.url as string;
      if (webhookUrl) {
        // In production, this would make an HTTP request
        console.log(`[Automation] Webhook notification to: ${webhookUrl}`);
        return true;
      }
      return false;

    case 'add_tag':
    case 'remove_tag':
      // Tag operations (would integrate with user profile system)
      console.log(`[Automation] ${action.type}: ${action.config?.tagName}`);
      return true;

    case 'add_to_segment':
    case 'remove_from_segment':
      // Segment operations
      console.log(`[Automation] ${action.type}: ${action.config?.segmentId}`);
      return true;

    case 'update_field':
      // Field update operations
      console.log(`[Automation] Update field ${action.config?.field} = ${action.config?.value}`);
      return true;

    default:
      console.log(`[Automation] Unknown action type: ${action.type}`);
      return false;
  }
}

/**
 * Schedule automation for future execution
 */
export async function scheduleAutomation(
  campaignId: string,
  scheduledAt: Date,
  targetData: {
    userId?: string;
    anonymousId?: string;
  }
): Promise<{ scheduled: boolean; scheduledAt: Date }> {
  // In production, this would integrate with a job queue (e.g., BullMQ, Temporal)
  // For now, just update the campaign with scheduled info
  await db
    .update(campaigns)
    .set({
      scheduledStart: scheduledAt,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  return {
    scheduled: true,
    scheduledAt,
  };
}

/**
 * Get automation execution history
 */
export async function getExecutionHistory(
  organizationId: string,
  campaignId?: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  const conditions: SQL[] = [
    eq(analyticsEvents.organizationId, organizationId),
    inArray(analyticsEvents.eventType, ['campaign_sent', 'campaign_delivered', 'campaign_opened', 'campaign_clicked']),
  ];

  if (campaignId) {
    conditions.push(eq(analyticsEvents.campaignId, campaignId));
  }

  const events = await db
    .select()
    .from(analyticsEvents)
    .where(and(...conditions))
    .orderBy(sql`${analyticsEvents.occurredAt} DESC`)
    .limit(options?.limit || 100);

  return events;
}

/**
 * Validate automation rule configuration
 */
export function validateAutomationRule(rule: Partial<AutomationRule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.name || rule.name.trim().length === 0) {
    errors.push('Rule name is required');
  }

  if (!rule.trigger || !rule.trigger.type) {
    errors.push('Trigger type is required');
  }

  if (!rule.actions || rule.actions.length === 0) {
    errors.push('At least one action is required');
  }

  // Validate action order
  if (rule.actions) {
    const orders = rule.actions.map((a) => a.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      errors.push('Action orders must be unique');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
