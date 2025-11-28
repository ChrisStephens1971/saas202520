/**
 * Cache Invalidation Strategies
 * Sprint 9 Phase 3 - Scale & Performance
 *
 * Provides intelligent cache invalidation:
 * - Event-based invalidation (when data changes)
 * - Bulk invalidation (related data)
 * - Time-based expiration
 * - Pattern-based invalidation
 */

import { cacheService } from './redis';
import {
  TournamentCache,
  UserCache,
  AnalyticsCache,
  APICache as _APICache,
  StaticCache,
} from './strategies';

/**
 * Cache invalidation events
 */
export enum CacheEvent {
  // Tournament events
  TOURNAMENT_CREATED = 'tournament:created',
  TOURNAMENT_UPDATED = 'tournament:updated',
  TOURNAMENT_DELETED = 'tournament:deleted',
  TOURNAMENT_STARTED = 'tournament:started',
  TOURNAMENT_COMPLETED = 'tournament:completed',

  // Match events
  MATCH_CREATED = 'match:created',
  MATCH_UPDATED = 'match:updated',
  MATCH_COMPLETED = 'match:completed',

  // Player events
  PLAYER_REGISTERED = 'player:registered',
  PLAYER_ELIMINATED = 'player:eliminated',

  // User events
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',
  USER_PERMISSION_CHANGED = 'user:permission:changed',
  USER_LOGGED_OUT = 'user:logged_out',

  // Organization events
  ORG_SETTINGS_UPDATED = 'org:settings:updated',
  ORG_MEMBERS_CHANGED = 'org:members:changed',

  // Analytics events
  ANALYTICS_RECALCULATED = 'analytics:recalculated',
}

/**
 * Event payload with context
 */
