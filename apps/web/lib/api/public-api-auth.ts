/**
 * Public API Authentication Middleware
 * Sprint 10 Week 3 - Public API & Webhooks
 *
 * Extracts and validates API keys from Authorization header,
 * providing tenant context for public API endpoints.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export interface ApiAuthContext {
  tenantId: string;
  userId: string | null;
  apiKeyId: string;
  tier: string;
  rateLimit: number;
}

/**
 * API Authentication Result - Success Case
 */
export interface ApiAuthSuccess {
  success: true;
  context: ApiAuthContext;
}

/**
 * API Authentication Result - Failure Case
 */
export interface ApiAuthFailure {
  success: false;
  error: {
    code: 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'EXPIRED_API_KEY' | 'INACTIVE_API_KEY';
    message: string;
  };
}

/**
 * API Authentication Result - Discriminated Union
 */
export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

/**
 * Extract API key from Authorization header
 * Supports: Bearer <api_key>
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <key>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    return match[1].trim();
  }

  // Support direct API key
  return authHeader.trim();
}

/**
 * Authenticate API request and return tenant context
 *
 * This function:
 * 1. Extracts API key from Authorization header
 * 2. Validates the key against database (bcrypt hash comparison)
 * 3. Checks if key is active and not expired
 * 4. Returns tenant context for multi-tenant data isolation
 *
 * @param request - Next.js request object
 * @returns Authentication result with tenant context or error
 *
 * @example
 * const auth = await authenticateApiRequest(request);
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error.message }, { status: 401 });
 * }
 * const tenantId = auth.context.tenantId;
 */
export async function authenticateApiRequest(request: NextRequest): Promise<ApiAuthResult> {
  try {
    // Extract API key from header
    const apiKey = extractApiKey(request);

    if (!apiKey) {
      return {
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Missing API key. Provide via Authorization header: Bearer <api_key>',
        },
      };
    }

    // Find all active API keys
    // We need to check all because we hash the full key
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        keyHash: true,
        tier: true,
        rateLimit: true,
        expiresAt: true,
        lastUsedAt: true,
      },
    });

    // Find matching key by comparing hashes
    let matchedKey: (typeof apiKeys)[0] | null = null;
    for (const key of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, key.keyHash);
      if (isMatch) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      return {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
      };
    }

    // Check if key is expired
    if (matchedKey.expiresAt && matchedKey.expiresAt < new Date()) {
      return {
        success: false,
        error: {
          code: 'EXPIRED_API_KEY',
          message: 'API key has expired',
        },
      };
    }

    // Update last used timestamp (async, don't await)
    prisma.apiKey
      .update({
        where: { id: matchedKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => {
        console.error('Failed to update API key lastUsedAt:', err);
      });

    // Return authenticated context
    return {
      success: true,
      context: {
        tenantId: matchedKey.tenantId,
        userId: matchedKey.userId,
        apiKeyId: matchedKey.id,
        tier: matchedKey.tier,
        rateLimit: matchedKey.rateLimit,
      },
    };
  } catch (error) {
    console.error('API authentication error:', error);
    return {
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Authentication failed',
      },
    };
  }
}

/**
 * Get tenant ID from authenticated request
 * Convenience wrapper around authenticateApiRequest
 */
export async function getTenantIdFromApiKey(request: NextRequest): Promise<string | null> {
  const auth = await authenticateApiRequest(request);
  return auth.success ? auth.context.tenantId : null;
}
