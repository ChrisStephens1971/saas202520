/**
 * Public API Authentication Middleware Tests
 * Tests for API key validation and tenant context (Task C)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { authenticateApiRequest, getTenantIdFromApiKey } from '../public-api-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('Public API Authentication Middleware', () => {
  const mockApiKey = 'test-api-key-12345';
  const mockApiKeyHash = '$2a$10$hashedApiKey';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateApiRequest', () => {
    it('should return error if Authorization header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments');

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_API_KEY');
      expect(result.error?.message).toContain('Missing API key');
    });

    it('should extract API key from Bearer token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      const mockDbKey = {
        id: 'key-123',
        tenantId: 'org-123',
        userId: 'user-123',
        keyHash: mockApiKeyHash,
        tier: 'basic',
        rateLimit: 1000,
        expiresAt: null,
        lastUsedAt: new Date(),
      };

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([mockDbKey]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(true);
      expect(result.context?.tenantId).toBe('org-123');
      expect(result.context?.userId).toBe('user-123');
      expect(result.context?.apiKeyId).toBe('key-123');
      expect(result.context?.tier).toBe('basic');
      expect(result.context?.rateLimit).toBe(1000);
    });

    it('should extract API key from direct header value', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: mockApiKey,
        },
      });

      const mockDbKey = {
        id: 'key-123',
        tenantId: 'org-123',
        userId: 'user-123',
        keyHash: mockApiKeyHash,
        tier: 'basic',
        rateLimit: 1000,
        expiresAt: null,
        lastUsedAt: new Date(),
      };

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([mockDbKey]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(true);
    });

    it('should return error if API key is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([
        {
          id: 'key-123',
          tenantId: 'org-123',
          userId: 'user-123',
          keyHash: mockApiKeyHash,
          tier: 'basic',
          rateLimit: 1000,
          expiresAt: null,
          lastUsedAt: new Date(),
        },
      ]);

      // bcrypt.compare returns false (no match)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_API_KEY');
      expect(result.error?.message).toBe('Invalid API key');
    });

    it('should return error if API key is expired', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([
        {
          id: 'key-123',
          tenantId: 'org-123',
          userId: 'user-123',
          keyHash: mockApiKeyHash,
          tier: 'basic',
          rateLimit: 1000,
          expiresAt: expiredDate,
          lastUsedAt: new Date(),
        },
      ]);

      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXPIRED_API_KEY');
      expect(result.error?.message).toBe('API key has expired');
    });

    it('should allow API key that expires in the future', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([
        {
          id: 'key-123',
          tenantId: 'org-123',
          userId: 'user-123',
          keyHash: mockApiKeyHash,
          tier: 'basic',
          rateLimit: 1000,
          expiresAt: futureDate,
          lastUsedAt: new Date(),
        },
      ]);

      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(true);
      expect(result.context?.tenantId).toBe('org-123');
    });

    it('should update lastUsedAt timestamp asynchronously', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      const mockDbKey = {
        id: 'key-123',
        tenantId: 'org-123',
        userId: 'user-123',
        keyHash: mockApiKeyHash,
        tier: 'basic',
        rateLimit: 1000,
        expiresAt: null,
        lastUsedAt: new Date(),
      };

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([mockDbKey]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);

      await authenticateApiRequest(request);

      // Allow async update to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should handle update errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      const mockDbKey = {
        id: 'key-123',
        tenantId: 'org-123',
        userId: 'user-123',
        keyHash: mockApiKeyHash,
        tier: 'basic',
        rateLimit: 1000,
        expiresAt: null,
        lastUsedAt: new Date(),
      };

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([mockDbKey]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      vi.mocked(prisma.apiKey.update).mockRejectedValueOnce(new Error('Database error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await authenticateApiRequest(request);

      // Should still succeed even if update fails
      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should only check active API keys', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([]);

      const result = await authenticateApiRequest(request);

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
        select: expect.any(Object),
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_API_KEY');
    });

    it('should test multiple keys until match is found', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      const mockDbKeys = [
        {
          id: 'key-1',
          tenantId: 'org-1',
          userId: 'user-1',
          keyHash: '$2a$10$wrongHash1',
          tier: 'basic',
          rateLimit: 1000,
          expiresAt: null,
          lastUsedAt: new Date(),
        },
        {
          id: 'key-2',
          tenantId: 'org-2',
          userId: 'user-2',
          keyHash: '$2a$10$wrongHash2',
          tier: 'basic',
          rateLimit: 1000,
          expiresAt: null,
          lastUsedAt: new Date(),
        },
        {
          id: 'key-3',
          tenantId: 'org-3',
          userId: 'user-3',
          keyHash: mockApiKeyHash,
          tier: 'pro',
          rateLimit: 10000,
          expiresAt: null,
          lastUsedAt: new Date(),
        },
      ];

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce(mockDbKeys);
      vi.mocked(bcrypt.compare)
        .mockResolvedValueOnce(false as never)
        .mockResolvedValueOnce(false as never)
        .mockResolvedValueOnce(true as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(true);
      expect(result.context?.tenantId).toBe('org-3');
      expect(result.context?.tier).toBe('pro');
      expect(bcrypt.compare).toHaveBeenCalledTimes(3);
    });

    it('should handle database errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      vi.mocked(prisma.apiKey.findMany).mockRejectedValueOnce(
        new Error('Database connection error')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await authenticateApiRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_API_KEY');
      expect(result.error?.message).toBe('Authentication failed');
      expect(consoleSpy).toHaveBeenCalledWith('API authentication error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('getTenantIdFromApiKey', () => {
    it('should return tenant ID for valid API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
        },
      });

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([
        {
          id: 'key-123',
          tenantId: 'org-123',
          userId: 'user-123',
          keyHash: mockApiKeyHash,
          tier: 'basic',
          rateLimit: 1000,
          expiresAt: null,
          lastUsedAt: new Date(),
        },
      ]);

      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);

      const tenantId = await getTenantIdFromApiKey(request);

      expect(tenantId).toBe('org-123');
    });

    it('should return null for invalid API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: `Bearer invalid-key`,
        },
      });

      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([]);

      const tenantId = await getTenantIdFromApiKey(request);

      expect(tenantId).toBeNull();
    });

    it('should return null if Authorization header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/tournaments');

      const tenantId = await getTenantIdFromApiKey(request);

      expect(tenantId).toBeNull();
    });
  });

  describe('Tenant Isolation', () => {
    it('should ensure each API key returns its own tenant context', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: 'Bearer key-org-1',
        },
      });

      const request2 = new NextRequest('http://localhost:3000/api/v1/tournaments', {
        headers: {
          Authorization: 'Bearer key-org-2',
        },
      });

      vi.mocked(prisma.apiKey.findMany)
        .mockResolvedValueOnce([
          {
            id: 'key-1',
            tenantId: 'org-1',
            userId: 'user-1',
            keyHash: '$2a$10$hash1',
            tier: 'basic',
            rateLimit: 1000,
            expiresAt: null,
            lastUsedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'key-2',
            tenantId: 'org-2',
            userId: 'user-2',
            keyHash: '$2a$10$hash2',
            tier: 'pro',
            rateLimit: 10000,
            expiresAt: null,
            lastUsedAt: new Date(),
          },
        ]);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);

      const result1 = await authenticateApiRequest(request1);
      const result2 = await authenticateApiRequest(request2);

      expect(result1.context?.tenantId).toBe('org-1');
      expect(result2.context?.tenantId).toBe('org-2');
    });
  });
});
