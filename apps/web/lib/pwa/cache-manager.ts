/**
 * Cache Manager
 *
 * Manages caching strategies and cache operations for offline-first functionality.
 * Works in conjunction with the service worker.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CacheStats {
  totalSize: number;
  cacheCount: number;
  caches: Array<{
    name: string;
    size: number;
    entryCount: number;
  }>;
}

export interface CacheOptions {
  maxAge?: number; // milliseconds
  maxEntries?: number;
  cacheName?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_VERSION = 'v1';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

export const CACHE_NAMES = {
  STATIC: `static-assets-${CACHE_VERSION}`,
  API: `api-cache-${CACHE_VERSION}`,
  TOURNAMENT_DATA: `tournament-data-${CACHE_VERSION}`,
  OFFLINE: `offline-${CACHE_VERSION}`,
  IMAGES: `images-${CACHE_VERSION}`,
} as const;

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Check if caches are supported
 */
export function isCacheSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Add a resource to cache
 */
export async function addToCache(
  url: string,
  response?: Response,
  cacheName: string = CACHE_NAMES.STATIC
): Promise<void> {
  if (!isCacheSupported()) {
    console.warn('[CacheManager] Caches not supported');
    return;
  }

  try {
    const cache = await caches.open(cacheName);

    if (response) {
      await cache.put(url, response);
    } else {
      await cache.add(url);
    }

    console.log('[CacheManager] Added to cache:', url, cacheName);
  } catch (error) {
    console.error('[CacheManager] Failed to add to cache:', error);
  }
}

/**
 * Get a resource from cache
 */
export async function getFromCache(
  url: string,
  cacheName?: string
): Promise<Response | undefined> {
  if (!isCacheSupported()) {
    return undefined;
  }

  try {
    if (cacheName) {
      const cache = await caches.open(cacheName);
      return cache.match(url);
    }

    // Search all caches
    return caches.match(url);
  } catch (error) {
    console.error('[CacheManager] Failed to get from cache:', error);
    return undefined;
  }
}

/**
 * Remove a resource from cache
 */
export async function removeFromCache(
  url: string,
  cacheName?: string
): Promise<boolean> {
  if (!isCacheSupported()) {
    return false;
  }

  try {
    if (cacheName) {
      const cache = await caches.open(cacheName);
      return cache.delete(url);
    }

    // Remove from all caches
    const cacheNames = await caches.keys();
    let removed = false;

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const deleted = await cache.delete(url);
      if (deleted) removed = true;
    }

    return removed;
  } catch (error) {
    console.error('[CacheManager] Failed to remove from cache:', error);
    return false;
  }
}

/**
 * Clear a specific cache
 */
export async function clearCache(cacheName: string): Promise<boolean> {
  if (!isCacheSupported()) {
    return false;
  }

  try {
    const deleted = await caches.delete(cacheName);
    console.log('[CacheManager] Cache cleared:', cacheName, deleted);
    return deleted;
  } catch (error) {
    console.error('[CacheManager] Failed to clear cache:', error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<number> {
  if (!isCacheSupported()) {
    return 0;
  }

  try {
    const cacheNames = await caches.keys();
    let cleared = 0;

    for (const cacheName of cacheNames) {
      const deleted = await caches.delete(cacheName);
      if (deleted) cleared++;
    }

    console.log('[CacheManager] All caches cleared:', cleared);
    return cleared;
  } catch (error) {
    console.error('[CacheManager] Failed to clear all caches:', error);
    return 0;
  }
}

/**
 * Clear old cache versions
 */
export async function clearOldCaches(): Promise<number> {
  if (!isCacheSupported()) {
    return 0;
  }

  try {
    const cacheNames = await caches.keys();
    let cleared = 0;

    for (const cacheName of cacheNames) {
      // Delete caches that don't match current version
      if (!cacheName.includes(CACHE_VERSION)) {
        const deleted = await caches.delete(cacheName);
        if (deleted) {
          cleared++;
          console.log('[CacheManager] Old cache cleared:', cacheName);
        }
      }
    }

    return cleared;
  } catch (error) {
    console.error('[CacheManager] Failed to clear old caches:', error);
    return 0;
  }
}

// =============================================================================
// CACHE STATISTICS
// =============================================================================

/**
 * Get the size of a blob
 */
async function getBlobSize(response: Response): Promise<number> {
  try {
    const blob = await response.blob();
    return blob.size;
  } catch {
    return 0;
  }
}

/**
 * Get statistics for a specific cache
 */
async function getCacheInfo(cacheName: string): Promise<{
  name: string;
  size: number;
  entryCount: number;
}> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  let size = 0;

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      size += await getBlobSize(response);
    }
  }

  return {
    name: cacheName,
    size,
    entryCount: keys.length,
  };
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  if (!isCacheSupported()) {
    return {
      totalSize: 0,
      cacheCount: 0,
      caches: [],
    };
  }

  try {
    const cacheNames = await caches.keys();
    const cacheInfos = await Promise.all(
      cacheNames.map((name) => getCacheInfo(name))
    );

    const totalSize = cacheInfos.reduce((sum, info) => sum + info.size, 0);

    return {
      totalSize,
      cacheCount: cacheNames.length,
      caches: cacheInfos,
    };
  } catch (error) {
    console.error('[CacheManager] Failed to get cache stats:', error);
    return {
      totalSize: 0,
      cacheCount: 0,
      caches: [],
    };
  }
}

