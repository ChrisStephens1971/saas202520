/**
 * Performance Monitoring Middleware
 * Sprint 9 Phase 3 - Performance Monitoring
 *
 * Tracks API endpoint performance, database queries, cache operations,
 * and external API calls with custom Sentry spans.
 */

import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Performance metrics for tracking
 */
interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  dbQueryCount?: number;
  dbQueryDuration?: number;
  cacheHits?: number;
  cacheMisses?: number;
  externalApiCalls?: number;
  externalApiDuration?: number;
  memoryUsed?: number;
  error?: string;
}

/**
 * Store for tracking request metrics
 */
const requestMetrics = new Map<string, PerformanceMetrics>();

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start tracking a request
 */
export function startRequestTracking(req: NextRequest): string {
  const requestId = generateRequestId();
  const startTime = performance.now();

  const metrics: PerformanceMetrics = {
    requestId,
    method: req.method,
    path: req.nextUrl.pathname,
    startTime,
    dbQueryCount: 0,
    dbQueryDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
    externalApiCalls: 0,
    externalApiDuration: 0,
  };

  requestMetrics.set(requestId, metrics);

  // Start Sentry transaction
  const transaction = Sentry.startTransaction({
    name: `${req.method} ${req.nextUrl.pathname}`,
    op: 'http.server',
    data: {
      method: req.method,
      url: req.url,
      requestId,
    },
  });

  // Store transaction in request context
  Sentry.getCurrentHub().configureScope((scope) => {
    scope.setSpan(transaction);
  });

  return requestId;
}

/**
 * End tracking a request
 */
export function endRequestTracking(
  requestId: string,
  statusCode: number,
  error?: Error
): PerformanceMetrics | null {
  const metrics = requestMetrics.get(requestId);
  if (!metrics) return null;

  const endTime = performance.now();
  const duration = endTime - metrics.startTime;

  metrics.endTime = endTime;
  metrics.duration = duration;
  metrics.statusCode = statusCode;

  // Memory tracking removed - not available in Edge Runtime
  // Memory metrics would need to be tracked server-side in API routes

  if (error) {
    metrics.error = error.message;
    Sentry.captureException(error, {
      tags: {
        requestId,
        path: metrics.path,
        method: metrics.method,
      },
    });
  }

  // Finish Sentry transaction
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    transaction.setHttpStatus(statusCode);
    transaction.setData('metrics', metrics);
    transaction.finish();
  }

  // Send metrics to custom metrics service
  sendMetricsToService(metrics);

  // Alert on slow requests
  if (duration > 1000) {
    alertSlowRequest(metrics);
  }

  // Alert on errors
  if (statusCode >= 500) {
    alertServerError(metrics);
  }

  // Clean up
  requestMetrics.delete(requestId);

  return metrics;
}

/**
 * Track database query
 */
export function trackDatabaseQuery(
  requestId: string,
  query: string,
  duration: number
): void {
  const metrics = requestMetrics.get(requestId);
  if (!metrics) return;

  metrics.dbQueryCount = (metrics.dbQueryCount || 0) + 1;
  metrics.dbQueryDuration = (metrics.dbQueryDuration || 0) + duration;

  // Create Sentry span for query
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    const span = transaction.startChild({
      op: 'db.query',
      description: query.substring(0, 100), // Truncate long queries
      data: {
        duration,
        query: query.substring(0, 500),
      },
    });
    span.finish();
  }

  // Alert on slow queries
  if (duration > 100) {
    alertSlowQuery(requestId, query, duration);
  }
}

/**
 * Track cache operation
 */
export function trackCacheOperation(
  requestId: string,
  operation: 'hit' | 'miss',
  key: string,
  duration: number
): void {
  const metrics = requestMetrics.get(requestId);
  if (!metrics) return;

  if (operation === 'hit') {
    metrics.cacheHits = (metrics.cacheHits || 0) + 1;
  } else {
    metrics.cacheMisses = (metrics.cacheMisses || 0) + 1;
  }

  // Create Sentry span for cache operation
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    const span = transaction.startChild({
      op: `cache.${operation}`,
      description: `Cache ${operation}: ${key}`,
      data: {
        key,
        duration,
      },
    });
    span.finish();
  }
}

/**
 * Track external API call
 */
