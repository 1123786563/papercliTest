/**
 * Database Schema Index
 *
 * Exports all table definitions, relations, and types for the
 * Prism Era content marketing automation platform.
 *
 * @package @prism-era/db
 */

// Core tables
export * from './users';
export * from './organizations';
export * from './content';
export * from './campaigns';
export * from './audiences';
export * from './analytics';

// Re-export commonly used Drizzle utilities
export { relations } from 'drizzle-orm';

/**
 * Schema Overview
 *
 * ## Users & Organizations
 * - users: User accounts (Clerk auth integration)
 * - organizations: Multi-tenant company/team accounts
 * - organization_members: User-organization membership
 *
 * ## Content Management
 * - content: Marketing content (articles, posts, emails, etc.)
 *
 * ## Marketing Automation
 * - campaigns: Marketing automation campaigns
 * - campaign_steps: Workflow steps within campaigns
 * - campaign_content: Campaign-content relationships
 *
 * ## Audience Management
 * - audiences: Target audience segments
 * - campaign_audiences: Campaign-audience relationships
 *
 * ## Analytics
 * - analytics_events: All tracking and engagement events
 */
