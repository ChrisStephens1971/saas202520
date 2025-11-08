/**
 * Webhook Signature Utilities
 * HMAC SHA-256 signature generation and verification for webhook security
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import crypto from 'crypto';

/**
 * Generate HMAC SHA-256 signature for webhook payload
 *
 * @param payload - Stringified JSON payload
 * @param secret - Webhook secret key
 * @returns Signature in format: sha256=<hex-hash>
 *
 * @example
 * const signature = generateSignature(JSON.stringify(payload), webhookSecret);
 * // Returns: "sha256=abc123def456..."
 */
export function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const hash = hmac.digest('hex');
  return `sha256=${hash}`;
}

/**
 * Verify HMAC SHA-256 signature for webhook payload
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param payload - Stringified JSON payload
 * @param signature - Signature to verify (format: sha256=<hex-hash>)
 * @param secret - Webhook secret key
 * @returns True if signature is valid, false otherwise
 *
 * @example
 * const isValid = verifySignature(
 *   JSON.stringify(payload),
 *   request.headers['x-webhook-signature'],
 *   webhookSecret
 * );
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = generateSignature(payload, secret);

    // Ensure both signatures are the same length before comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // If comparison fails (e.g., invalid encoding), return false
    return false;
  }
}

/**
 * Generate a secure random webhook secret
 * Creates a 32-byte (256-bit) random string suitable for HMAC secrets
 *
 * @returns Secure random string (64 hex characters)
 *
 * @example
 * const secret = generateWebhookSecret();
 * // Returns: "a1b2c3d4e5f6..."
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create webhook signature headers for HTTP requests
 *
 * @param payload - Webhook payload object
 * @param secret - Webhook secret key
 * @param eventType - Webhook event type
 * @param deliveryId - Unique delivery identifier
 * @returns Headers object with signature and metadata
 *
 * @example
 * const headers = createWebhookHeaders(payload, secret, 'tournament.created', 'del_123');
 * fetch(webhookUrl, {
 *   method: 'POST',
 *   headers: headers,
 *   body: JSON.stringify(payload)
 * });
 */
export function createWebhookHeaders(
  payload: Record<string, any>,
  secret: string,
  eventType: string,
  deliveryId: string
): Record<string, string> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  return {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Event': eventType,
    'X-Webhook-Delivery-Id': deliveryId,
    'X-Webhook-Timestamp': timestamp,
    'User-Agent': 'TournamentPlatform-Webhooks/1.0',
  };
}

/**
 * Verify webhook timestamp to prevent replay attacks
 * Rejects requests older than 5 minutes
 *
 * @param timestamp - Unix timestamp from webhook headers
 * @param maxAgeSeconds - Maximum age in seconds (default: 300 = 5 minutes)
 * @returns True if timestamp is recent, false if too old
 *
 * @example
 * const timestamp = request.headers['x-webhook-timestamp'];
 * if (!verifyTimestamp(parseInt(timestamp))) {
 *   throw new Error('Webhook timestamp too old');
 * }
 */
export function verifyTimestamp(
  timestamp: number,
  maxAgeSeconds: number = 300
): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const age = Math.abs(currentTime - timestamp);
  return age <= maxAgeSeconds;
}

/**
 * Complete webhook signature verification
 * Verifies both signature and timestamp
 *
 * @param payload - Stringified JSON payload
 * @param signature - Signature from headers
 * @param timestamp - Timestamp from headers
 * @param secret - Webhook secret key
 * @returns Object with verification result and error message if invalid
 *
 * @example
 * const result = verifyWebhookRequest(
 *   JSON.stringify(req.body),
 *   req.headers['x-webhook-signature'],
 *   parseInt(req.headers['x-webhook-timestamp']),
 *   webhookSecret
 * );
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 */
export function verifyWebhookRequest(
  payload: string,
  signature: string,
  timestamp: number,
  secret: string
): { valid: boolean; error?: string } {
  // Verify timestamp first (cheaper operation)
  if (!verifyTimestamp(timestamp)) {
    return {
      valid: false,
      error: 'Webhook timestamp too old (>5 minutes). Possible replay attack.',
    };
  }

  // Verify signature
  if (!verifySignature(payload, signature, secret)) {
    return {
      valid: false,
      error: 'Invalid webhook signature. Payload may have been tampered with.',
    };
  }

  return { valid: true };
}

/**
 * Parse signature from header
 * Extracts hex hash from "sha256=<hash>" format
 *
 * @param signatureHeader - Full signature header value
 * @returns Hex hash or null if invalid format
 *
 * @example
 * const hash = parseSignatureHeader('sha256=abc123...');
 * // Returns: "abc123..."
 */
export function parseSignatureHeader(signatureHeader: string): string | null {
  const match = signatureHeader.match(/^sha256=([a-f0-9]{64})$/);
  return match ? match[1] : null;
}
