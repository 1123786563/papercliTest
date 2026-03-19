// ============================================
// Vercel Analytics Configuration
// ============================================
// Add to your Next.js app layout or pages

/**
 * Vercel Analytics Setup
 *
 * 1. Install the package:
 *    pnpm add @vercel/analytics
 *
 * 2. Add to your root layout (app/layout.tsx):
 *    ```tsx
 *    import { Analytics } from '@vercel/analytics/react';
 *
 *    export default function RootLayout({ children }) {
 *      return (
 *        <html>
 *          <body>
 *            {children}
 *            <Analytics />
 *          </body>
 *        </html>
 *      );
 *    }
 *    ```
 *
 * 3. For custom events tracking:
 *    ```tsx
 *    import { track } from '@vercel/analytics';
 *
 *    // Track custom events
 *    track('button_clicked', { button: 'signup' });
 *    ```
 */

// ============================================
// Analytics Utility Functions
// ============================================

// Custom event tracking wrapper
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    // Use Vercel Analytics track function
    import("@vercel/analytics").then(({ track }) => {
      track(eventName, properties);
    });
  } else {
    console.log(`[Analytics] ${eventName}`, properties);
  }
};

// Common event names for consistency
export const AnalyticsEvents = {
  // User events
  USER_SIGNUP: "user_signup",
  USER_LOGIN: "user_login",
  USER_LOGOUT: "user_logout",

  // Page views
  PAGE_VIEW: "page_view",

  // Feature usage
  FEATURE_USED: "feature_used",

  // Errors
  ERROR_OCCURRED: "error_occurred",

  // Performance
  PERFORMANCE_METRIC: "performance_metric",
} as const;

// ============================================
// Web Vitals Tracking
// ============================================

export const reportWebVitals = (metric: {
  id: string;
  name: string;
  value: number;
  label: string;
}) => {
  // Log to console in development
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);
    return;
  }

  // Send to analytics
  trackEvent(AnalyticsEvents.PERFORMANCE_METRIC, {
    metricName: metric.name,
    metricValue: metric.value,
    metricId: metric.id,
    metricLabel: metric.label,
  });
};

// ============================================
// Performance Monitoring Helper
// ============================================

export const measurePerformance = (name: string, fn: () => Promise<any>) => {
  const start = performance.now();

  return fn().finally(() => {
    const duration = performance.now() - start;
    trackEvent("performance_measurement", {
      name,
      duration: Math.round(duration),
    });
  });
};
