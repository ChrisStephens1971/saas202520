/**
 * Cache Strategies
 * Sprint 9 Phase 3 - Scale & Performance
 *
 * Defines caching strategies for different data types:
 * - Tournament data (5 minutes)
 * - User sessions (24 hours)
 * - Leaderboards (1 minute)
 * - API responses (varies)
 * - Analytics data (15 minutes)
 */

import { cacheService } from './redis';

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  TOURNAMENT: 300, // 5 minutes
  TOURNAMENT_LIST: 180, // 3 minutes
  TOURNAMENT_MATCHES: 60, // 1 minute (frequently updated)
  LEADERBOARD: 60, // 1 minute (real-time updates)
  USER_SESSION: 86400, // 24 hours
  USER_PROFILE: 3600, // 1 hour
  ANALYTICS: 900, // 15 minutes
  API_RESPONSE: 300, // 5 minutes (default)
  STATIC_DATA: 3600, // 1 hour (rarely changes)
  SHORT_LIVED: 30, // 30 seconds (very dynamic)
} as const;

/**
 * Tournament caching strategies
 */
export const TournamentCache = {
  /**
   * Cache tournament data
   */
  async getTournament(tenantId: string, tournamentId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      `tournament:${tournamentId}`,
      requestId
    );
  },

  async setTournament(tenantId: string, tournamentId: string, data: any) {
    return cacheService.set(
      tenantId,
      `tournament:${tournamentId}`,
      data,
      CacheTTL.TOURNAMENT
    );
  },

  /**
   * Cache tournament list
   */
  async getTournamentList(
    tenantId: string,
    filters: Record<string, any>,
    requestId?: string
  ) {
    const filterKey = JSON.stringify(filters);
    const hash = this.hashString(filterKey);
    return cacheService.get(
      tenantId,
      `tournament:list:${hash}`,
      requestId
    );
  },

  async setTournamentList(
    tenantId: string,
    filters: Record<string, any>,
    data: any
  ) {
    const filterKey = JSON.stringify(filters);
    const hash = this.hashString(filterKey);
    return cacheService.set(
      tenantId,
      `tournament:list:${hash}`,
      data,
      CacheTTL.TOURNAMENT_LIST
    );
  },

  /**
   * Cache tournament matches
   */
  async getMatches(tenantId: string, tournamentId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      `tournament:${tournamentId}:matches`,
      requestId
    );
  },

  async setMatches(tenantId: string, tournamentId: string, data: any) {
    return cacheService.set(
      tenantId,
      `tournament:${tournamentId}:matches`,
      data,
      CacheTTL.TOURNAMENT_MATCHES
    );
  },

  /**
   * Cache tournament leaderboard
   */
  async getLeaderboard(tenantId: string, tournamentId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      `tournament:${tournamentId}:leaderboard`,
      requestId
    );
  },

  async setLeaderboard(tenantId: string, tournamentId: string, data: any) {
    return cacheService.set(
      tenantId,
      `tournament:${tournamentId}:leaderboard`,
      data,
      CacheTTL.LEADERBOARD
    );
  },

  /**
   * Invalidate all tournament-related cache
   */
  async invalidateTournament(tenantId: string, tournamentId: string) {
    await cacheService.invalidate(tenantId, `tournament:${tournamentId}*`);
  },

  /**
   * Simple string hash function for cache keys
   */
  hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  },
};

/**
 * User session caching strategies
 */
export const UserCache = {
  /**
   * Cache user session data
   */
  async getSession(tenantId: string, userId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      `user:${userId}:session`,
      requestId
    );
  },

  async setSession(tenantId: string, userId: string, data: any) {
    return cacheService.set(
      tenantId,
      `user:${userId}:session`,
      data,
      CacheTTL.USER_SESSION
    );
  },

  async deleteSession(tenantId: string, userId: string) {
    return cacheService.delete(tenantId, `user:${userId}:session`);
  },

  /**
   * Cache user profile data
   */
  async getProfile(tenantId: string, userId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      `user:${userId}:profile`,
      requestId
    );
  },

  async setProfile(tenantId: string, userId: string, data: any) {
    return cacheService.set(
      tenantId,
      `user:${userId}:profile`,
      data,
      CacheTTL.USER_PROFILE
    );
  },

  /**
   * Cache user permissions
   */
  async getPermissions(tenantId: string, userId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      `user:${userId}:permissions`,
      requestId
    );
  },

  async setPermissions(tenantId: string, userId: string, data: any) {
    return cacheService.set(
      tenantId,
      `user:${userId}:permissions`,
      data,
      CacheTTL.USER_PROFILE
    );
  },

  /**
   * Invalidate all user-related cache
   */
  async invalidateUser(tenantId: string, userId: string) {
    await cacheService.invalidate(tenantId, `user:${userId}*`);
  },
};

/**
 * Analytics caching strategies
 */
