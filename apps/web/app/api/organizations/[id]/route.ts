/**
 * Organization Detail API Endpoints
 *
 * Handles operations on individual organizations.
 * All endpoints require authentication and verify user membership.
 *
 * Routes:
 * - GET /api/organizations/:id - Get organization details
 * - PUT /api/organizations/:id - Update organization (owner only)
 * - DELETE /api/organizations/:id - Delete organization (owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import {
  UpdateOrganizationRequestSchema,
  type GetOrganizationResponse,
  type UpdateOrganizationResponse,
} from '@tournament/api-contracts';

/**
 * GET /api/organizations/:id
 *
 * Retrieves a single organization by ID.
 * User must be a member of the organization.
 *
 * @param {string} id - Organization ID (from URL)
 * @returns {GetOrganizationResponse} Organization details with user's role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch organization and verify user membership
    const membership = await prisma.organizationMember.findFirst({
      where: {
        orgId: id,
        userId: session.user.id,
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    const response: GetOrganizationResponse = {
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        createdAt: membership.organization.createdAt.toISOString(),
        updatedAt: membership.organization.updatedAt.toISOString(),
        userRole: membership.role as 'owner' | 'td' | 'scorekeeper' | 'streamer',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch organization',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/:id
 *
 * Updates an organization's name and/or slug.
 * Only organization owners can update organizations.
 *
 * Request Body:
 * - name?: string (optional, 1-255 characters)
 * - slug?: string (optional, URL-safe format)
 *
 * @param {string} id - Organization ID (from URL)
 * @returns {UpdateOrganizationResponse} Updated organization
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify user is an owner of the organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        orgId: id,
        userId: session.user.id,
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners can update organizations',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateOrganizationRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // If slug is being changed, check if it's already taken
    if (updateData.slug && updateData.slug !== membership.organization.slug) {
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: updateData.slug },
      });

      if (existingOrg) {
        return NextResponse.json(
          {
            error: {
              code: 'SLUG_TAKEN',
              message: `Organization slug "${updateData.slug}" is already in use`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Update organization
    const updated = await prisma.organization.update({
      where: { id },
      data: updateData,
    });

    const response: UpdateOrganizationResponse = {
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        userRole: membership.role as 'owner' | 'td' | 'scorekeeper' | 'streamer',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update organization',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/:id
 *
 * Deletes an organization and all related data.
 * Only organization owners can delete organizations.
 * Cascades to tournaments, players, matches, etc.
 *
 * @param {string} id - Organization ID (from URL)
 * @returns {Response} 204 No Content on success
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify user is an owner of the organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        orgId: id,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners can delete organizations',
          },
        },
        { status: 403 }
      );
    }

    // Delete organization (cascades to members, tournaments, etc.)
    await prisma.organization.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete organization',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
