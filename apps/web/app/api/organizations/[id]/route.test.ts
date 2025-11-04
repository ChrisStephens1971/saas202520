/**
 * Unit Tests for Organization Detail API Endpoints
 *
 * Tests GET, PUT, DELETE for /api/organizations/:id
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from './route';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@tournament/shared');

const mockAuth = require('@/auth').auth as jest.Mock;
const mockPrisma = require('@tournament/shared').prisma;

describe('Organization Detail API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/organizations/:id', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123');
      const response = await GET(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return organization for member', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockMembership = {
        role: 'owner',
        organization: {
          id: 'org123',
          name: 'Test Organization',
          slug: 'test-org',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMembership);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123');
      const response = await GET(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.organization.id).toBe('org123');
      expect(data.organization.userRole).toBe('owner');
    });

    it('should return 404 if user is not a member', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123');
      const response = await GET(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations/org123');
      const response = await GET(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/organizations/:id', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PUT(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if user is not an owner', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockMembership = {
        role: 'td', // Not owner
        organization: {
          id: 'org123',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMembership);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PUT(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should update organization if user is owner', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockMembership = {
        role: 'owner',
        organization: {
          id: 'org123',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      const mockUpdated = {
        id: 'org123',
        name: 'Updated Organization',
        slug: 'test-org',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.organization.update.mockResolvedValue(mockUpdated);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Organization' }),
      });

      const response = await PUT(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.organization.name).toBe('Updated Organization');
    });

    it('should allow partial updates', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockMembership = {
        role: 'owner',
        organization: {
          id: 'org123',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      const mockUpdated = {
        id: 'org123',
        name: 'Test Org',
        slug: 'new-slug',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.update.mockResolvedValue(mockUpdated);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'PUT',
        body: JSON.stringify({ slug: 'new-slug' }),
      });

      const response = await PUT(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.organization.slug).toBe('new-slug');
    });

    it('should return 409 if new slug is already taken', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockMembership = {
        role: 'owner',
        organization: {
          id: 'org123',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'other-org',
        slug: 'taken-slug',
      });

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'PUT',
        body: JSON.stringify({ slug: 'taken-slug' }),
      });

      const response = await PUT(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('SLUG_TAKEN');
    });

    it('should return 400 for invalid request body', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      const mockMembership = {
        role: 'owner',
        organization: {
          id: 'org123',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMembership);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'PUT',
        body: JSON.stringify({ slug: 'invalid_slug' }),
      });

      const response = await PUT(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('DELETE /api/organizations/:id', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 if user is not a member', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 if user is not an owner', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: 'td', // Not owner
      });

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should delete organization if user is owner', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: 'owner',
      });
      mockPrisma.organization.delete.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'org123' } });

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
      expect(mockPrisma.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org123' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      });

      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: 'owner',
      });
      mockPrisma.organization.delete.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations/org123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'org123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
