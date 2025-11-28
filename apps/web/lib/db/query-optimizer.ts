/**
 * Query Optimizer - Prisma Middleware
 *
 * Purpose:
 * - Log slow queries (> 100ms) for performance monitoring
 * - Track query execution metrics
 * - Integration with Sentry for error tracking
 * - Provide insights for database optimization
 *
 * Sprint 9 Phase 3: Scale & Performance
 *
 * @module query-optimizer
 */

import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

/**
 * Configuration for query optimization
 */
const QUERY_CONFIG = {
  // Log queries that take longer than this threshold (milliseconds)
  SLOW_QUERY_THRESHOLD: 100,

  // Enable detailed query logging in development
  ENABLE_DETAILED_LOGGING: process.env.NODE_ENV === 'development',

  // Enable Sentry integration for slow queries
  ENABLE_SENTRY: process.env.NODE_ENV === 'production',

  // Maximum query parameters to log (prevent huge logs)
  MAX_PARAMS_LENGTH: 500,
};

/**
 * Query execution metrics
 */
interface QueryMetrics {
  model: string;
  action: string;
  duration: number;
  timestamp: Date;
  params?: unknown;
}

/**
 * In-memory store for recent query metrics
 * Used for debugging and performance analysis
 */
const recentQueries: QueryMetrics[] = [];
const MAX_RECENT_QUERIES = 100;

/**
 * Add query to recent metrics store
 */
function addQueryMetric(metric: QueryMetrics): void {
  recentQueries.push(metric);

  // Keep only the most recent queries
  if (recentQueries.length > MAX_RECENT_QUERIES) {
    recentQueries.shift();
  }
}

/**
 * Get recent slow queries (for debugging)
 *
 * @returns Array of recent slow queries
 */
export function getRecentSlowQueries(): QueryMetrics[] {
  return recentQueries.filter((q) => q.duration > QUERY_CONFIG.SLOW_QUERY_THRESHOLD);
}

/**
 * Get query statistics
 *
 * @returns Object with query statistics
 */
export function getQueryStats() {
  if (recentQueries.length === 0) {
    return {
      totalQueries: 0,
      slowQueries: 0,
      avgDuration: 0,
      maxDuration: 0,
      slowQueryPercentage: 0,
    };
  }

  const slowQueries = recentQueries.filter((q) => q.duration > QUERY_CONFIG.SLOW_QUERY_THRESHOLD);
  const durations = recentQueries.map((q) => q.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);

  return {
    totalQueries: recentQueries.length,
    slowQueries: slowQueries.length,
    avgDuration: Math.round(avgDuration * 100) / 100,
    maxDuration: Math.round(maxDuration * 100) / 100,
    slowQueryPercentage: Math.round((slowQueries.length / recentQueries.length) * 100),
  };
}

/**
 * Format query parameters for logging
 * Truncates long parameters to prevent huge logs
 */
function formatParams(params: unknown): string {
  try {
    const stringified = JSON.stringify(params);
    if (stringified.length > QUERY_CONFIG.MAX_PARAMS_LENGTH) {
      return stringified.substring(0, QUERY_CONFIG.MAX_PARAMS_LENGTH) + '... (truncated)';
    }
    return stringified;
  } catch {
    return '[Unable to stringify params]';
  }
}

/**
 * Log slow query to console
 */
function logSlowQuery(metric: QueryMetrics): void {
  const timestamp = metric.timestamp.toISOString();
  const formattedParams = metric.params ? formatParams(metric.params) : 'N/A';

  console.warn(
    `[SLOW QUERY] ${timestamp}\n` +
      `  Model: ${metric.model}\n` +
      `  Action: ${metric.action}\n` +
      `  Duration: ${metric.duration}ms\n` +
      `  Params: ${formattedParams}`
  );
}

/**
 * Report slow query to Sentry
 */
function reportToSentry(metric: QueryMetrics): void {
  if (!QUERY_CONFIG.ENABLE_SENTRY) return;

  Sentry.captureMessage('Slow Database Query Detected', {
    level: 'warning',
    tags: {
      model: metric.model,
      action: metric.action,
      duration: metric.duration,
    },
    contexts: {
      query: {
        model: metric.model,
        action: metric.action,
        duration: `${metric.duration}ms`,
        timestamp: metric.timestamp.toISOString(),
      },
    },
    extra: {
      params: metric.params,
    },
  });
}

/**
 * Provide optimization suggestions based on query pattern
 */
