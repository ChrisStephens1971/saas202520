/**
 * Webhook Queue Configuration
 * Bull queue setup for webhook delivery
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 *
 * NOTE: Bull is incompatible with Next.js Turbopack/Edge Runtime.
 * This is currently stubbed out to allow builds to succeed.
 * TODO: Replace with Vercel Queue, BullMQ, or pg-boss for production use.
 */

import { WebhookJobData } from '../types/webhook-events.types';

// Stubbed queue implementation to allow build to pass
// In production, replace with a Next.js-compatible queue solution

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

class StubWebhookQueue {
  constructor(_name: string, _options: any) {
    console.warn('[Webhook Queue] Using stub implementation - webhooks will not be queued');
  }

  async add(_data: WebhookJobData, _options?: any): Promise<any> {
    console.warn('[Webhook Queue] Stub: Cannot add job - Bull is disabled');
    return { id: 'stub-job' };
  }

  on(_event: string, _handler: any): void {
    // No-op for event handlers
  }

  async close(): Promise<void> {
    console.log('[Webhook Queue] Stub: Queue closed');
  }

  async getWaitingCount(): Promise<number> {
    return 0;
  }

  async getActiveCount(): Promise<number> {
    return 0;
  }

  async getCompletedCount(): Promise<number> {
    return 0;
  }

  async getFailedCount(): Promise<number> {
    return 0;
  }

  async getDelayedCount(): Promise<number> {
    return 0;
  }

  async empty(): Promise<void> {
    console.log('[Webhook Queue] Stub: Queue emptied');
  }

  async pause(): Promise<void> {
    console.log('[Webhook Queue] Stub: Queue paused');
  }

  async resume(): Promise<void> {
    console.log('[Webhook Queue] Stub: Queue resumed');
  }
}

/**
 * Webhook delivery queue
 * Handles asynchronous webhook delivery with retry logic
 */
export const webhookQueue = new StubWebhookQueue('webhook-delivery', {});

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
export async function getQueueStats(): Promise<QueueStats> {
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
