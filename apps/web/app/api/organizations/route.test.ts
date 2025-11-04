/**
 * Unit Tests for Organizations API Endpoints (List & Create)
 *
 * Tests GET /api/organizations and POST /api/organizations
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@tournament/shared');

const mockAuth = require('@/auth').auth as jest.Mock;
const mockPrisma = require('@tournament/shared').prisma;

describe('Organizations API - List & Create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/organizations', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should list organizations with default pagination', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockMemberships = [
        {
          role: 'owner',
          createdAt: new Date('2024-01-01'),
          organization: {
            id: 'org1',
            name: 'Test Org 1',
            slug: 'test-org-1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        },
        {
          role: 'td',
          createdAt: new Date('2024-01-02'),
          organization: {
            id: 'org2',
            name: 'Test Org 2',
            slug: 'test-org-2',
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
        },
      ];

      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMemberships);
      mockPrisma.organizationMember.count.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/organizations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.organizations).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
      expect(data.organizations[0].userRole).toBe('owner');
      expect(data.organizations[1].userRole).toBe('td');
    });

    it('should respect limit and offset query parameters', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.organizationMember.count.mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost:3000/api/organizations?limit=10&offset=5'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(5);
      expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        })
      );
    });

    it('should return 400 for invalid query parameters', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/organizations?limit=invalid'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/organizations', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org', slug: 'test-org' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should create organization and add creator as owner', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockOrganization = {
        id: 'org123',
        name: 'Test Organization',
        slug: 'test-organization',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Organization',
          slug: 'test-organization',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.organization.name).toBe('Test Organization');
      expect(data.organization.slug).toBe('test-organization');
      expect(data.organization.userRole).toBe('owner');
    });

    it('should transform slug to lowercase', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockOrganization = {
        id: 'org123',
        name: 'Test Organization',
        slug: 'test-organization',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Organization',
          slug: 'Test-Organization', // Uppercase
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.organization.slug).toBe('test-organization'); // Lowercase
    });

    it('should return 409 if slug is already taken', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'existing-org',
        slug: 'test-org',
      });

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org', slug: 'test-org' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('SLUG_TAKEN');
    });

    it('should return 400 for invalid request body', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: '', slug: 'invalid_slug' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should reject slugs with invalid format', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const invalidSlugs = ['test_org', 'Test-Org', '-test', 'test-', 'test--org'];

      for (const slug of invalidSlugs) {
        const request = new NextRequest('http://localhost:3000/api/organizations', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Org', slug }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.code).toBe('INVALID_REQUEST');
      }
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organization.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Org', slug: 'test-org' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