function getOptimizationHint(metric: QueryMetrics): string | null {
  const { model, action, duration } = metric;

  // Very slow queries (> 500ms)
  if (duration > 500) {
    return `CRITICAL: Query taking ${duration}ms. Consider adding indexes or optimizing query logic.`;
  }

  // Slow findMany without proper filtering
  if (action === 'findMany' && duration > 200) {
    return `Consider adding WHERE clause filters or implementing pagination for ${model}.findMany()`;
  }

  // Slow count operations
  if (action === 'count' && duration > 150) {
    return `Count operation on ${model} is slow. Consider using approximate counts or caching.`;
  }

  // General slow query
  if (duration > QUERY_CONFIG.SLOW_QUERY_THRESHOLD) {
    return `Query taking ${duration}ms. Review indexes on ${model} table.`;
  }

  return null;
}

/**
 * Prisma Middleware for Query Performance Monitoring
 *
 * This middleware:
 * 1. Measures execution time for every database query
 * 2. Logs queries that exceed the slow query threshold
 * 3. Reports slow queries to Sentry in production
 * 4. Provides optimization hints for slow queries
 *
 * Usage:
 * ```typescript
 * import { queryOptimizer } from '@/lib/db/query-optimizer';
 * prisma.$use(queryOptimizer);
 * ```
 *
 * @param params - Prisma query parameters
 * @param next - Next middleware function
 * @returns Query result
 */
// NOTE: Prisma middleware deprecated in v6. Type changed to 'any'. Currently not in use.
export const queryOptimizer: any = async (params: any, next: any) => {
  // Start timer
  const startTime = Date.now();

  try {
    // Execute the query
    const result = await next(params);

    // Calculate duration
    const duration = Date.now() - startTime;

    // Create metric object
    const metric: QueryMetrics = {
      model: params.model || 'Unknown',
      action: params.action,
      duration,
      timestamp: new Date(),
      params: QUERY_CONFIG.ENABLE_DETAILED_LOGGING ? params.args : undefined,
    };

    // Add to metrics store
    addQueryMetric(metric);

    // Check if query is slow
    if (duration > QUERY_CONFIG.SLOW_QUERY_THRESHOLD) {
      // Log to console
      logSlowQuery(metric);

      // Get optimization hint
      const hint = getOptimizationHint(metric);
      if (hint) {
        console.warn(`[OPTIMIZATION HINT] ${hint}`);
      }

      // Report to Sentry (production only)
      reportToSentry(metric);
    }

    return result;
  } catch (error) {
    // Calculate duration even for failed queries
    const duration = Date.now() - startTime;

    // Log failed query
    console.error(
      `[QUERY ERROR] Model: ${params.model || 'Unknown'}, ` +
        `Action: ${params.action}, Duration: ${duration}ms, Error: ${error}`
    );

    // Report to Sentry
    if (QUERY_CONFIG.ENABLE_SENTRY) {
      Sentry.captureException(error, {
        tags: {
          model: params.model || 'Unknown',
          action: params.action,
          duration,
        },
        contexts: {
          query: {
            model: params.model || 'Unknown',
            action: params.action,
            duration: `${duration}ms`,
          },
        },
      });
    }

    // Re-throw the error
    throw error;
  }
};

/**
 * Grouped slow query metrics
 */
interface GroupedSlowQuery {
  count: number;
  totalDuration: number;
  maxDuration: number;
  avgDuration: number;
  queries: QueryMetrics[];
}

/**
 * Get detailed query performance report
 * Useful for debugging and optimization analysis
 *
 * @returns Detailed performance report
 */
export function getPerformanceReport() {
  const stats = getQueryStats();
  const slowQueries = getRecentSlowQueries();

  // Group slow queries by model and action
  const groupedSlowQueries = slowQueries.reduce(
    (acc, query) => {
      const key = `${query.model}.${query.action}`;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
          avgDuration: 0,
          queries: [],
        };
      }
      acc[key].count++;
      acc[key].totalDuration += query.duration;
      acc[key].maxDuration = Math.max(acc[key].maxDuration, query.duration);
      acc[key].queries.push(query);
      return acc;
    },
    {} as Record<string, GroupedSlowQuery>
  );

  // Calculate average duration for each group
  Object.keys(groupedSlowQueries).forEach((key) => {
    groupedSlowQueries[key].avgDuration =
      Math.round((groupedSlowQueries[key].totalDuration / groupedSlowQueries[key].count) * 100) /
      100;
  });

  return {
    ...stats,
    groupedSlowQueries,
    recentSlowQueries: slowQueries.slice(-10), // Last 10 slow queries
  };
}

/**
 * Clear query metrics
 * Useful for testing or resetting stats
 */
export function clearQueryMetrics(): void {
  recentQueries.length = 0;
}

/**
 * Export configuration for testing
 */
export const config = QUERY_CONFIG;
