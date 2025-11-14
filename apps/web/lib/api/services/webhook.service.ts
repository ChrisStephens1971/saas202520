/**
 * Webhook Service
 * Manages webhook subscriptions and delivery operations
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { generateWebhookSecret } from '../utils/webhook-signature.utils';
import { WebhookEvent } from '../types/webhook-events.types';

const prisma = new PrismaClient();

/**
 * Input for creating a new webhook subscription
 */
export interface CreateWebhookInput {
  tenantId: string;
  apiKeyId: string;
  url: string;
  events: WebhookEvent[];
  secret?: string; // Optional: generated if not provided
}

/**
 * Input for updating webhook subscription
 */
export interface UpdateWebhookInput {
  url?: string;
  events?: WebhookEvent[];
  status?: 'active' | 'paused';
}

/**
 * Webhook subscription with statistics
 */
export interface WebhookWithStats {
  id: string;
  tenantId: string;
  apiKeyId: string | null;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
  lastDeliveryAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Calculated statistics
  totalDeliveries?: number;
  successRate?: number;
}

/**
 * Create a new webhook subscription
 *
 * @param input - Webhook creation data
 * @returns Created webhook with generated secret
 *
 * @example
 * const webhook = await createWebhook({
 *   tenantId: 'org_123',
 *   apiKeyId: 'key_456',
 *   url: 'https://api.example.com/webhooks',
 *   events: [WebhookEvent.TOURNAMENT_STARTED, WebhookEvent.MATCH_COMPLETED]
 * });
 */
export async function createWebhook(
  input: CreateWebhookInput
): Promise<WebhookWithStats> {
  // Validate URL format
  try {
    const url = new URL(input.url);
    if (url.protocol !== 'https:') {
      throw new Error('Webhook URL must use HTTPS protocol');
    }
  } catch {
    throw new Error(`Invalid webhook URL: ${input.url}`);
  }

  // Validate events array
  if (!input.events || input.events.length === 0) {
    throw new Error('At least one event type must be specified');
  }

  // Verify API key belongs to tenant
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: input.apiKeyId,
      tenantId: input.tenantId,
      isActive: true,
    },
  });

  if (!apiKey) {
    throw new Error('API key not found or inactive');
  }

  // Generate secret if not provided
  const secret = input.secret || generateWebhookSecret();

  // Create webhook subscription
  const webhook = await prisma.webhook.create({
    data: {
      tenantId: input.tenantId,
      apiKeyId: input.apiKeyId,
      url: input.url,
      secret: secret,
      events: input.events,
      isActive: true,
      deliverySuccessCount: 0,
      deliveryFailureCount: 0,
    },
  });

  return {
    ...webhook,
    totalDeliveries: 0,
    successRate: 0,
  };
}

/**
 * List all webhooks for a tenant
 *
 * @param tenantId - Tenant/organization ID
 * @param status - Optional filter by status (active/inactive)
 * @returns Array of webhooks with statistics
 *
 * @example
 * const webhooks = await listWebhooks('org_123', 'active');
 */
export async function listWebhooks(
  tenantId: string,
  status?: 'active' | 'inactive'
): Promise<WebhookWithStats[]> {
  const where: Prisma.WebhookWhereInput = { tenantId };

  if (status !== undefined) {
    where.isActive = status === 'active';
  }

  const webhooks = await prisma.webhook.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Calculate statistics for each webhook
  return webhooks.map((webhook) => {
    const totalDeliveries =
      webhook.deliverySuccessCount + webhook.deliveryFailureCount;
    const successRate =
      totalDeliveries > 0
        ? (webhook.deliverySuccessCount / totalDeliveries) * 100
        : 0;

    return {
      ...webhook,
      totalDeliveries,
      successRate,
    };
  });
}

/**
 * Get a single webhook by ID
 *
 * @param webhookId - Webhook ID
 * @param tenantId - Tenant ID (for authorization)
 * @returns Webhook with statistics or null if not found
 *
 * @example
 * const webhook = await getWebhook('wh_123', 'org_456');
 */
export async function getWebhook(
  webhookId: string,
  tenantId: string
): Promise<WebhookWithStats | null> {
  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      tenantId: tenantId,
    },
  });

  if (!webhook) {
    return null;
  }

  const totalDeliveries =
    webhook.deliverySuccessCount + webhook.deliveryFailureCount;
  const successRate =
    totalDeliveries > 0
      ? (webhook.deliverySuccessCount / totalDeliveries) * 100
      : 0;

  return {
    ...webhook,
    totalDeliveries,
    successRate,
  };
}

/**
 * Update webhook subscription
 *
 * @param webhookId - Webhook ID
 * @param tenantId - Tenant ID (for authorization)
 * @param updates - Fields to update
 * @returns Updated webhook
 *
 * @example
 * const webhook = await updateWebhook('wh_123', 'org_456', {
 *   events: [WebhookEvent.TOURNAMENT_COMPLETED]
 * });
 */
