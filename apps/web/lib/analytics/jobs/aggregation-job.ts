/**
 * Analytics Aggregation Job
 * Sprint 10 Week 1 - Background Jobs
 *
 * BullMQ job processor for running analytics aggregations.
 * Handles revenue, cohort, and tournament metric calculations.
 */

import { Job } from 'bullmq';
import {
  aggregateRevenue,
  aggregateCohorts,
  aggregateTournaments,
  aggregateAll,
  getActiveTenants,
  getStandardPeriods,
  PeriodType,
} from '../services/aggregation-service';
import { AggregationJobData } from './queue';

/**
 * Process an aggregation job
 *
 * Handles different aggregation types:
 * - revenue: Compute revenue metrics
 * - cohorts: Compute user retention cohorts
 * - tournaments: Compute tournament performance metrics
 * - all: Run all aggregations
 *
 * @param job - BullMQ job instance
 * @returns Job result summary
 */
export async function processAggregationJob(
  job: Job<AggregationJobData>
): Promise<{
  success: boolean;
  tenantsProcessed: number;
  aggregationType: string;
  errors?: string[];
}> {
  const { tenantId, type, periodStart, periodEnd, periodType } = job.data;

  console.log(`[AggregationJob] Starting job ${job.id}`, {
    tenantId,
    type,
    periodStart,
    periodEnd,
    periodType,
  });

  // Update job progress
  await job.updateProgress(0);

  try {
    // Determine which tenants to process
    let tenantIds: string[];
    if (tenantId) {
      tenantIds = [tenantId];
    } else {
      console.log('[AggregationJob] Fetching all active tenants...');
      tenantIds = await getActiveTenants();
      console.log(`[AggregationJob] Found ${tenantIds.length} active tenants`);
    }

    if (tenantIds.length === 0) {
      console.log('[AggregationJob] No tenants to process');
      return {
        success: true,
        tenantsProcessed: 0,
        aggregationType: type,
      };
    }

    // Determine time period
    let start: Date;
    let end: Date;
    let period: PeriodType;

    if (periodStart && periodEnd && periodType) {
      // Use provided dates
      start = new Date(periodStart);
      end = new Date(periodEnd);
      period = periodType;
    } else {
      // Use current day as default
      const periods = getStandardPeriods();
      start = periods.day.start;
      end = periods.day.end;
      period = 'day';
      console.log(
        `[AggregationJob] Using default period: ${start.toISOString()} to ${end.toISOString()}`
      );
    }

    // Process each tenant
    const errors: string[] = [];
    let processedCount = 0;

    for (let i = 0; i < tenantIds.length; i++) {
      const currentTenantId = tenantIds[i];

      try {
        console.log(
          `[AggregationJob] Processing tenant ${i + 1}/${tenantIds.length}: ${currentTenantId}`
        );

        // Run appropriate aggregation based on type
        switch (type) {
          case 'revenue':
            await aggregateRevenue(currentTenantId, start, end, period);
            break;

          case 'cohorts':
            // For cohorts, we use the start date as the cohort month
            await aggregateCohorts(currentTenantId, start);
            break;

          case 'tournaments':
            await aggregateTournaments(currentTenantId, start, end, period);
            break;

          case 'all':
            await aggregateAll(currentTenantId, start, end, period);
            break;

          default:
            throw new Error(`Unknown aggregation type: ${type}`);
        }

        processedCount++;

        // Update job progress
        const progress = Math.round((processedCount / tenantIds.length) * 100);
        await job.updateProgress(progress);

        console.log(
          `[AggregationJob] Completed tenant ${currentTenantId} (${processedCount}/${tenantIds.length})`
        );
      } catch (error) {
        const errorMessage = `Failed to process tenant ${currentTenantId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(`[AggregationJob] ${errorMessage}`, error);
        errors.push(errorMessage);

        // Continue processing other tenants even if one fails
      }
    }

    // Final progress update
    await job.updateProgress(100);

    const result = {
      success: errors.length === 0,
      tenantsProcessed: processedCount,
      aggregationType: type,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`[AggregationJob] Job ${job.id} completed`, result);

    return result;
  } catch (error) {
    console.error(`[AggregationJob] Job ${job.id} failed:`, error);

    // Re-throw to mark job as failed in BullMQ
    throw error;
  }
}

/**
 * Create a job handler that logs execution time
 *
 * @param processor - The actual job processor function
 * @returns Wrapped processor with timing
 */
export function withTiming<T extends (...args: any[]) => Promise<any>>(
  processor: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    try {
      const result = await processor(...args);
      const duration = Date.now() - startTime;
      console.log(`[AggregationJob] Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[AggregationJob] Failed after ${duration}ms`);
      throw error;
    }
  }) as T;
}

/**
 * Job processor with timing wrapper
 */
export const timedAggregationProcessor = withTiming(processAggregationJob);

/**
 * Retry configuration for failed jobs
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffDelay: 5000, // 5 seconds
  backoffType: 'exponential' as const,
};

/**
 * Job priorities
 */
export const JOB_PRIORITY = {
  HIGH: 1, // Single tenant, immediate
  NORMAL: 5, // Single tenant, scheduled
  LOW: 10, // All tenants, background
} as const;

/**
 * Helper to create aggregation job options
 *
 * @param options - Job configuration options
 * @returns BullMQ job options
 */
export function createJobOptions(options: {
  priority?: keyof typeof JOB_PRIORITY;
  delay?: number;
  attempts?: number;
}): {
  priority: number;
  delay?: number;
  attempts: number;
  backoff: { type: string; delay: number };
} {
  return {
    priority: options.priority ? JOB_PRIORITY[options.priority] : JOB_PRIORITY.NORMAL,
    delay: options.delay,
    attempts: options.attempts || RETRY_CONFIG.maxAttempts,
    backoff: {
      type: RETRY_CONFIG.backoffType,
      delay: RETRY_CONFIG.backoffDelay,
    },
  };
}