export function trackExternalApiCall(
  requestId: string,
  url: string,
  method: string,
  duration: number,
  statusCode: number
): void {
  const metrics = requestMetrics.get(requestId);
  if (!metrics) return;

  metrics.externalApiCalls = (metrics.externalApiCalls || 0) + 1;
  metrics.externalApiDuration = (metrics.externalApiDuration || 0) + duration;

  // Create Sentry span for external API call
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    const span = transaction.startChild({
      op: 'http.client',
      description: `${method} ${url}`,
      data: {
        url,
        method,
        duration,
        statusCode,
      },
    });
    span.finish();
  }

  // Alert on slow external API calls
  if (duration > 500) {
    alertSlowExternalApi(requestId, url, method, duration);
  }
}

/**
 * Track custom span
 */
export function trackCustomSpan(
  requestId: string,
  operation: string,
  description: string,
  callback: () => Promise<any>
): Promise<any> {
  return Sentry.startSpan(
    {
      op: operation,
      name: description,
    },
    async () => {
      const startTime = performance.now();
      try {
        return await callback();
      } finally {
        const duration = performance.now() - startTime;
        console.log(`[Performance] ${operation}: ${description} took ${duration.toFixed(2)}ms`);
      }
    }
  );
}

/**
 * Send metrics to custom metrics service
 */
function sendMetricsToService(metrics: PerformanceMetrics): void {
  // In a real implementation, this would send to a metrics aggregation service
  // For now, we'll just log it
  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance Metrics]', {
      path: metrics.path,
      duration: metrics.duration?.toFixed(2) + 'ms',
      statusCode: metrics.statusCode,
      dbQueries: metrics.dbQueryCount,
      dbDuration: metrics.dbQueryDuration?.toFixed(2) + 'ms',
      cacheHitRate: calculateCacheHitRate(metrics),
    });
  }

  // Send to metrics service in production
  if (process.env.METRICS_ENDPOINT) {
    fetch(process.env.METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    }).catch((error) => {
      console.error('[Performance] Failed to send metrics:', error);
    });
  }
}

/**
 * Calculate cache hit rate
 */
function calculateCacheHitRate(metrics: PerformanceMetrics): string {
  const total = (metrics.cacheHits || 0) + (metrics.cacheMisses || 0);
  if (total === 0) return 'N/A';
  const rate = ((metrics.cacheHits || 0) / total) * 100;
  return rate.toFixed(1) + '%';
}

/**
 * Alert on slow request
 */
function alertSlowRequest(metrics: PerformanceMetrics): void {
  console.warn('[Performance Alert] Slow request detected:', {
    path: metrics.path,
    duration: metrics.duration?.toFixed(2) + 'ms',
    threshold: '1000ms',
  });

  Sentry.captureMessage('Slow request detected', {
    level: 'warning',
    tags: {
      type: 'performance',
      path: metrics.path,
      requestId: metrics.requestId,
    },
    extra: metrics,
  });
}

/**
 * Alert on slow query
 */
function alertSlowQuery(requestId: string, query: string, duration: number): void {
  console.warn('[Performance Alert] Slow database query:', {
    requestId,
    query: query.substring(0, 100),
    duration: duration.toFixed(2) + 'ms',
    threshold: '100ms',
  });

  Sentry.captureMessage('Slow database query', {
    level: 'warning',
    tags: {
      type: 'performance',
      subtype: 'database',
      requestId,
    },
    extra: {
      query: query.substring(0, 500),
      duration,
    },
  });
}

/**
 * Alert on slow external API
 */
function alertSlowExternalApi(
  requestId: string,
  url: string,
  method: string,
  duration: number
): void {
  console.warn('[Performance Alert] Slow external API call:', {
    requestId,
    url,
    method,
    duration: duration.toFixed(2) + 'ms',
    threshold: '500ms',
  });

  Sentry.captureMessage('Slow external API call', {
    level: 'warning',
    tags: {
      type: 'performance',
      subtype: 'external_api',
      requestId,
    },
    extra: {
      url,
      method,
      duration,
    },
  });
}

/**
 * Alert on server error
 */
function alertServerError(metrics: PerformanceMetrics): void {
  console.error('[Performance Alert] Server error detected:', {
    path: metrics.path,
    statusCode: metrics.statusCode,
    error: metrics.error,
  });

  Sentry.captureMessage('Server error detected', {
    level: 'error',
    tags: {
      type: 'error',
      path: metrics.path,
      statusCode: metrics.statusCode?.toString(),
      requestId: metrics.requestId,
    },
    extra: metrics,
  });
}

/**
 * Performance middleware wrapper
 */
export function withPerformanceTracking(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = startRequestTracking(req);

    try {
      const response = await handler(req);
      endRequestTracking(requestId, response.status);
      return response;
    } catch (error) {
      endRequestTracking(requestId, 500, error as Error);
      throw error;
    }
  };
}
