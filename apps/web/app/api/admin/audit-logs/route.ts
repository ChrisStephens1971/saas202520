import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { getAuditLogs, AuditAction, AuditResource } from '@/lib/audit/logger';

/**
 * GET /api/admin/audit-logs
 * Fetch audit logs with optional filtering
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const orgId = authResult.user.orgId;

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') as AuditAction | undefined;
    const resource = searchParams.get('resource') as AuditResource | undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch audit logs from database using the audit logger
    const { logs, total } = await getAuditLogs({
      orgId,
      userId,
      action,
      resource,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

/**
 * POST /api/admin/audit-logs
 * Create a new audit log entry (for manual logging)
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    // Validate required fields
    const { action, resource, resourceId, changes, metadata } = body;

    if (!action || !resource) {
      return NextResponse.json(
        { error: 'Missing required fields: action, resource' },
        { status: 400 }
      );
    }

    // Create audit log using the audit logger
    const { logAdminAction } = await import('@/lib/audit/logger');

    await logAdminAction({
      userId: authResult.user.id,
      userEmail: authResult.user.email,
      orgId: authResult.user.orgId,
      action: action.toUpperCase() as AuditAction,
      resource: resource.toUpperCase() as AuditResource,
      resourceId,
      changes,
      metadata,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Audit log created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
