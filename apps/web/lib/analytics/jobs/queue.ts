/**
 * BullMQ Queue Infrastructure
 * Sprint 10 Week 1 - Background Jobs for Analytics Aggregation
 *
 * Provides job queue management using BullMQ with Redis backend.
 * Supports multiple job types for analytics processing.
 */

import { Queue, Worker, Job, QueueEvents, WorkerOptions, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

/**
 * Job type definitions
 */
export type JobType = 'aggregation' | 'export' | 'scheduled-report';

/**
 * Job data payloads for different job types
 */
export interface AggregationJobData {
  tenantId?: string; // If undefined, process all tenants
  type: 'revenue' | 'cohorts' | 'tournaments' | 'all';
  periodStart?: string; // ISO date string
  periodEnd?: string; // ISO date string
  periodType?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ExportJobData {
  tenantId: string;
  exportType: 'revenue' | 'tournaments' | 'users';
  format: 'csv' | 'excel' | 'pdf';
  dateRange: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
  userId: string; // User requesting the export
}

export interface ScheduledReportJobData {
  reportId: string;
  tenantId: string;
  reportType: string;
  recipients: string[];
  parameters?: Record<string, any>;
}

export type JobData = AggregationJobData | ExportJobData | ScheduledReportJobData;

/**
 * Redis connection configuration
 * Reuses existing Redis configuration from cache service
 */
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  enableOfflineQueue: true,
};

/**
 * Global queue instances (singleton pattern)
 */
let analyticsQueue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Initialize the analytics job queue
 *
 * @returns The initialized Queue instance
 */
export function initializeQueue(): Queue {
  if (analyticsQueue) {
    return analyticsQueue;
  }

  console.log('[Queue] Initializing analytics job queue...');

  const queueOptions: QueueOptions = {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5 seconds base delay
      },
      removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
        count: 5000, // Keep last 5000 failed jobs
      },
    },
  };

  analyticsQueue = new Queue('analytics', queueOptions);

  // Initialize queue events for monitoring
  queueEvents = new QueueEvents('analytics', {
    connection: redisConnection,
  });

  // Log queue events
  queueEvents.on('completed', ({ jobId }) => {
    console.log(`[Queue] Job ${jobId} completed`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] Job ${jobId} failed:`, failedReason);
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    console.log(`[Queue] Job ${jobId} progress:`, data);
  });

  console.log('[Queue] Analytics job queue initialized successfully');

  return analyticsQueue;
}

/**
 * Get the analytics queue instance
 *
 * @returns The Queue instance (initializes if not already done)
 */
export function getQueue(): Queue {
  if (!analyticsQueue) {
    return initializeQueue();
  }
  return analyticsQueue;
}

/**
 * Add a job to the analytics queue
 *
 * @param jobType - Type of job to add
 * @param data - Job data payload
 * @param options - Optional job-specific options
 * @returns The created Job instance
 */
export async function addJob(
  jobType: JobType,
  data: JobData,
  options?: {
    priority?: number;
    delay?: number;
    repeat?: {
      pattern: string; // Cron pattern
    };
  }
): Promise<Job> {
  const queue = getQueue();

  const jobOptions = {
    ...options,
    jobId: options?.repeat ? `${jobType}-scheduled` : undefined, // Unique ID for scheduled jobs
  };

  console.log(`[Queue] Adding ${jobType} job to queue`, { data, options: jobOptions });

  const job = await queue.add(jobType, data, jobOptions);

  return job;
}

/**
 * Create a worker to process jobs from the analytics queue
 *
 * @param processor - Job processor function
 * @param options - Optional worker configuration
 * @returns The created Worker instance
 */
export function createWorker(
  processor: (job: Job<JobData, any, JobType>) => Promise<any>,
  options?: Partial<WorkerOptions>
): Worker {
  console.log('[Queue] Creating analytics worker...');

  const workerOptions: WorkerOptions = {
    connection: redisConnection,
    concurrency: options?.concurrency || 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
    ...options,
  };

  const worker = new Worker('analytics', processor, workerOptions);

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled`);
  });

  console.log('[Queue] Analytics worker created successfully');

  return worker;
}

/**
 * Get queue metrics and status
 *
 * @returns Queue metrics including counts and status
 */
export async function getQueueMetrics(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}> {
  const queue = getQueue();

  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: isPaused,
  };
}

/**
 * Clean old completed and failed jobs from the queue
 *
 * @param olderThan - Remove jobs older than this (milliseconds)
 * @returns Number of jobs removed
 */
export async function cleanQueue(olderThan: number = 86400000): Promise<number> {
  const queue = getQueue();

  const [completedCount, failedCount] = await Promise.all([
    queue.clean(olderThan, 1000, 'completed'),
    queue.clean(olderThan, 1000, 'failed'),
  ]);

  const totalCleaned = (completedCount?.length || 0) + (failedCount?.length || 0);

  console.log(`[Queue] Cleaned ${totalCleaned} old jobs from queue`);

  return totalCleaned;
}

/**
 * Pause the queue (stop processing new jobs)
 */
export async function pauseQueue(): Promise<void> {
  const queue = getQueue();
  await queue.pause();
  console.log('[Queue] Queue paused');
}

/**
 * Resume the queue (continue processing jobs)
 */
export async function resumeQueue(): Promise<void> {
  const queue = getQueue();
  await queue.resume();
  console.log('[Queue] Queue resumed');
}

/**
 * Gracefully close the queue and all connections
 */
export async function closeQueue(): Promise<void> {
  console.log('[Queue] Closing queue and connections...');

  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }

  if (analyticsQueue) {
    await analyticsQueue.close();
    analyticsQueue = null;
  }

  console.log('[Queue] Queue closed successfully');
}

/**
 * Health check for the queue system
 *
 * @returns Health status
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  metrics?: any;
  error?: string;
}> {
  try {
    const queue = getQueue();
    const metrics = await getQueueMetrics();

    // Test Redis connection by pinging
    const connection = new Redis(redisConnection);
    await connection.ping();
    await connection.quit();

    return {
      healthy: true,
      metrics,
    };
  } catch (error) {
    console.error('[Queue] Health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