interface InvalidationEvent {
  event: CacheEvent;
  tenantId: string;
  resourceId?: string;
  relatedIds?: string[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Cache invalidation service
 */
export class CacheInvalidation {
  /**
   * Handle cache invalidation event
   *
   * Routes events to appropriate invalidation strategies
   *
   * @param event - Invalidation event with context
   */
  static async handle(event: InvalidationEvent): Promise<void> {
    const { event: eventType, tenantId, resourceId, relatedIds } = event;

    console.log(`[Cache Invalidation] Handling ${eventType} for tenant ${tenantId}`);

    try {
      switch (eventType) {
        // Tournament events
        case CacheEvent.TOURNAMENT_CREATED:
          await this.handleTournamentCreated(tenantId);
          break;

        case CacheEvent.TOURNAMENT_UPDATED:
          if (resourceId) {
            await this.handleTournamentUpdated(tenantId, resourceId);
          }
          break;

        case CacheEvent.TOURNAMENT_DELETED:
          if (resourceId) {
            await this.handleTournamentDeleted(tenantId, resourceId);
          }
          break;

        case CacheEvent.TOURNAMENT_STARTED:
        case CacheEvent.TOURNAMENT_COMPLETED:
          if (resourceId) {
            await this.handleTournamentStatusChange(tenantId, resourceId);
          }
          break;

        // Match events
        case CacheEvent.MATCH_CREATED:
        case CacheEvent.MATCH_UPDATED:
        case CacheEvent.MATCH_COMPLETED:
          if (resourceId && relatedIds?.[0]) {
            await this.handleMatchEvent(tenantId, relatedIds[0], resourceId);
          }
          break;

        // Player events
        case CacheEvent.PLAYER_REGISTERED:
        case CacheEvent.PLAYER_ELIMINATED:
          if (resourceId && relatedIds?.[0]) {
            await this.handlePlayerEvent(tenantId, relatedIds[0], resourceId);
          }
          break;

        // User events
        case CacheEvent.USER_UPDATED:
          if (resourceId) {
            await this.handleUserUpdated(tenantId, resourceId);
          }
          break;

        case CacheEvent.USER_DELETED:
          if (resourceId) {
            await this.handleUserDeleted(tenantId, resourceId);
          }
          break;

        case CacheEvent.USER_PERMISSION_CHANGED:
          if (resourceId) {
            await this.handleUserPermissionChanged(tenantId, resourceId);
          }
          break;

        case CacheEvent.USER_LOGGED_OUT:
          if (resourceId) {
            await this.handleUserLoggedOut(tenantId, resourceId);
          }
          break;

        // Organization events
        case CacheEvent.ORG_SETTINGS_UPDATED:
          await this.handleOrgSettingsUpdated(tenantId);
          break;

        case CacheEvent.ORG_MEMBERS_CHANGED:
          await this.handleOrgMembersChanged(tenantId);
          break;

        // Analytics events
        case CacheEvent.ANALYTICS_RECALCULATED:
          await this.handleAnalyticsRecalculated(tenantId, resourceId);
          break;

        default:
          console.warn(`[Cache Invalidation] Unknown event type: ${eventType}`);
      }
    } catch {
      console.error('[Cache Invalidation] Error handling event');
    }
  }

  /**
   * Tournament created - invalidate tournament lists
   */
  private static async handleTournamentCreated(tenantId: string): Promise<void> {
    await cacheService.invalidate(tenantId, 'tournament:list:*');
    await AnalyticsCache.invalidateAnalytics(tenantId);
  }

  /**
   * Tournament updated - invalidate tournament and related data
   */
  private static async handleTournamentUpdated(
    tenantId: string,
    tournamentId: string
  ): Promise<void> {
    await TournamentCache.invalidateTournament(tenantId, tournamentId);
    await cacheService.invalidate(tenantId, 'tournament:list:*');
    await AnalyticsCache.invalidateTournamentAnalytics(tenantId, tournamentId);
  }

  /**
   * Tournament deleted - remove all tournament data
   */
  private static async handleTournamentDeleted(
    tenantId: string,
    tournamentId: string
  ): Promise<void> {
    await TournamentCache.invalidateTournament(tenantId, tournamentId);
    await cacheService.invalidate(tenantId, 'tournament:list:*');
    await AnalyticsCache.invalidateAnalytics(tenantId);
  }

  /**
   * Tournament status changed - invalidate tournament and lists
   */
  private static async handleTournamentStatusChange(
    tenantId: string,
    tournamentId: string
  ): Promise<void> {
    await TournamentCache.invalidateTournament(tenantId, tournamentId);
    await cacheService.invalidate(tenantId, 'tournament:list:*');
    await AnalyticsCache.invalidateTournamentAnalytics(tenantId, tournamentId);
  }

  /**
   * Match event - invalidate tournament matches and leaderboard
   */
  private static async handleMatchEvent(
    tenantId: string,
    tournamentId: string,
    _matchId: string
  ): Promise<void> {
    // Invalidate matches
    await cacheService.delete(tenantId, `tournament:${tournamentId}:matches`);

    // Invalidate leaderboard (scores changed)
    await cacheService.delete(tenantId, `tournament:${tournamentId}:leaderboard`);

    // Invalidate tournament summary (may have updated stats)
    await cacheService.delete(tenantId, `tournament:${tournamentId}`);

    // Invalidate analytics
    await AnalyticsCache.invalidateTournamentAnalytics(tenantId, tournamentId);
  }

  /**
   * Player event - invalidate tournament data
   */
  private static async handlePlayerEvent(
    tenantId: string,
    tournamentId: string,
    playerId: string
  ): Promise<void> {
    // Invalidate tournament (player list changed)
    await cacheService.delete(tenantId, `tournament:${tournamentId}`);

    // Invalidate leaderboard
    await cacheService.delete(tenantId, `tournament:${tournamentId}:leaderboard`);

    // Invalidate user's profile
    await cacheService.delete(tenantId, `user:${playerId}:profile`);

    // Invalidate analytics
    await AnalyticsCache.invalidateTournamentAnalytics(tenantId, tournamentId);
  }

  /**
   * User updated - invalidate user data
   */
  private static async handleUserUpdated(tenantId: string, userId: string): Promise<void> {
    await UserCache.invalidateUser(tenantId, userId);
  }

  /**
   * User deleted - remove all user data
   */
  private static async handleUserDeleted(tenantId: string, userId: string): Promise<void> {
    await UserCache.invalidateUser(tenantId, userId);
    await AnalyticsCache.invalidateAnalytics(tenantId);
  }

  /**
   * User permission changed - invalidate permissions cache
   */
  private static async handleUserPermissionChanged(
    tenantId: string,
    userId: string
  ): Promise<void> {
    await cacheService.delete(tenantId, `user:${userId}:permissions`);
    await cacheService.delete(tenantId, `user:${userId}:session`);
  }

  /**
   * User logged out - clear session
   */
  private static async handleUserLoggedOut(tenantId: string, userId: string): Promise<void> {
    await UserCache.deleteSession(tenantId, userId);
  }

  /**
   * Organization settings updated - invalidate org cache
   */
  private static async handleOrgSettingsUpdated(tenantId: string): Promise<void> {
    await StaticCache.invalidateAll(tenantId);
    await AnalyticsCache.invalidateAnalytics(tenantId);
  }

  /**
   * Organization members changed - invalidate member lists
   */
  private static async handleOrgMembersChanged(tenantId: string): Promise<void> {
    await cacheService.invalidate(tenantId, 'static:org:*');
    await cacheService.invalidate(tenantId, 'user:*:permissions');
  }

  /**
   * Analytics recalculated - invalidate analytics cache
   */
  private static async handleAnalyticsRecalculated(
    tenantId: string,
    resourceId?: string
  ): Promise<void> {
    if (resourceId) {
      await AnalyticsCache.invalidateTournamentAnalytics(tenantId, resourceId);
    } else {
      await AnalyticsCache.invalidateAnalytics(tenantId);
    }
  }
}

/**
 * Bulk invalidation helpers
 */
export class BulkInvalidation {
  /**
   * Invalidate all cache for a tenant
   */
  static async invalidateAllForTenant(tenantId: string): Promise<number> {
    console.log(`[Cache Invalidation] Clearing all cache for tenant ${tenantId}`);
    return await cacheService.clear(tenantId);
  }

  /**
   * Invalidate all tournament-related cache
   */
  static async invalidateAllTournaments(tenantId: string): Promise<number> {
    console.log(`[Cache Invalidation] Clearing all tournament cache for tenant ${tenantId}`);
    return await cacheService.invalidate(tenantId, 'tournament:*');
  }

  /**
   * Invalidate all user-related cache
   */
  static async invalidateAllUsers(tenantId: string): Promise<number> {
    console.log(`[Cache Invalidation] Clearing all user cache for tenant ${tenantId}`);
    return await cacheService.invalidate(tenantId, 'user:*');
  }

  /**
   * Invalidate all API response cache
   */
  static async invalidateAllAPI(tenantId: string): Promise<number> {
    console.log(`[Cache Invalidation] Clearing all API cache for tenant ${tenantId}`);
    return await cacheService.invalidate(tenantId, 'api:*');
  }

  /**
   * Invalidate cache for multiple tournaments at once
   */
  static async invalidateTournaments(tenantId: string, tournamentIds: string[]): Promise<void> {
    console.log(`[Cache Invalidation] Clearing cache for ${tournamentIds.length} tournaments`);

    const promises = tournamentIds.map((id) => TournamentCache.invalidateTournament(tenantId, id));

    await Promise.all(promises);
  }

  /**
   * Invalidate cache for multiple users at once
   */
  static async invalidateUsers(tenantId: string, userIds: string[]): Promise<void> {
    console.log(`[Cache Invalidation] Clearing cache for ${userIds.length} users`);

    const promises = userIds.map((id) => UserCache.invalidateUser(tenantId, id));

    await Promise.all(promises);
  }
}

/**
 * Time-based expiration helpers
 */
export class TimeBasedInvalidation {
  /**
   * Schedule cache refresh at specific time
   *
   * @param _tenantId - Tenant identifier (unused, reserved for future use)
   * @param key - Cache key
   * @param refreshFn - Function to refresh cache
   * @param scheduleTime - Time to refresh (Date object)
   */
  static scheduleRefresh(
    _tenantId: string,
    key: string,
    refreshFn: () => Promise<unknown>,
    scheduleTime: Date
  ): NodeJS.Timeout {
    const delay = scheduleTime.getTime() - Date.now();

    if (delay <= 0) {
      // Time already passed, refresh immediately
      refreshFn().catch((error) => {
        console.error('[Cache Invalidation] Scheduled refresh failed:', error);
      });
      return setTimeout(() => {}, 0);
    }

    return setTimeout(async () => {
      try {
        await refreshFn();
        console.log(`[Cache Invalidation] Scheduled refresh completed for ${key}`);
      } catch (error) {
        console.error('[Cache Invalidation] Scheduled refresh failed:', error);
      }
    }, delay);
  }

  /**
   * Schedule recurring cache invalidation
   *
   * @param tenantId - Tenant identifier
   * @param pattern - Cache key pattern
   * @param intervalMs - Interval in milliseconds
   */
  static scheduleRecurring(tenantId: string, pattern: string, intervalMs: number): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const count = await cacheService.invalidate(tenantId, pattern);
        console.log(
          `[Cache Invalidation] Recurring invalidation cleared ${count} keys matching ${pattern}`
        );
      } catch (error) {
        console.error('[Cache Invalidation] Recurring invalidation failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Invalidate stale cache entries (expired but not removed)
   *
   * This is a cleanup operation for keys that should have expired
   */
  static async cleanupStaleCache(tenantId: string): Promise<number> {
    console.log(`[Cache Invalidation] Cleaning up stale cache for tenant ${tenantId}`);

    // In a real implementation, you would check TTL and remove stale entries
    // For now, this is a placeholder for manual cleanup
    return 0;
  }
}

/**
 * Helper function to emit cache invalidation events
 *
 * Use this in your application code when data changes
 *
 * @param event - Cache event type
 * @param tenantId - Tenant identifier
 * @param resourceId - Resource identifier (optional)
 * @param relatedIds - Related resource IDs (optional)
 * @param metadata - Additional metadata (optional)
 */
export async function emitCacheEvent(
  event: CacheEvent,
  tenantId: string,
  resourceId?: string,
  relatedIds?: string[],
  metadata?: Record<string, unknown>
): Promise<void> {
  const invalidationEvent: InvalidationEvent = {
    event,
    tenantId,
    resourceId,
    relatedIds,
    timestamp: new Date(),
    metadata,
  };

  await CacheInvalidation.handle(invalidationEvent);
}

/**
 * Decorator for automatic cache invalidation on method execution
 *
 * Usage:
 * @InvalidateCache(CacheEvent.TOURNAMENT_UPDATED, 'tenantId', 'tournamentId')
 * async updateTournament(tenantId: string, tournamentId: string, data: any) {
 *   // ... update logic
 * }
 */
export function InvalidateCache(
  event: CacheEvent,
  tenantIdParam: string,
  resourceIdParam?: string
) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Extract parameters from method arguments
      const tenantId = args[0] as string; // Assuming first arg is tenantId
      const resourceId = resourceIdParam ? (args[1] as string) : undefined;

      // Emit cache event
      await emitCacheEvent(event, tenantId, resourceId);

      return result;
    };

    return descriptor;
  };
}