export async function updateWebhook(
  webhookId: string,
  tenantId: string,
  updates: UpdateWebhookInput
): Promise<WebhookWithStats> {
  // Verify webhook exists and belongs to tenant
  const existing = await getWebhook(webhookId, tenantId);
  if (!existing) {
    throw new Error('Webhook not found');
  }

  // Validate URL if provided
  if (updates.url) {
    try {
      const url = new URL(updates.url);
      if (url.protocol !== 'https:') {
        throw new Error('Webhook URL must use HTTPS protocol');
      }
    } catch {
      throw new Error(`Invalid webhook URL: ${updates.url}`);
    }
  }

  // Validate events if provided
  if (updates.events && updates.events.length === 0) {
    throw new Error('At least one event type must be specified');
  }

  // Build update data
  const data: Prisma.WebhookUpdateInput = {};
  if (updates.url) data.url = updates.url;
  if (updates.events) data.events = updates.events;
  if (updates.status === 'active') data.isActive = true;
  if (updates.status === 'paused') data.isActive = false;

  // Update webhook
  const webhook = await prisma.webhook.update({
    where: {
      id: webhookId,
    },
    data,
  });

  const totalDeliveries =
    webhook.deliverySuccessCount + webhook.deliveryFailureCount;
  const successRate =
    totalDeliveries > 0
      ? (webhook.deliverySuccessCount / totalDeliveries) * 100
      : 0;

  return {
    ...webhook,
    totalDeliveries,
    successRate,
  };
}

/**
 * Delete webhook subscription
 *
 * @param webhookId - Webhook ID
 * @param tenantId - Tenant ID (for authorization)
 * @returns True if deleted, false if not found
 *
 * @example
 * await deleteWebhook('wh_123', 'org_456');
 */
export async function deleteWebhook(
  webhookId: string,
  tenantId: string
): Promise<boolean> {
  // Verify webhook exists and belongs to tenant
  const existing = await getWebhook(webhookId, tenantId);
  if (!existing) {
    return false;
  }

  // Delete webhook (cascades to delivery logs)
  await prisma.webhook.delete({
    where: {
      id: webhookId,
    },
  });

  return true;
}

/**
 * Pause webhook deliveries
 *
 * @param webhookId - Webhook ID
 * @param tenantId - Tenant ID (for authorization)
 * @returns Updated webhook
 *
 * @example
 * await pauseWebhook('wh_123', 'org_456');
 */
export async function pauseWebhook(
  webhookId: string,
  tenantId: string
): Promise<WebhookWithStats> {
  return updateWebhook(webhookId, tenantId, { status: 'paused' });
}

/**
 * Resume paused webhook
 *
 * @param webhookId - Webhook ID
 * @param tenantId - Tenant ID (for authorization)
 * @returns Updated webhook
 *
 * @example
 * await resumeWebhook('wh_123', 'org_456');
 */
export async function resumeWebhook(
  webhookId: string,
  tenantId: string
): Promise<WebhookWithStats> {
  return updateWebhook(webhookId, tenantId, { status: 'active' });
}

/**
 * Get delivery logs for a webhook
 *
 * @param webhookId - Webhook ID
 * @param tenantId - Tenant ID (for authorization)
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of delivery attempts
 *
 * @example
 * const logs = await getDeliveryLogs('wh_123', 'org_456', 20);
 */
/**
 * Webhook delivery log entry
 */
interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  eventType: string;
  payload: unknown;
  deliveredAt: Date | null;
  createdAt: Date;
}

export async function getDeliveryLogs(
  webhookId: string,
  tenantId: string,
  limit: number = 50
): Promise<WebhookDeliveryLog[]> {
  // Verify webhook exists and belongs to tenant
  const webhook = await getWebhook(webhookId, tenantId);
  if (!webhook) {
    throw new Error('Webhook not found');
  }

  // Get delivery logs
  const logs = await prisma.webhookDelivery.findMany({
    where: {
      webhookId: webhookId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.min(limit, 100), // Cap at 100
  });

  return logs;
}

/**
 * Manually retry a failed delivery
 *
 * @param deliveryId - Delivery attempt ID
 * @param webhookId - Webhook ID
 * @param tenantId - Tenant ID (for authorization)
 * @returns Success boolean
 *
 * @example
 * await retryDelivery('del_123', 'wh_456', 'org_789');
 */
export async function retryDelivery(
  deliveryId: string,
  webhookId: string,
  tenantId: string
): Promise<boolean> {
  // Verify webhook exists and belongs to tenant
  const webhook = await getWebhook(webhookId, tenantId);
  if (!webhook) {
    throw new Error('Webhook not found');
  }

  // Get delivery attempt
  const delivery = await prisma.webhookDelivery.findFirst({
    where: {
      id: deliveryId,
      webhookId: webhookId,
    },
  });

  if (!delivery) {
    throw new Error('Delivery attempt not found');
  }

  // Check if already delivered successfully
  if (delivery.deliveredAt) {
    throw new Error('Cannot retry successful delivery');
  }

  // Re-queue the webhook delivery
  // This will be handled by the webhook queue/worker
  const { publishWebhookJob } = await import('./event-publisher.service');
  await publishWebhookJob({
    webhookId: webhook.id,
    deliveryId: delivery.id,
    event: delivery.eventType as WebhookEvent,
    payload: delivery.payload as any,
  });

  return true;
}

/**
 * Get webhooks subscribed to a specific event for a tenant
 * Internal function used by event publisher
 *
 * @param tenantId - Tenant ID
 * @param event - Event type
 * @returns Array of active webhooks subscribed to the event
 */
export async function getWebhooksForEvent(
  tenantId: string,
  event: WebhookEvent
): Promise<WebhookWithStats[]> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      tenantId: tenantId,
      isActive: true,
      events: {
        has: event,
      },
    },
  });

  return webhooks.map((webhook) => {
    const totalDeliveries =
      webhook.deliverySuccessCount + webhook.deliveryFailureCount;
    const successRate =
      totalDeliveries > 0
        ? (webhook.deliverySuccessCount / totalDeliveries) * 100
        : 0;

    return {
      ...webhook,
      totalDeliveries,
      successRate,
    };
  });
}
