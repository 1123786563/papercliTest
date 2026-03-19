// ============================================
// Next.js Instrumentation Hook
// ============================================
// Place in apps/web/instrumentation.ts
// This file runs when the Next.js server starts

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize Sentry for server-side
    const { initSentry } = await import("./sentry.server.config");
    initSentry?.();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Initialize Sentry for edge runtime
    const { initSentry } = await import("./sentry.edge.config");
    initSentry?.();
  }
}
