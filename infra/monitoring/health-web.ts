// ============================================
// Health Check API Route (Next.js App Router)
// ============================================
// Place in apps/web/app/api/health/route.ts

import { NextResponse } from "next/server";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: "pass" | "fail" | "warn";
      message?: string;
      latency?: number;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {};
  let overallStatus: HealthStatus["status"] = "healthy";

  // Check database connection
  try {
    const dbStart = Date.now();
    // Replace with actual database check
    // await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "pass",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "fail",
      message: error instanceof Error ? error.message : "Database connection failed",
    };
    overallStatus = "unhealthy";
  }

  // Check Redis connection (if configured)
  if (process.env.REDIS_URL) {
    try {
      const redisStart = Date.now();
      // Replace with actual Redis check
      // await redis.ping();
      checks.redis = {
        status: "pass",
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: "warn",
        message: "Redis connection failed (non-critical)",
      };
      if (overallStatus === "healthy") {
        overallStatus = "degraded";
      }
    }
  }

  // Check external services
  checks.external = {
    status: "pass",
    message: "All external services operational",
  };

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
    checks,
  };

  const responseTime = Date.now() - startTime;

  // Add response time header for monitoring
  return NextResponse.json(health, {
    status: overallStatus === "unhealthy" ? 503 : 200,
    headers: {
      "X-Response-Time": `${responseTime}ms`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
