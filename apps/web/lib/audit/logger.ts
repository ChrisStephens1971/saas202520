/**
 * Audit Logging System
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Logs all admin actions for compliance and security monitoring.
 * Stores audit logs in the database with full context.
 */

import { prisma } from '@tournament/shared';

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
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    // Store in TournamentEvent table (event-sourced audit log)
    // Note: We'll need to add a system-level audit log table in future
    // For now, we'll log to console and consider adding a dedicated AuditLog table

    const logData = {
      timestamp: new Date().toISOString(),
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      changes: entry.changes,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };

    // Log to console for monitoring systems
    console.log('[AUDIT]', JSON.stringify(logData));

    // TODO: Store in dedicated AuditLog table when available
    // For now, we'll create a simple logging mechanism
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
  adminUserId: string,
  adminEmail: string,
  tournamentId: string,
  tournamentData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
  adminUserId: string,
  adminEmail: string,
  tournamentId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
  adminUserId: string,
  adminEmail: string,
  tournamentId: string,
  tournamentData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  reason: string,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  duration: string,
  reason: string,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
  adminUserId: string,
  adminEmail: string,
  action: 'BULK_DELETE' | 'BULK_UPDATE',
  resource: AuditResource,
  resourceIds: string[],
  changes?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
  adminUserId: string,
  adminEmail: string,
  resource: AuditResource,
  filters: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAdminAction({
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
 * Note: This is a placeholder until we have a dedicated AuditLog table
 */
export async function getAuditLogs(filters: {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: AuditLogEntry[];
  total: number;
}> {
  // TODO: Implement when AuditLog table is created
  // For now, return empty results
  return {
    logs: [],
    total: 0,
  };
}
