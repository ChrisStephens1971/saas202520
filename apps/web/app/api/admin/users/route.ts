/**
 * Admin User Management API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Admin-only endpoints for managing users across all organizations.
 *
 * Routes:
 * - GET /api/admin/users - List all users with filters
 * - POST /api/admin/users - Create user (admin creation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma, Prisma } from '@tournament/shared';
import { logAdminAction } from '@/lib/audit/logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['owner', 'admin', 'td', 'scorekeeper', 'streamer']).optional(),
  orgId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const CreateUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  orgId: z.string().optional(),
  role: z.enum(['owner', 'admin', 'td', 'scorekeeper', 'streamer']).default('td'),
});

// ============================================================================
// GET /api/admin/users
// ============================================================================

/**
 * List all users with pagination, search, and filters
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const validation = ListUsersQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { page, limit, search, role, orgId, startDate, endDate, sortBy, sortOrder } =
      validation.data;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Filter by organization and/or role
    if (orgId || role) {
      where.organizationMembers = {
        some: {
          ...(orgId && { orgId }),
          ...(role && { role }),
        },
      };
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      include: {
        organizationMembers: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Format response (exclude password)
    const userList = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      emailVerified: u.emailVerified?.toISOString() ?? null,
      organizations: u.organizationMembers.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      {
        users: userList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/admin/users
// ============================================================================

/**
 * Create user (admin creation)
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);

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

    const data = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'A user with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user with optional organization membership
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        emailVerified: new Date(), // Auto-verify admin-created users
        ...(data.orgId && {
          organizationMembers: {
            create: {
              orgId: data.orgId,
              role: data.role,
            },
          },
        }),
      },
      include: {
        organizationMembers: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Log audit trail
    await logAdminAction({
      userId: authResult.user.id,
      userEmail: authResult.user.email,
      orgId: authResult.user.orgId,
      action: 'CREATE',
      resource: 'USER',
      resourceId: user.id,
      changes: {
        new: {
          name: user.name,
          email: user.email,
          orgId: data.orgId,
          role: data.role,
        },
      },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified?.toISOString() ?? null,
          organizations: user.organizationMembers.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
          })),
          createdAt: user.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
