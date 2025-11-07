/**
 * Performance Monitoring Integration
 *
 * Automatically tracks and reports Core Web Vitals
 * Sprint 10 Week 4 - Performance Optimization
 */

import {
  measureFCP,
  measureLCP,
  measureFID,
  measureCLS,
  measureTTFB,
  measureTTI,
  PERFORMANCE_TARGETS,
  type PerformanceMetric,
} from './metrics';

export interface PerformanceReport {
  sessionId: string;
  url: string;
  timestamp: number;
  metrics: PerformanceMetric[];
  deviceInfo: {
    userAgent: string;
    viewport: { width: number; height: number };
    connection?: {
      effectiveType?: string;
      rtt?: number;
      downlink?: number;
    };
  };
}

class PerformanceMonitor {
  private sessionId: string;
  private metrics: PerformanceMetric[] = [];
  private reportEndpoint: string = '/api/analytics/performance';
  private reportInterval: number = 30000; // 30 seconds
  private reportTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.init();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        viewport: { width: 0, height: 0 },
      };
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: connection
        ? {
            effectiveType: connection.effectiveType,
            rtt: connection.rtt,
            downlink: connection.downlink,
          }
        : undefined,
    };
  }

  private init(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Measure all Core Web Vitals
    measureFCP((metric) => this.recordMetric(metric));
    measureLCP((metric) => this.recordMetric(metric));
    measureFID((metric) => this.recordMetric(metric));
    measureCLS((metric) => this.recordMetric(metric));
    measureTTFB((metric) => this.recordMetric(metric));
    measureTTI((metric) => this.recordMetric(metric));

    // Start periodic reporting
    this.startReporting();

    // Report on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendReport();
      }
    });

    // Report on beforeunload
    window.addEventListener('beforeunload', () => {
      this.sendReport();
    });
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const target = PERFORMANCE_TARGETS[metric.name as keyof typeof PERFORMANCE_TARGETS];
      const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';

      console.log(
        `${emoji} [Performance] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`,
        target ? `| Target: ${target}ms` : ''
      );
    }

    // Send individual metric immediately if it's poor
    if (metric.rating === 'poor') {
      this.sendReport();
    }
  }

  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      if (this.metrics.length > 0) {
        this.sendReport();
      }
    }, this.reportInterval);
  }

  private stopReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  private async sendReport(): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }

    const report: PerformanceReport = {
      sessionId: this.sessionId,
      url: window.location.href,
      timestamp: Date.now(),
      metrics: [...this.metrics],
      deviceInfo: this.getDeviceInfo(),
    };

    try {
      // Use sendBeacon for reliable reporting
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(report)], {
          type: 'application/json',
        });
        navigator.sendBeacon(this.reportEndpoint, blob);
      } else {
        // Fallback to fetch
        await fetch(this.reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report),
          keepalive: true,
        });
      }

      // Clear metrics after successful send
      this.metrics = [];
    } catch (error) {
      console.error('Failed to send performance report:', error);
    }
  }

  public destroy(): void {
    this.stopReporting();
    this.sendReport();
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public setReportEndpoint(endpoint: string): void {
    this.reportEndpoint = endpoint;
  }

  public setReportInterval(interval: number): void {
    this.reportInterval = interval;
    this.stopReporting();
    this.startReporting();
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function initPerformanceMonitoring(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

export function getPerformanceMonitor(): PerformanceMonitor | null {
  return monitorInstance;
}

export function destroyPerformanceMonitoring(): void {
  if (monitorInstance) {
    monitorInstance.destroy();
    monitorInstance = null;
  }
}
