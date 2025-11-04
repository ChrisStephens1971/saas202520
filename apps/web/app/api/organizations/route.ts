/**
 * Organizations API Endpoints
 *
 * Handles CRUD operations for organizations (tenants).
 * All endpoints require authentication and enforce multi-tenant isolation.
 *
 * Routes:
 * - GET /api/organizations - List user's organizations
 * - POST /api/organizations - Create new organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import {
  CreateOrganizationRequestSchema,
  ListOrganizationsQuerySchema,
  type ListOrganizationsResponse,
  type CreateOrganizationResponse,
} from '@tournament/api-contracts';

/**
 * GET /api/organizations
 *
 * Lists all organizations the authenticated user is a member of.
 * Returns organizations with the user's role in each.
 *
 * Query Parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 *
 * @returns {ListOrganizationsResponse} Paginated list of organizations
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = ListOrganizationsQuerySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid query parameters',
            details: queryValidation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { limit, offset } = queryValidation.data;

    // Fetch user's organization memberships
    const [memberships, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where: { userId: session.user.id },
        include: {
          organization: true,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organizationMember.count({
        where: { userId: session.user.id },
      }),
    ]);

    // Transform to response format with user role
    const organizations = memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      createdAt: membership.organization.createdAt.toISOString(),
      updatedAt: membership.organization.updatedAt.toISOString(),
      userRole: membership.role as 'owner' | 'td' | 'scorekeeper' | 'streamer',
    }));

    const response: ListOrganizationsResponse = {
      organizations,
      total,
      limit,
      offset,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error listing organizations:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list organizations',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 *
 * Creates a new organization and adds the creator as owner.
 * The slug must be unique across all organizations.
 *
 * Request Body:
 * - name: string (required, 1-255 characters)
 * - slug: string (required, URL-safe format)
 *
 * @returns {CreateOrganizationResponse} Created organization with owner role
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateOrganizationRequestSchema.safeParse(body);

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

    const { name, slug } = validation.data;

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        {
          error: {
            code: 'SLUG_TAKEN',
            message: `Organization slug "${slug}" is already in use`,
          },
        },
        { status: 409 }
      );
    }

    // Create organization and owner membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          orgId: organization.id,
          userId: session.user!.id,
          role: 'owner',
        },
      });

      return organization;
    });

    const response: CreateOrganizationResponse = {
      organization: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        userRole: 'owner',
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create organization',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