/**
 * Check if cache size exceeds limit
 */
export async function isCacheSizeExceeded(): Promise<boolean> {
  const stats = await getCacheStats();
  return stats.totalSize > MAX_CACHE_SIZE;
}

// =============================================================================
// PRELOADING & PREFETCHING
// =============================================================================

/**
 * Preload critical resources
 */
export async function preloadCriticalResources(urls: string[]): Promise<void> {
  if (!isCacheSupported()) {
    return;
  }

  console.log('[CacheManager] Preloading critical resources:', urls.length);

  const cache = await caches.open(CACHE_NAMES.STATIC);

  try {
    await cache.addAll(urls);
    console.log('[CacheManager] Critical resources preloaded');
  } catch (error) {
    console.error('[CacheManager] Failed to preload resources:', error);
  }
}

/**
 * Prefetch tournament data for offline use
 */
export async function prefetchTournamentData(tournamentId: string): Promise<void> {
  if (!isCacheSupported()) {
    return;
  }

  console.log('[CacheManager] Prefetching tournament data:', tournamentId);

  const cache = await caches.open(CACHE_NAMES.TOURNAMENT_DATA);

  const endpoints = [
    `/api/tournaments/${tournamentId}`,
    `/api/tournaments/${tournamentId}/players`,
    `/api/tournaments/${tournamentId}/matches`,
    `/api/tournaments/${tournamentId}/standings`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        await cache.put(endpoint, response.clone());
      }
    } catch (error) {
      console.error('[CacheManager] Failed to prefetch:', endpoint, error);
    }
  }

  console.log('[CacheManager] Tournament data prefetched');
}

/**
 * Prefetch player profile data
 */
export async function prefetchPlayerData(playerId: string): Promise<void> {
  if (!isCacheSupported()) {
    return;
  }

  console.log('[CacheManager] Prefetching player data:', playerId);

  const cache = await caches.open(CACHE_NAMES.TOURNAMENT_DATA);

  const endpoints = [
    `/api/players/${playerId}`,
    `/api/players/${playerId}/stats`,
    `/api/players/${playerId}/history`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        await cache.put(endpoint, response.clone());
      }
    } catch (error) {
      console.error('[CacheManager] Failed to prefetch:', endpoint, error);
    }
  }

  console.log('[CacheManager] Player data prefetched');
}

// =============================================================================
// CACHE WARMING
// =============================================================================

/**
 * Warm the cache with common resources
 */
export async function warmCache(): Promise<void> {
  if (!isCacheSupported()) {
    return;
  }

  console.log('[CacheManager] Warming cache...');

  // Preload critical app resources
  await preloadCriticalResources([
    '/',
    '/tournaments',
    '/offline.html',
    '/manifest.json',
  ]);

  console.log('[CacheManager] Cache warmed');
}

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

/**
 * Invalidate tournament data cache
 */
export async function invalidateTournamentCache(tournamentId?: string): Promise<void> {
  if (!isCacheSupported()) {
    return;
  }

  console.log('[CacheManager] Invalidating tournament cache:', tournamentId || 'all');

  const cache = await caches.open(CACHE_NAMES.TOURNAMENT_DATA);
  const keys = await cache.keys();

  for (const request of keys) {
    const url = request.url;

    if (tournamentId) {
      // Invalidate specific tournament
      if (url.includes(`/tournaments/${tournamentId}`)) {
        await cache.delete(request);
      }
    } else {
      // Invalidate all tournaments
      if (url.includes('/tournaments/')) {
        await cache.delete(request);
      }
    }
  }

  console.log('[CacheManager] Tournament cache invalidated');
}

/**
 * Invalidate API cache
 */
export async function invalidateApiCache(pattern?: string): Promise<void> {
  if (!isCacheSupported()) {
    return;
  }

  console.log('[CacheManager] Invalidating API cache:', pattern || 'all');

  const cache = await caches.open(CACHE_NAMES.API);
  const keys = await cache.keys();

  for (const request of keys) {
    if (pattern) {
      if (request.url.includes(pattern)) {
        await cache.delete(request);
      }
    } else {
      await cache.delete(request);
    }
  }

  console.log('[CacheManager] API cache invalidated');
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get cache usage percentage
 */
export async function getCacheUsagePercentage(): Promise<number> {
  const stats = await getCacheStats();
  return (stats.totalSize / MAX_CACHE_SIZE) * 100;
}

/**
 * Check if a resource is cached
 */
export async function isCached(url: string, cacheName?: string): Promise<boolean> {
  const response = await getFromCache(url, cacheName);
  return !!response;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize cache manager
 */
export async function initCacheManager(): Promise<void> {
  if (!isCacheSupported()) {
    console.warn('[CacheManager] Caches not supported');
    return;
  }

  console.log('[CacheManager] Initializing...');

  // Clear old caches
  await clearOldCaches();

  // Warm cache with critical resources
  await warmCache();

  // Check cache size
  const stats = await getCacheStats();
  console.log('[CacheManager] Cache size:', formatBytes(stats.totalSize));

  if (stats.totalSize > MAX_CACHE_SIZE) {
    console.warn('[CacheManager] Cache size exceeded limit');
  }

  console.log('[CacheManager] Initialized successfully');
}

// Auto-initialize when module loads (if in browser)
if (typeof window !== 'undefined') {
  initCacheManager().catch((error) => {
    console.error('[CacheManager] Initialization failed:', error);
  });
}
