/**
 * Tests for Organization API Contracts
 */

// Jest globals (describe, it, expect) are available automatically
import {
  OrganizationSchema,
  OrganizationMemberSchema,
  OrganizationWithRoleSchema,
  CreateOrganizationRequestSchema,
  UpdateOrganizationRequestSchema,
  AddOrganizationMemberRequestSchema,
  OrganizationRoleEnum,
} from './organizations';

describe('Organization Contracts', () => {
  describe('OrganizationSchema', () => {
    it('should validate a valid organization', () => {
      const validOrganization = {
        id: 'clqw1234567890',
        name: 'Billiards Pro League',
        slug: 'billiards-pro-league',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      };

      const result = OrganizationSchema.safeParse(validOrganization);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalidOrganization = {
        id: 'clqw1234567890',
        // name missing
        slug: 'test-org',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      };

      const result = OrganizationSchema.safeParse(invalidOrganization);
      expect(result.success).toBe(false);
    });

    it('should validate slug format (lowercase with hyphens)', () => {
      const validSlugs = [
        'test-org',
        'billiards-league-2024',
        'my-organization-123',
        'abc',
      ];

      validSlugs.forEach((slug) => {
        const org = {
          id: 'clqw1234567890',
          name: 'Test',
          slug,
          createdAt: '2024-12-01T00:00:00Z',
          updatedAt: '2024-12-01T00:00:00Z',
        };
        const result = OrganizationSchema.safeParse(org);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'Test-Org', // uppercase
        'test_org', // underscore
        'test org', // space
        '-test-org', // leading hyphen
        'test-org-', // trailing hyphen
        'test--org', // double hyphen
        '',
      ];

      invalidSlugs.forEach((slug) => {
        const org = {
          id: 'clqw1234567890',
          name: 'Test',
          slug,
          createdAt: '2024-12-01T00:00:00Z',
          updatedAt: '2024-12-01T00:00:00Z',
        };
        const result = OrganizationSchema.safeParse(org);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('OrganizationMemberSchema', () => {
    it('should validate a valid organization member', () => {
      const validMember = {
        id: 'clqw1234567890',
        orgId: 'clqw0987654321',
        userId: 'clqw1111111111',
        role: 'owner' as const,
        createdAt: '2024-12-01T00:00:00Z',
      };

      const result = OrganizationMemberSchema.safeParse(validMember);
      expect(result.success).toBe(true);
    });

    it('should require all fields', () => {
      const invalidMember = {
        id: 'clqw1234567890',
        orgId: 'clqw0987654321',
        // userId missing
        role: 'owner',
        createdAt: '2024-12-01T00:00:00Z',
      };

      const result = OrganizationMemberSchema.safeParse(invalidMember);
      expect(result.success).toBe(false);
    });

    it('should validate role enum', () => {
      const validRoles = ['owner', 'td', 'scorekeeper', 'streamer'];

      validRoles.forEach((role) => {
        const member = {
          id: 'clqw1234567890',
          orgId: 'clqw0987654321',
          userId: 'clqw1111111111',
          role,
          createdAt: '2024-12-01T00:00:00Z',
        };
        const result = OrganizationMemberSchema.safeParse(member);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid roles', () => {
      const invalidMember = {
        id: 'clqw1234567890',
        orgId: 'clqw0987654321',
        userId: 'clqw1111111111',
        role: 'admin', // invalid role
        createdAt: '2024-12-01T00:00:00Z',
      };

      const result = OrganizationMemberSchema.safeParse(invalidMember);
      expect(result.success).toBe(false);
    });
  });

  describe('OrganizationWithRoleSchema', () => {
    it('should validate organization with user role', () => {
      const orgWithRole = {
        id: 'clqw1234567890',
        name: 'Test Organization',
        slug: 'test-org',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
        userRole: 'owner' as const,
      };

      const result = OrganizationWithRoleSchema.safeParse(orgWithRole);
      expect(result.success).toBe(true);
    });

    it('should allow optional memberCount', () => {
      const orgWithRole = {
        id: 'clqw1234567890',
        name: 'Test Organization',
        slug: 'test-org',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
        userRole: 'owner' as const,
        memberCount: 5,
      };

      const result = OrganizationWithRoleSchema.safeParse(orgWithRole);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memberCount).toBe(5);
      }
    });
  });

  describe('CreateOrganizationRequestSchema', () => {
    it('should validate a valid create request', () => {
      const validRequest = {
        name: 'New Organization',
        slug: 'new-organization',
      };

      const result = CreateOrganizationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidRequest = {
        name: '',
        slug: 'test-org',
      };

      const result = CreateOrganizationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should transform slug to lowercase', () => {
      const request = {
        name: 'Test Organization',
        slug: 'Test-Organization', // uppercase
      };

      const result = CreateOrganizationRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe('test-organization');
      }
    });

    it('should reject invalid slug format', () => {
      const invalidRequest = {
        name: 'Test',
        slug: 'test_organization', // underscore not allowed
      };

      const result = CreateOrganizationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateOrganizationRequestSchema', () => {
    it('should validate partial updates', () => {
      const validUpdate = {
        name: 'Updated Organization Name',
      };

      const result = UpdateOrganizationRequestSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow slug-only updates', () => {
      const validUpdate = {
        slug: 'new-slug',
      };

      const result = UpdateOrganizationRequestSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty updates', () => {
      const emptyUpdate = {};

      const result = UpdateOrganizationRequestSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should transform slug to lowercase in updates', () => {
      const update = {
        slug: 'New-Slug',
      };

      const result = UpdateOrganizationRequestSchema.safeParse(update);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe('new-slug');
      }
    });
  });

  describe('AddOrganizationMemberRequestSchema', () => {
    it('should validate add member request', () => {
      const validRequest = {
        userId: 'clqw1234567890',
        role: 'td' as const,
      };

      const result = AddOrganizationMemberRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const invalidRequest = {
        userId: 'clqw1234567890',
        role: 'invalid',
      };

      const result = AddOrganizationMemberRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('OrganizationRole Enum', () => {
    it('should validate all role types', () => {
      const roles = ['owner', 'td', 'scorekeeper', 'streamer'];

      roles.forEach((role) => {
        const result = OrganizationRoleEnum.safeParse(role);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid role types', () => {
      const invalidRoles = ['admin', 'user', 'member', 'guest'];

      invalidRoles.forEach((role) => {
        const result = OrganizationRoleEnum.safeParse(role);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long names (up to 255 chars)', () => {
      const longName = 'a'.repeat(255);
      const org = {
        id: 'clqw1234567890',
        name: longName,
        slug: 'test-org',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      };

      const result = OrganizationSchema.safeParse(org);
      expect(result.success).toBe(true);
    });

    it('should reject names over 255 chars', () => {
      const tooLongName = 'a'.repeat(256);
      const request = {
        name: tooLongName,
        slug: 'test-org',
      };

      const result = CreateOrganizationRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should handle slug with maximum length (100 chars)', () => {
      const longSlug = 'a'.repeat(100);
      const org = {
        id: 'clqw1234567890',
        name: 'Test',
        slug: longSlug,
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      };

      const result = OrganizationSchema.safeParse(org);
      expect(result.success).toBe(true);
    });

    it('should reject slugs over 100 chars', () => {
      const tooLongSlug = 'a'.repeat(101);
      const request = {
        name: 'Test',
        slug: tooLongSlug,
      };

      const result = CreateOrganizationRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});
