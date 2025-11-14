/**
 * Audit Logging System
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Logs all admin actions for compliance and security monitoring.
 * Stores audit logs in the database with full context.
 */

import { prisma as _prisma } from '@tournament/shared';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BAN'
  | 'SUSPEND'
  | 'RESTORE'
  | 'BULK_DELETE'
  | 'BULK_UPDATE'
  | 'EXPORT'
  | 'VIEW';

export type AuditResource =
  | 'TOURNAMENT'
  | 'USER'
  | 'ORGANIZATION'
  | 'PLAYER'
  | 'MATCH'
  | 'PAYMENT'
  | 'NOTIFICATION'
  | 'SETTINGS';

export interface AuditLogEntry {
  userId: string; // Admin who performed the action
  userEmail: string;
  orgId: string; // Organization context for multi-tenancy
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string; // ID of the resource (if applicable)
  changes?: Record<string, unknown>; // What changed (old/new values)
  metadata?: Record<string, unknown>; // Additional context
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an admin action to the audit log
 * Writes to database for persistent storage and compliance
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    // Write to database for persistent audit trail
    await _prisma.auditLog.create({
      data: {
        orgId: entry.orgId,
        userId: entry.userId,
        userName: entry.userEmail, // Use email as name for now
        action: entry.action.toLowerCase(),
        resource: entry.resource.toLowerCase(),
        resourceId: entry.resourceId,
        changes: entry.changes as any, // Prisma Json type
        metadata: entry.metadata as any, // Prisma Json type
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });

    // Also log to console for real-time monitoring
    console.log('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      orgId: entry.orgId,
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
    }));
  } catch (error) {
    // Never fail the main operation due to audit logging errors
    console.error('Failed to log audit entry:', error);
  }
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Log tournament creation
 */
export async function logTournamentCreated(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  tournamentId: string,
  tournamentData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action: 'CREATE',
    resource: 'TOURNAMENT',
    resourceId: tournamentId,
    changes: { new: tournamentData },
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Log tournament update
 */
export async function logTournamentUpdated(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  tournamentId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action: 'UPDATE',
    resource: 'TOURNAMENT',
    resourceId: tournamentId,
    changes: { old: oldData, new: newData },
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Log tournament deletion
 */
export async function logTournamentDeleted(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  tournamentId: string,
  tournamentData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action: 'DELETE',
    resource: 'TOURNAMENT',
    resourceId: tournamentId,
    changes: { old: tournamentData },
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Log user ban
 */
export async function logUserBanned(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  reason: string,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action: 'BAN',
    resource: 'USER',
    resourceId: targetUserId,
    metadata: { reason },
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Log user suspension
 */
export async function logUserSuspended(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  duration: string,
  reason: string,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action: 'SUSPEND',
    resource: 'USER',
    resourceId: targetUserId,
    metadata: { duration, reason },
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Log user update
 */
export async function logUserUpdated(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action: 'UPDATE',
    resource: 'USER',
    resourceId: targetUserId,
    changes: { old: oldData, new: newData },
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Log bulk operation
 */
export async function logBulkOperation(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  action: 'BULK_DELETE' | 'BULK_UPDATE',
  resource: AuditResource,
  resourceIds: string[],
  changes?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action,
    resource,
    metadata: {
      resourceIds,
      count: resourceIds.length,
    },
    changes,
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Log data export
 */
export async function logDataExport(
  orgId: string,
  adminUserId: string,
  adminEmail: string,
  resource: AuditResource,
  filters: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
    orgId,
    userId: adminUserId,
    userEmail: adminEmail,
    action: 'EXPORT',
    resource,
    metadata: { filters },
    ipAddress: request?.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

// ============================================================================
// AUDIT LOG RETRIEVAL
// ============================================================================

/**
 * Get audit logs with filters
 * Queries from database with pagination and filtering
 */
export async function getAuditLogs(filters: {
  orgId: string; // Required for multi-tenant isolation
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: Array<{
    id: string;
    userId: string;
    userName: string;
    action: string;
    resource: string;
    resourceId: string | null;
    changes: any;
    metadata: any;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: Date;
  }>;
  total: number;
}> {
  try {
    const where = {
      orgId: filters.orgId,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.action && { action: filters.action.toLowerCase() }),
      ...(filters.resource && { resource: filters.resource.toLowerCase() }),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    // Query logs with pagination
    const [rawLogs, total] = await Promise.all([
      _prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      _prisma.auditLog.count({ where }),
    ]);

    // Map createdAt to timestamp to match return type
    const logs = rawLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.userName,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      changes: log.changes,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.createdAt,
    }));

    return {
      logs,
      total,
    };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return {
      logs: [],
      total: 0,
    };
  }
}
