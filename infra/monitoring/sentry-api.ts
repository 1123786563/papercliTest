// ============================================
// Sentry Integration for Hono API
// ============================================
// Middleware and utilities for error tracking in Hono

import { Hono } from "hono";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// ============================================
// Sentry Initialization
// ============================================
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("SENTRY_DSN not set. Sentry is disabled.");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Environment
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,

    // Integrations
    integrations: [
      // Enable HTTP tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable PostgreSQL tracing
      new Sentry.Integrations.Postgres(),
      // Profiling
      nodeProfilingIntegration(),
    ],

    // Ignore common errors
    ignoreErrors: ["Non-Error promise rejection captured", "Unauthorized", "Not Found"],
  });
}

// ============================================
// Sentry Middleware for Hono
// ============================================
export function sentryMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const transaction = Sentry.startTransaction({
      op: "http.server",
      name: `${c.req.method} ${c.req.path}`,
    });

    // Set user context if available
    const userId = c.get("userId");
    if (userId) {
      Sentry.setUser({ id: userId });
    }

    try {
      await next();
      transaction.setHttpStatus(c.res.status);
    } catch (error) {
      Sentry.captureException(error);
      transaction.setStatus("internal_error");
      throw error;
    } finally {
      transaction.finish();
    }
  };
}

// ============================================
// Error Handler with Sentry
// ============================================
export function sentryErrorHandler(err: Error, c: any) {
  Sentry.captureException(err);

  console.error("Unhandled error:", err);

  return c.json(
    {
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "production" ? undefined : err.message,
    },
    500
  );
}

// ============================================
// Utility Functions
// ============================================
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const addBreadcrumb = Sentry.addBreadcrumb;
export const setUser = Sentry.setUser;
export const setTag = Sentry.setTag;
export const setContext = Sentry.setContext;