export const AnalyticsCache = {
  /**
   * Cache system analytics
   */
  async getSystemAnalytics(tenantId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      'analytics:system',
      requestId
    );
  },

  async setSystemAnalytics(tenantId: string, data: any) {
    return cacheService.set(
      tenantId,
      'analytics:system',
      data,
      CacheTTL.ANALYTICS
    );
  },

  /**
   * Cache tournament analytics
   */
  async getTournamentAnalytics(
    tenantId: string,
    tournamentId: string,
    requestId?: string
  ) {
    return cacheService.get(
      tenantId,
      `analytics:tournament:${tournamentId}`,
      requestId
    );
  },

  async setTournamentAnalytics(tenantId: string, tournamentId: string, data: any) {
    return cacheService.set(
      tenantId,
      `analytics:tournament:${tournamentId}`,
      data,
      CacheTTL.ANALYTICS
    );
  },

  /**
   * Cache user activity analytics
   */
  async getUserAnalytics(
    tenantId: string,
    userId: string,
    period: string,
    requestId?: string
  ) {
    return cacheService.get(
      tenantId,
      `analytics:user:${userId}:${period}`,
      requestId
    );
  },

  async setUserAnalytics(
    tenantId: string,
    userId: string,
    period: string,
    data: any
  ) {
    return cacheService.set(
      tenantId,
      `analytics:user:${userId}:${period}`,
      data,
      CacheTTL.ANALYTICS
    );
  },

  /**
   * Invalidate tournament analytics
   */
  async invalidateTournamentAnalytics(tenantId: string, tournamentId: string) {
    await cacheService.invalidate(tenantId, `analytics:tournament:${tournamentId}`);
  },

  /**
   * Invalidate all analytics cache
   */
  async invalidateAnalytics(tenantId: string) {
    await cacheService.invalidate(tenantId, 'analytics:*');
  },
};

/**
 * API response caching strategies
 */
export const APICache = {
  /**
   * Cache API response with custom TTL
   */
  async getResponse(
    tenantId: string,
    endpoint: string,
    params: Record<string, any>,
    requestId?: string
  ) {
    const hash = TournamentCache.hashString(JSON.stringify(params));
    return cacheService.get(
      tenantId,
      `api:${endpoint}:${hash}`,
      requestId
    );
  },

  async setResponse(
    tenantId: string,
    endpoint: string,
    params: Record<string, any>,
    data: any,
    ttl: number = CacheTTL.API_RESPONSE
  ) {
    const hash = TournamentCache.hashString(JSON.stringify(params));
    return cacheService.set(
      tenantId,
      `api:${endpoint}:${hash}`,
      data,
      ttl
    );
  },

  /**
   * Invalidate API responses for an endpoint
   */
  async invalidateEndpoint(tenantId: string, endpoint: string) {
    await cacheService.invalidate(tenantId, `api:${endpoint}*`);
  },

  /**
   * Invalidate all API cache
   */
  async invalidateAll(tenantId: string) {
    await cacheService.invalidate(tenantId, 'api:*');
  },
};

/**
 * Static data caching (rarely changes)
 */
export const StaticCache = {
  /**
   * Cache static configuration
   */
  async getConfig(tenantId: string, key: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      `static:config:${key}`,
      requestId
    );
  },

  async setConfig(tenantId: string, key: string, data: any) {
    return cacheService.set(
      tenantId,
      `static:config:${key}`,
      data,
      CacheTTL.STATIC_DATA
    );
  },

  /**
   * Cache organization settings
   */
  async getOrgSettings(tenantId: string, requestId?: string) {
    return cacheService.get(
      tenantId,
      'static:org:settings',
      requestId
    );
  },

  async setOrgSettings(tenantId: string, data: any) {
    return cacheService.set(
      tenantId,
      'static:org:settings',
      data,
      CacheTTL.STATIC_DATA
    );
  },

  /**
   * Invalidate all static cache
   */
  async invalidateAll(tenantId: string) {
    await cacheService.invalidate(tenantId, 'static:*');
  },
};

/**
 * Cache-aside pattern helper
 *
 * Implements the cache-aside (lazy loading) pattern:
 * 1. Check cache first
 * 2. If miss, fetch from database
 * 3. Store in cache for next time
 *
 * @template T - Type of data being cached
 * @param tenantId - Tenant identifier
 * @param key - Cache key
 * @param fetchFn - Function to fetch data if cache miss
 * @param ttl - Time to live in seconds
 * @param requestId - Optional request ID for tracking
 * @returns Cached or freshly fetched data
 */
export async function cacheAside<T>(
  tenantId: string,
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CacheTTL.API_RESPONSE,
  requestId?: string
): Promise<T> {
  // Try cache first
  const cached = await cacheService.get<T>(tenantId, key, requestId);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from database
  const data = await fetchFn();

  // Store in cache for next time (don't await, let it happen in background)
  cacheService.set(tenantId, key, data, ttl).catch((error) => {
    console.error('[Cache] Failed to store data:', error);
  });

  return data;
}

/**
 * Write-through pattern helper
 *
 * Updates both cache and database simultaneously
 *
 * @template T - Type of data being stored
 * @param tenantId - Tenant identifier
 * @param key - Cache key
 * @param data - Data to store
 * @param updateFn - Function to update database
 * @param ttl - Time to live in seconds
 * @returns True if both operations succeeded
 */
export async function writeThrough<T>(
  tenantId: string,
  key: string,
  data: T,
  updateFn: () => Promise<void>,
  ttl: number = CacheTTL.API_RESPONSE
): Promise<boolean> {
  try {
    // Update database first
    await updateFn();

    // Then update cache
    await cacheService.set(tenantId, key, data, ttl);

    return true;
  } catch (error) {
    console.error('[Cache] Write-through failed:', error);
    return false;
  }
}

/**
 * Refresh cache in background (cache warming)
 *
 * @template T - Type of data being cached
 * @param tenantId - Tenant identifier
 * @param key - Cache key
 * @param fetchFn - Function to fetch fresh data
 * @param ttl - Time to live in seconds
 */
export async function refreshCache<T>(
  tenantId: string,
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CacheTTL.API_RESPONSE
): Promise<void> {
  try {
    const data = await fetchFn();
    await cacheService.set(tenantId, key, data, ttl);
  } catch (error) {
    console.error('[Cache] Failed to refresh cache:', error);
  }
}
