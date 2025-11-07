/**
 * Performance Metrics Utilities
 *
 * Provides utilities for measuring and tracking web performance:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Custom performance metrics
 * - Performance monitoring
 * - Analytics integration
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
}

export interface PerformanceTargets {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
  TTI: number; // Time to Interactive
  initialLoad: number;
  interactive: number;
}

/**
 * Performance targets for the application
 */
export const PERFORMANCE_TARGETS: PerformanceTargets = {
  FCP: 1000, // 1 second
  LCP: 2500, // 2.5 seconds
  FID: 100, // 100ms
  CLS: 0.1, // 0.1
  TTFB: 600, // 600ms
  TTI: 3000, // 3 seconds
  initialLoad: 2000, // 2 seconds (3G)
  interactive: 3000, // 3 seconds
};

/**
 * Thresholds for rating performance metrics
 */
const METRIC_THRESHOLDS = {
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800 },
  TTI: { good: 3800, needsImprovement: 7300 },
};

/**
 * Rate a metric value
 */
function rateMetric(
  name: keyof typeof METRIC_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = METRIC_THRESHOLDS[name];

  if (value <= thresholds.good) {
    return 'good';
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement';
  }

  return 'poor';
}

/**
 * Measure First Contentful Paint (FCP)
 */
export function measureFCP(callback: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          const value = entry.startTime;

          callback({
            name: 'FCP',
            value,
            rating: rateMetric('FCP', value),
            id: entry.entryType,
          });

          observer.disconnect();
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });
  } catch (error) {
    console.error('Failed to measure FCP:', error);
  }
}

/**
 * Measure Largest Contentful Paint (LCP)
 */
export function measureLCP(callback: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      if (lastEntry) {
        const value = lastEntry.renderTime || lastEntry.loadTime;

        callback({
          name: 'LCP',
          value,
          rating: rateMetric('LCP', value),
          id: lastEntry.id,
        });
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    console.error('Failed to measure LCP:', error);
  }
}

/**
 * Measure First Input Delay (FID)
 */
export function measureFID(callback: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      for (const entry of entries as any[]) {
        if (entry.name === 'first-input') {
          const value = entry.processingStart - entry.startTime;

          callback({
            name: 'FID',
            value,
            rating: rateMetric('FID', value),
            id: entry.entryType,
          });

          observer.disconnect();
        }
      }
    });

    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    console.error('Failed to measure FID:', error);
  }
}

/**
 * Measure Cumulative Layout Shift (CLS)
 */
export function measureCLS(callback: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  let clsValue = 0;
  let clsEntries: any[] = [];

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as any[];

      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);

          callback({
            name: 'CLS',
            value: clsValue,
            rating: rateMetric('CLS', clsValue),
            delta: entry.value,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // Report final CLS value on page unload
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        callback({
          name: 'CLS',
          value: clsValue,
          rating: rateMetric('CLS', clsValue),
        });

        observer.disconnect();
      }
    });
  } catch (error) {
    console.error('Failed to measure CLS:', error);
  }
}

/**
 * Measure Time to First Byte (TTFB)
 */
export function measureTTFB(callback: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigation) {
      const value = navigation.responseStart - navigation.requestStart;

      callback({
        name: 'TTFB',
        value,
        rating: rateMetric('TTFB', value),
      });
    }
  } catch (error) {
    console.error('Failed to measure TTFB:', error);
  }
}

/**
 * Measure Time to Interactive (TTI)
 */
export function measureTTI(callback: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  try {
    // Simple TTI approximation using load event
    addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        const value = navigation.domInteractive - navigation.fetchStart;

        callback({
          name: 'TTI',
          value,
          rating: rateMetric('TTI', value),
        });
      }
    });
  } catch (error) {
    console.error('Failed to measure TTI:', error);
  }
}

/**
 * Measure all Core Web Vitals
 */
export function measureCoreWebVitals(callback: (metric: PerformanceMetric) => void): void {
  measureFCP(callback);
  measureLCP(callback);
  measureFID(callback);
  measureCLS(callback);
  measureTTFB(callback);
  measureTTI(callback);
}

/**
 * Get performance summary
 */
export interface PerformanceSummary {
  metrics: PerformanceMetric[];
  overall: 'good' | 'needs-improvement' | 'poor';
  score: number; // 0-100
}

export function getPerformanceSummary(): PerformanceSummary {
  const metrics: PerformanceMetric[] = [];

  // Collect all metrics
  measureCoreWebVitals((metric) => {
    metrics.push(metric);
  });

  // Calculate overall rating
  const ratings = metrics.map((m) => m.rating);
  const goodCount = ratings.filter((r) => r === 'good').length;
  const poorCount = ratings.filter((r) => r === 'poor').length;

  let overall: 'good' | 'needs-improvement' | 'poor' = 'needs-improvement';

  if (goodCount === ratings.length) {
    overall = 'good';
  } else if (poorCount > ratings.length / 2) {
    overall = 'poor';
  }

  // Calculate score (0-100)
  const score = Math.round((goodCount / ratings.length) * 100);

  return {
    metrics,
    overall,
    score,
  };
}

/**
 * Log performance metrics to console
 */
export function logPerformanceMetrics(): void {
  measureCoreWebVitals((metric) => {
    console.log(
      `[Performance] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`
    );
  });
}

/**
 * Send performance metrics to analytics
 */
export function sendPerformanceMetrics(
  analyticsEndpoint: string = '/api/analytics/performance'
): void {
  measureCoreWebVitals((metric) => {
    // Send to analytics endpoint
    fetch(analyticsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        url: window.location.href,
        timestamp: Date.now(),
      }),
    }).catch((error) => {
      console.error('Failed to send performance metrics:', error);
    });
  });
}
