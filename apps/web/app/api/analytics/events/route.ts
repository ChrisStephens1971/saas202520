/**
 * Analytics Events API
 * Sprint 10 Week 1 Day 1 - Business Intelligence Features
 *
 * Provides event tracking for tenant analytics.
 * Tenant-scoped endpoint (non-admin) for recording analytics events.
 *
 * Routes:
 * - POST /api/analytics/events - Track analytics events
 * - GET /api/analytics/events - Query analytics events (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma, Prisma } from '@tournament/shared';
import { checkAPIRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateEventRequest {
  eventType: string;
  eventData: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export interface CreateEventResponse {
  id: string;
  eventType: string;
  timestamp: string;
  success: true;
}

export interface EventQueryParams {
  eventType?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface EventsResponse {
  events: {
    id: string;
    eventType: string;
    eventData: Record<string, unknown>;
    userId: string | null;
    sessionId: string | null;
    timestamp: string;
  }[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// POST /api/analytics/events
// ============================================================================

/**
 * Track an analytics event for the current tenant
 *
 * Request Body:
 * - eventType: string (required) - Type of event (e.g., 'payment_completed', 'user_signup')
 * - eventData: object (required) - Event-specific data (flexible JSON)
 * - userId: string (optional) - User ID associated with event
 * - sessionId: string (optional) - Session ID for tracking user sessions
 *
 * @returns {CreateEventResponse} Created event confirmation
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Check rate limiting (100 requests per minute)
    const rateLimitResult = await checkAPIRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    // 3. Get organization context from headers (set by middleware)
    const headersList = await headers();
    const tenantId = headersList.get('x-org-id');

    if (!tenantId) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected. Please select an organization first.',
          },
        },
        { status: 400 }
      );
    }

    // 4. Verify user has access to this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId: tenantId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization.',
          },
        },
        { status: 403 }
      );
    }

    // 5. Parse and validate request body
    const body = (await request.json()) as CreateEventRequest;

    if (!body.eventType || typeof body.eventType !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'eventType is required and must be a string',
          },
        },
        { status: 400 }
      );
    }

    if (!body.eventData || typeof body.eventData !== 'object') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'eventData is required and must be an object',
          },
        },
        { status: 400 }
      );
    }

    // Validate eventType format (alphanumeric, underscores, dots, max 100 chars)
    if (!/^[a-zA-Z0-9_.]{1,100}$/.test(body.eventType)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_EVENT_TYPE',
            message:
              'eventType must be alphanumeric with underscores/dots and max 100 characters',
          },
        },
        { status: 400 }
      );
    }

    // Validate sessionId if provided (max 255 chars)
    if (body.sessionId && body.sessionId.length > 255) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_SESSION_ID',
            message: 'sessionId must be max 255 characters',
          },
        },
        { status: 400 }
      );
    }

    // 6. Create analytics event in database
    const event = await prisma.analyticsEvent.create({
      data: {
        tenantId,
        eventType: body.eventType,
        eventData: body.eventData as Prisma.InputJsonValue,
        userId: body.userId || session.user.id,
        sessionId: body.sessionId || null,
        timestamp: new Date(),
      },
    });

    // 7. Build response
    const response: CreateEventResponse = {
      id: event.id,
      eventType: event.eventType,
      timestamp: event.timestamp.toISOString(),
      success: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating analytics event:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create analytics event',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/analytics/events
// ============================================================================

/**
 * Query analytics events for the current tenant
 *
 * Query Parameters:
 * - eventType: string (optional) - Filter by event type
 * - startDate: ISO date string (optional) - Filter events after this date
 * - endDate: ISO date string (optional) - Filter events before this date
 * - userId: string (optional) - Filter by user ID
 * - limit: number (default: 100, max: 1000)
 * - offset: number (default: 0)
 *
 * @returns {EventsResponse} Paginated list of events
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Check rate limiting (100 requests per minute)
    const rateLimitResult = await checkAPIRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    // 3. Get organization context from headers (set by middleware)
    const headersList = await headers();
    const tenantId = headersList.get('x-org-id');

    if (!tenantId) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected. Please select an organization first.',
          },
        },
        { status: 400 }
      );
    }

    // 4. Verify user has access to this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId: tenantId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization.',
          },
        },
        { status: 403 }
      );
    }

    // 5. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType') || undefined;
    const startDateParam = searchParams.get('startDate');
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDateParam = searchParams.get('endDate');
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const userId = searchParams.get('userId') || undefined;
    const limitParam = parseInt(searchParams.get('limit') || '100');
    const offsetParam = parseInt(searchParams.get('offset') || '0');

    const limit = Math.min(Math.max(limitParam, 1), 1000);
    const offset = Math.max(offsetParam, 0);

    // 6. Build where clause
    const where = {
      tenantId,
      ...(eventType && { eventType }),
      ...(userId && { userId }),
      ...(startDate || endDate
        ? {
            timestamp: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    // 7. Fetch events from database
    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    // 8. Transform to response format
    const response: EventsResponse = {
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventData: event.eventData as Record<string, unknown>,
        userId: event.userId,
        sessionId: event.sessionId,
        timestamp: event.timestamp.toISOString(),
      })),
      total,
      limit,
      offset,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics events',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
