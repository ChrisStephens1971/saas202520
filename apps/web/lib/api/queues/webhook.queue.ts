/**
 * Webhook Queue Configuration
 * Bull queue setup for webhook delivery
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import Queue from 'bull';
import { WebhookJobData } from '../types/webhook-events.types';

/**
 * Redis connection configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

/**
 * Webhook delivery queue
 * Handles asynchronous webhook delivery with retry logic
 */
export const webhookQueue = new Queue<WebhookJobData>('webhook-delivery', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 4, // Total 4 attempts (1 initial + 3 retries)
    backoff: {
      type: 'exponential',
      delay: 60000, // Start with 1 minute delay
    },
    removeOnComplete: {
      age: 86400, // Remove completed jobs after 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Remove failed jobs after 7 days
      count: 5000, // Keep max 5000 failed jobs
    },
  },
  settings: {
    lockDuration: 30000, // Lock job for 30 seconds
    stalledInterval: 60000, // Check for stalled jobs every 60 seconds
    maxStalledCount: 2, // Max times a job can be stalled before failing
  },
});

/**
 * Queue event handlers for monitoring and logging
 */

// Job completed successfully
webhookQueue.on('completed', (job, result) => {
  console.log(`[Webhook Queue] Job ${job.id} completed successfully:`, {
    webhookId: job.data.webhookId,
    eventType: job.data.event,
    statusCode: result.statusCode,
  });
});

// Job failed
webhookQueue.on('failed', (job, error) => {
  console.error(`[Webhook Queue] Job ${job?.id} failed:`, {
    webhookId: job?.data.webhookId,
    eventType: job?.data.event,
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });
});

// Job is waiting for processing
webhookQueue.on('waiting', (jobId) => {
  console.log(`[Webhook Queue] Job ${jobId} is waiting...`);
});

// Job is actively being processed
webhookQueue.on('active', (job) => {
  console.log(`[Webhook Queue] Job ${job.id} started processing:`, {
    webhookId: job.data.webhookId,
    eventType: job.data.event,
    attempt: job.attemptsMade + 1,
  });
});

// Job is stalled (took too long)
webhookQueue.on('stalled', (job) => {
  console.warn(`[Webhook Queue] Job ${job.id} stalled:`, {
    webhookId: job.data.webhookId,
    eventType: job.data.event,
  });
});

// Queue errors
webhookQueue.on('error', (error) => {
  console.error('[Webhook Queue] Queue error:', error);
});

/**
 * Graceful shutdown handler
 */
export async function closeWebhookQueue(): Promise<void> {
  console.log('[Webhook Queue] Closing queue gracefully...');
  await webhookQueue.close();
  console.log('[Webhook Queue] Queue closed');
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    webhookQueue.getWaitingCount(),
    webhookQueue.getActiveCount(),
    webhookQueue.getCompletedCount(),
    webhookQueue.getFailedCount(),
    webhookQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

/**
 * Clear all jobs from queue (for maintenance)
 */
export async function clearQueue(): Promise<void> {
  await webhookQueue.empty();
  console.log('[Webhook Queue] All jobs cleared');
}

/**
 * Pause queue processing
 */
export async function pauseQueue(): Promise<void> {
  await webhookQueue.pause();
  console.log('[Webhook Queue] Queue paused');
}

/**
 * Resume queue processing
 */
export async function resumeQueue(): Promise<void> {
  await webhookQueue.resume();
  console.log('[Webhook Queue] Queue resumed');
}

export default webhookQueue;
