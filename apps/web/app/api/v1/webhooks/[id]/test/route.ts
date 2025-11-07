/**
 * Webhook Test Endpoint
 * POST /api/v1/webhooks/:id/test
 *
 * Sends a test event to webhook endpoint immediately (no queue)
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebhook } from '@/lib/api/services/webhook.service';
import { createWebhookHeaders } from '@/lib/api/utils/webhook-signature.utils';
import { WebhookEvent, WebhookPayload } from '@/lib/api/types/webhook-events.types';
import fetch from 'node-fetch';

/**
 * Test webhook endpoint
 * Sends a test event synchronously
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add API authentication middleware
    // For now, extract tenantId from headers or session
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant ID' },
        { status: 401 }
      );
    }

    const webhookId = params.id;

    // Get webhook details
    const webhook = await getWebhook(webhookId, tenantId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Create test payload
    const testPayload: WebhookPayload = {
      id: `evt_test_${Date.now()}`,
      event: WebhookEvent.TOURNAMENT_CREATED,
      timestamp: new Date().toISOString(),
      tenantId: tenantId,
      data: {
        test: true,
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
        sentAt: new Date().toISOString(),
      },
    };

    // Create headers with signature
    const headers = createWebhookHeaders(
      testPayload,
      webhook.secret,
      'test.webhook',
      `test_${Date.now()}`
    );

    // Send test request (with 5 second timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const startTime = Date.now();
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Read response
      const responseText = await response.text();

      return NextResponse.json({
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        responseBody: responseText.substring(0, 500),
        headers: {
          'x-webhook-signature': headers['X-Webhook-Signature'],
          'x-webhook-event': headers['X-Webhook-Event'],
          'x-webhook-delivery-id': headers['X-Webhook-Delivery-Id'],
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Request timeout (>5 seconds)',
          duration: '5000ms+',
        }, { status: 408 });
      }

      return NextResponse.json({
        success: false,
        error: `Network error: ${fetchError.message}`,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Webhook Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
