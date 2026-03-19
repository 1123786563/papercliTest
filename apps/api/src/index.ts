/**
 * Prism Era API Server
 *
 * Main entry point for the Hono-based API server.
 * 
 * Marketing Automation API endpoints:
 * - /campaigns - Campaign management
 * - /audiences - Audience segment management
 * - /analytics - Analytics and reporting
 * - /automation - Automation rule engine
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve } from '@hono/node-server';
import { authRoutes } from './routes/auth';
import { contentRoutes } from './routes/content';
import { campaignsRouter } from './routes/campaigns';
import { audiencesRouter } from './routes/audiences';
import { analyticsRouter } from './routes/analytics';
import { automationRouter } from './routes/automation';

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://prism-era.vercel.app',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Prism Era API',
    version: '0.2.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth',
      content: '/content',
      campaigns: '/campaigns',
      audiences: '/audiences',
      analytics: '/analytics',
      automation: '/automation',
    },
  });
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/auth', authRoutes);
app.route('/content', contentRoutes);
app.route('/campaigns', campaignsRouter);
app.route('/audiences', audiencesRouter);
app.route('/analytics', analyticsRouter);
app.route('/automation', automationRouter);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        message: 'Not Found',
        code: 404,
      },
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Global error:', err);

  return c.json(
    {
      success: false,
      error: {
        message: 'Internal Server Error',
        code: 500,
      },
    },
    500
  );
});

// Start server
const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Prism Era API server starting on port ${port}`);
console.log(`📖 API Documentation:`);
console.log(`   - Auth:       http://localhost:${port}/auth`);
console.log(`   - Content:    http://localhost:${port}/content`);
console.log(`   - Campaigns:  http://localhost:${port}/campaigns`);
console.log(`   - Audiences:  http://localhost:${port}/audiences`);
console.log(`   - Analytics:  http://localhost:${port}/analytics`);
console.log(`   - Automation: http://localhost:${port}/automation`);

serve({
  fetch: app.fetch,
  port,
});

export { app };
