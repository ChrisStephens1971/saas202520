/**
 * Webhook Delivery Worker
 * Processes webhook delivery queue and sends HTTP requests
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { Job } from 'bull';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import { webhookQueue } from '../queues/webhook.queue';
import { WebhookJobData } from '../types/webhook-events.types';
import { createWebhookHeaders } from '../utils/webhook-signature.utils';

const prisma = new PrismaClient();

/**
 * Webhook delivery timeout (10 seconds)
 */
const DELIVERY_TIMEOUT = 10000;

/**
 * Maximum response body length to store (1000 characters)
 */
const MAX_RESPONSE_LENGTH = 1000;

/**
 * Delivery result interface
 */
interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
}

/**
 * Process webhook delivery job
 * Sends HTTP POST request to webhook URL with signature
 *
 * @param job - Bull job containing webhook delivery data
 * @returns Delivery result
 */
async function processWebhookDelivery(
  job: Job<WebhookJobData>
): Promise<DeliveryResult> {
  const { webhookId, deliveryId, event, payload } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  console.log(
    `[Webhook Worker] Processing delivery ${deliveryId} (attempt ${attemptNumber})`
  );

  try {
    // Get webhook details from database
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // Check if webhook is still active
    if (!webhook.isActive) {
      throw new Error(`Webhook ${webhookId} is inactive`);
    }

    // Create request headers with HMAC signature
    const headers = createWebhookHeaders(
      payload,
      webhook.secret,
      event,
      deliveryId
    );

    // Make HTTP POST request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Read response body (limit to 1000 chars)
      const responseText = await response.text();
      const responseBody = responseText.substring(0, MAX_RESPONSE_LENGTH);

      // Determine if delivery was successful
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) {
        // Update delivery log - SUCCESS
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            statusCode: response.status,
            responseBody: responseBody,
            deliveredAt: new Date(),
            attemptNumber: attemptNumber,
          },
        });

        // Update webhook statistics
        await prisma.webhook.update({
          where: { id: webhookId },
          data: {
            deliverySuccessCount: { increment: 1 },
            lastDeliveryAt: new Date(),
            lastError: null,
          },
        });

        console.log(
          `[Webhook Worker] Delivery ${deliveryId} succeeded (${response.status})`
        );

        return {
          success: true,
          statusCode: response.status,
          responseBody: responseBody,
        };
      } else if (response.status >= 400 && response.status < 500) {
        // Client error (4xx) - Don't retry
        const errorMessage = `Client error: ${response.status} ${response.statusText}`;

        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            statusCode: response.status,
            responseBody: responseBody,
            errorMessage: errorMessage,
            attemptNumber: attemptNumber,
          },
        });

        await prisma.webhook.update({
          where: { id: webhookId },
          data: {
            deliveryFailureCount: { increment: 1 },
            lastError: errorMessage,
          },
        });

        console.error(`[Webhook Worker] Delivery ${deliveryId} failed: ${errorMessage}`);

        // Don't retry client errors
        throw new Error(errorMessage);
      } else {
        // Server error (5xx) - Retry
        const errorMessage = `Server error: ${response.status} ${response.statusText}`;

        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            statusCode: response.status,
            responseBody: responseBody,
            errorMessage: errorMessage,
            attemptNumber: attemptNumber,
          },
        });

        console.warn(
          `[Webhook Worker] Delivery ${deliveryId} failed, will retry: ${errorMessage}`
        );

        // Throw error to trigger retry
        throw new Error(errorMessage);
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle timeout or network errors
      const errorMessage =
        fetchError.name === 'AbortError'
          ? 'Request timeout (>10s)'
          : `Network error: ${fetchError.message}`;

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          errorMessage: errorMessage,
          attemptNumber: attemptNumber,
        },
      });

      console.warn(
        `[Webhook Worker] Delivery ${deliveryId} failed: ${errorMessage}`
      );

      // Retry on timeout/network errors
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    // Final failure after all retries
    if (attemptNumber >= 4) {
      console.error(
        `[Webhook Worker] Delivery ${deliveryId} failed permanently after ${attemptNumber} attempts`
      );

      // Update webhook statistics
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          deliveryFailureCount: { increment: 1 },
          lastError: error.message,
        },
      });
    }

    return {
      success: false,
      errorMessage: error.message,
    };
  }
}

/**
 * Start the webhook delivery worker
 * Processes jobs from the webhook queue
 */
export function startWebhookWorker(): void {
  console.log('[Webhook Worker] Starting webhook delivery worker...');

  // Process webhook delivery jobs
  webhookQueue.process(async (job: Job<WebhookJobData>) => {
    try {
      const result = await processWebhookDelivery(job);
      return result;
    } catch (error: any) {
      console.error('[Webhook Worker] Error processing job:', error);
      throw error; // Re-throw to trigger retry
    }
  });

  console.log('[Webhook Worker] Worker started and ready to process jobs');
}

/**
 * Stop the webhook delivery worker
 */
export async function stopWebhookWorker(): Promise<void> {
  console.log('[Webhook Worker] Stopping webhook delivery worker...');
  await webhookQueue.close();
  console.log('[Webhook Worker] Worker stopped');
}

/**
 * Get worker statistics
 */
export async function getWorkerStats() {
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

// Auto-start worker if this module is run directly
if (require.main === module) {
  startWebhookWorker();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Webhook Worker] SIGTERM received, shutting down...');
    await stopWebhookWorker();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Webhook Worker] SIGINT received, shutting down...');
    await stopWebhookWorker();
    process.exit(0);
  });
}
