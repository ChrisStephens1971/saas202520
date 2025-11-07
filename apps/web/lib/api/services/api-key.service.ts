/**
 * API Key Service
 * Manages API key lifecycle: generation, validation, and revocation
 *
 * @module lib/api/services/api-key.service
 */

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type {
  ApiKey,
  ApiTier,
  CreateApiKeyInput,
  GeneratedApiKey,
  RATE_LIMITS,
} from '../types/api';

// Rate limits for each tier
const TIER_RATE_LIMITS: Record<ApiTier, number> = {
  free: 100,
  pro: 1000,
  enterprise: 10000,
};

/**
 * Generate a new API key
 *
 * @param tenantId - Organization ID
 * @param userId - User ID creating the key
 * @param name - User-friendly name for the key
 * @param tier - API tier (free, pro, enterprise)
 * @returns Generated API key with plaintext key (shown only once)
 */
export async function generateApiKey(
  tenantId: string,
  userId: string,
  name: string,
  tier: ApiTier = 'free'
): Promise<GeneratedApiKey> {
  // Generate random key
  const randomBytes = crypto.randomBytes(32);
  const keyBody = randomBytes.toString('base64url');

  // Create key with prefix (sk_live_ for production)
  const fullKey = `sk_live_${keyBody}`;

  // Create key prefix for display (first 15 chars)
  const keyPrefix = `${fullKey.substring(0, 15)}...`;

  // Hash the key for storage (never store plaintext)
  const keyHash = await hashApiKey(fullKey);

  // Get rate limit for tier
  const rateLimit = getTierRateLimit(tier);

  // Store in database
  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId,
      userId,
      name,
      keyPrefix,
      keyHash,
      tier,
      rateLimit,
      isActive: true,
    },
  });

  return {
    id: apiKey.id,
    key: fullKey, // Only time plaintext key is exposed
    keyPrefix,
    keyHash,
    tier,
    rateLimit,
  };
}

/**
 * Hash API key using bcrypt
 *
 * @param key - Plaintext API key
 * @returns Bcrypt hash of the key
 */
export async function hashApiKey(key: string): Promise<string> {
  // Use bcrypt with 10 rounds (balance between security and performance)
  return bcrypt.hash(key, 10);
}

/**
 * Validate API key
 * Checks if key exists, is active, and not expired
 *
 * @param key - Plaintext API key to validate
 * @returns API key object if valid, null otherwise
 */
export async function validateApiKey(
  key: string
): Promise<ApiKey | null> {
  try {
    // Get all active API keys (we need to check bcrypt hashes)
    // Note: In production, consider caching active keys in Redis
    const activeKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    // Check each key's hash
    for (const apiKey of activeKeys) {
      const isMatch = await bcrypt.compare(key, apiKey.keyHash);
      if (isMatch) {
        return apiKey as ApiKey;
      }
    }

    return null;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

/**
 * Get API key by hash
 * Used when we already have the hash (e.g., from cache)
 *
 * @param keyHash - Bcrypt hash of the key
 * @returns API key object if found, null otherwise
 */
export async function getApiKeyByHash(
  keyHash: string
): Promise<ApiKey | null> {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    // Check if key is active and not expired
    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    return apiKey as ApiKey;
  } catch (error) {
    console.error('Error getting API key by hash:', error);
    return null;
  }
}

/**
 * Revoke an API key
 * Marks the key as inactive (cannot be used anymore)
 *
 * @param keyId - API key ID to revoke
 * @returns Updated API key
 */
export async function revokeApiKey(keyId: string): Promise<ApiKey> {
  return prisma.apiKey.update({
    where: { id: keyId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  }) as Promise<ApiKey>;
}

/**
 * Update last used timestamp
 * Called after each successful API request
 *
 * @param keyId - API key ID
 */
export async function updateLastUsed(keyId: string): Promise<void> {
  try {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    });
  } catch (error) {
    // Non-critical error, log but don't throw
    console.error('Error updating last used timestamp:', error);
  }
}

/**
 * Get rate limit for a tier
 *
 * @param tier - API tier
 * @returns Requests per hour for the tier
 */
export function getTierRateLimit(tier: ApiTier): number {
  return TIER_RATE_LIMITS[tier];
}

/**
 * Validate API key format
 * Checks if key matches expected format (sk_live_ or sk_test_ + 43 chars)
 *
 * @param key - API key to validate
 * @returns True if format is valid
 */
export function validateApiKeyFormat(key: string): boolean {
  // Expected format: sk_(live|test)_<43 alphanumeric chars> (total: 51 chars)
  // Example: sk_live_abc123... or sk_test_xyz789...
  const regex = /^sk_(live|test)_[A-Za-z0-9_-]{43}$/;
  return regex.test(key);
}

/**
 * Get all API keys for a tenant
 *
 * @param tenantId - Organization ID
 * @returns List of API keys
 */
export async function getApiKeysByTenant(
  tenantId: string
): Promise<ApiKey[]> {
  return prisma.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  }) as Promise<ApiKey[]>;
}

/**
 * Get API key by ID
 *
 * @param keyId - API key ID
 * @returns API key object if found, null otherwise
 */
export async function getApiKeyById(
  keyId: string
): Promise<ApiKey | null> {
  return prisma.apiKey.findUnique({
    where: { id: keyId },
  }) as Promise<ApiKey | null>;
}
