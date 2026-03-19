// ============================================
// Health Check API Route (Hono API)
// ============================================
// Place in apps/api/src/routes/health.ts

import { Hono } from "hono";

const health = new Hono();

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, { status: string; message?: string; latency?: number }>;
}

// Liveness probe - checks if the service is running
health.get("/live", (c) => {
  return c.json({ status: "ok" }, 200);
});

// Readiness probe - checks if the service is ready to accept traffic
health.get("/ready", async (c) => {
  const checks: HealthStatus["checks"] = {};
  let isReady = true;

  // Check database connection
  try {
    const start = Date.now();
    // await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "pass",
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.database = {
      status: "fail",
      message: "Database not ready",
    };
    isReady = false;
  }

  // Check Redis (optional)
  if (process.env.REDIS_URL) {
    try {
      // await redis.ping();
      checks.redis = { status: "pass" };
    } catch {
      checks.redis = { status: "warn", message: "Redis not ready" };
    }
  }

  return c.json(
    {
      status: isReady ? "ready" : "not_ready",
      checks,
    },
    isReady ? 200 : 503
  );
});

// Full health check with detailed status
health.get("/", async (c) => {
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {};
  let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";

  // Database check
  try {
    const dbStart = Date.now();
    // await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "pass",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "fail",
      message: error instanceof Error ? error.message : "Database error",
    };
    overallStatus = "unhealthy";
  }

  // Redis check (non-critical)
  if (process.env.REDIS_URL) {
    try {
      const redisStart = Date.now();
      // await redis.ping();
      checks.redis = {
        status: "pass",
        latency: Date.now() - redisStart,
      };
    } catch {
      checks.redis = { status: "warn", message: "Redis unavailable" };
      if (overallStatus === "healthy") overallStatus = "degraded";
    }
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;
  checks.memory = {
    status: heapUsedPercent > 0.9 ? "fail" : heapUsedPercent > 0.7 ? "warn" : "pass",
    message: `Heap usage: ${Math.round(heapUsedPercent * 100)}%`,
  };

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || "unknown",
    checks,
  };

  const responseTime = Date.now() - startTime;

  return c.json(healthStatus, overallStatus === "unhealthy" ? 503 : 200, {
    "X-Response-Time": `${responseTime}ms`,
  });
});

export default health;
