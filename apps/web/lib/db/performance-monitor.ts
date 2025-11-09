/**
 * Database Performance Monitor
 *
 * Utility functions for monitoring database performance and health.
 * Used in admin dashboard and for debugging performance issues.
 *
 * Sprint 9 Phase 3: Scale & Performance
 *
 * @module performance-monitor
 */

import { prisma } from '../prisma';
import { getQueryStats, getRecentSlowQueries, getPerformanceReport } from './query-optimizer';

/**
 * Database health metrics
 */
export interface DatabaseHealth {
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  performance: {
    totalQueries: number;
    slowQueries: number;
    avgDuration: number;
    maxDuration: number;
    slowQueryPercentage: number;
  };
  tables: {
    name: string;
    rowCount: number;
    sizeBytes: number;
  }[];
  indexes: {
    tableName: string;
    indexName: string;
    scans: number;
    tupsRead: number;
    tupsFetch: number;
  }[];
}

/**
 * PostgreSQL connection stats query result
 */
interface ConnectionStatsRow {
  total: bigint;
  active: bigint;
  idle: bigint;
}

/**
 * Get current database connection statistics
 *
 * Requires PostgreSQL privileges to query pg_stat_activity
 *
 * @returns Connection statistics
 */
export async function getConnectionStats() {
  try {
    const result = await prisma.$queryRaw<ConnectionStatsRow[]>`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const row = result[0];
    return row ? {
      total: Number(row.total),
      active: Number(row.active),
      idle: Number(row.idle),
    } : { total: 0, active: 0, idle: 0 };
  } catch (error) {
    console.error('Failed to get connection stats:', error);
    return { total: 0, active: 0, idle: 0 };
  }
}

/**
 * PostgreSQL table stats query result
 */
interface TableStatsRow {
  schemaname: string;
  name: string;
  size_bytes: bigint;
  row_count: bigint;
}

/**
 * Get table size statistics
 *
 * @returns Array of tables with row counts and sizes
 */
export async function getTableStats() {
  try {
    const result = await prisma.$queryRaw<TableStatsRow[]>`
      SELECT
        schemaname,
        tablename as name,
        pg_total_relation_size(schemaname||'.'||tablename)::bigint as size_bytes,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 20
    `;

    return result.map(row => ({
      name: row.name,
      rowCount: Number(row.row_count),
      sizeBytes: Number(row.size_bytes),
    }));
  } catch (error) {
    console.error('Failed to get table stats:', error);
    return [];
  }
}

/**
 * PostgreSQL index stats query result
 */
interface IndexStatsRow {
  schemaname: string;
  table_name: string;
  index_name: string;
  scans: bigint;
  tups_read: bigint;
  tups_fetch: bigint;
}

/**
 * Get index usage statistics
 *
 * Helps identify unused indexes that can be removed
 *
 * @returns Array of indexes with usage statistics
 */
export async function getIndexStats() {
  try {
    const result = await prisma.$queryRaw<IndexStatsRow[]>`
      SELECT
        schemaname,
        tablename as table_name,
        indexname as index_name,
        idx_scan as scans,
        idx_tup_read as tups_read,
        idx_tup_fetch as tups_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 50
    `;

    return result.map(row => ({
      tableName: row.table_name,
      indexName: row.index_name,
      scans: Number(row.scans),
      tupsRead: Number(row.tups_read),
      tupsFetch: Number(row.tups_fetch),
    }));
  } catch (error) {
    console.error('Failed to get index stats:', error);
    return [];
  }
}

/**
 * Get comprehensive database health report
 *
 * @returns Complete database health metrics
 */
export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const [connections, tables, indexes] = await Promise.all([
    getConnectionStats(),
    getTableStats(),
    getIndexStats(),
  ]);

  const performance = getQueryStats();

  return {
    connections: {
      active: connections.active,
      idle: connections.idle,
      total: connections.total,
    },
    performance,
    tables,
    indexes,
  };
}

/**
 * Get slow query analysis
 *
 * Returns grouped slow queries with recommendations
 *
 * @returns Slow query analysis with optimization hints
 */
export async function getSlowQueryAnalysis() {
  const _report = getPerformanceReport();
  const slowQueries = getRecentSlowQueries();

  interface GroupedQuery {
    model: string;
    action: string;
    count: number;
    totalDuration: number;
    maxDuration: number;
    avgDuration: number;
    examples: Array<{ duration: number; timestamp: Date }>;
  }

  // Group queries by model and action
  const grouped = slowQueries.reduce((acc, query) => {
    const key = `${query.model}.${query.action}`;
    if (!acc[key]) {
      acc[key] = {
        model: query.model,
        action: query.action,
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        avgDuration: 0,
        examples: [],
      };
    }
    acc[key].count++;
    acc[key].totalDuration += query.duration;
    acc[key].maxDuration = Math.max(acc[key].maxDuration, query.duration);

    // Keep up to 3 examples
    if (acc[key].examples.length < 3) {
      acc[key].examples.push({
        duration: query.duration,
        timestamp: query.timestamp,
      });
    }

    return acc;
  }, {} as Record<string, GroupedQuery>);

  // Calculate averages
  Object.values(grouped).forEach((group) => {
    group.avgDuration = Math.round((group.totalDuration / group.count) * 100) / 100;
  });

  // Sort by count (most frequent slow queries first)
  const sortedGroups = Object.values(grouped).sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalSlowQueries: slowQueries.length,
      uniquePatterns: sortedGroups.length,
      criticalQueries: sortedGroups.filter((g) => g.maxDuration > 500).length,
    },
    patterns: sortedGroups,
    recommendations: generateRecommendations(sortedGroups),
  };
}

/**
 * Generate optimization recommendations based on slow query patterns
 */
interface QueryPattern {
  model: string;
  action: string;
  count: number;
  maxDuration: number;
  avgDuration: number;
}

function generateRecommendations(patterns: QueryPattern[]): string[] {
  const recommendations: string[] = [];

  patterns.forEach(pattern => {
    // Very slow queries (> 500ms)
    if (pattern.maxDuration > 500) {
      recommendations.push(
        `CRITICAL: ${pattern.model}.${pattern.action} taking ${pattern.maxDuration}ms. ` +
        `Review indexes on ${pattern.model} table and consider query optimization.`
      );
    }

    // Frequent slow queries
    if (pattern.count > 10 && pattern.avgDuration > 150) {
      recommendations.push(
        `HIGH FREQUENCY: ${pattern.model}.${pattern.action} called ${pattern.count} times with avg ${pattern.avgDuration}ms. ` +
        `Consider caching or optimizing this query pattern.`
      );
    }

    // findMany without proper filtering
    if (pattern.action === 'findMany' && pattern.avgDuration > 200) {
      recommendations.push(
        `OPTIMIZATION: ${pattern.model}.findMany() averaging ${pattern.avgDuration}ms. ` +
        `Ensure proper WHERE clauses and implement pagination.`
      );
    }

    // Slow count operations
    if (pattern.action === 'count' && pattern.avgDuration > 150) {
      recommendations.push(
        `COUNT OPTIMIZATION: ${pattern.model}.count() averaging ${pattern.avgDuration}ms. ` +
        `Consider using approximate counts or caching for large tables.`
      );
    }
  });

  return recommendations;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Check database health and return status
 *
 * @returns Health status: 'healthy', 'warning', or 'critical'
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}> {
  const health = await getDatabaseHealth();
  const issues: string[] = [];
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  // Check connection pool utilization
  const connectionUtilization = health.connections.active / health.connections.total;
  if (connectionUtilization > 0.9) {
    status = 'critical';
    issues.push(`Connection pool at ${Math.round(connectionUtilization * 100)}% capacity. Consider increasing pool size.`);
  } else if (connectionUtilization > 0.7) {
    status = 'warning';
    issues.push(`Connection pool at ${Math.round(connectionUtilization * 100)}% capacity. Monitor closely.`);
  }

  // Check slow query percentage
  if (health.performance.slowQueryPercentage > 20) {
    status = 'critical';
    issues.push(`${health.performance.slowQueryPercentage}% of queries are slow (> 100ms). Review slow query log.`);
  } else if (health.performance.slowQueryPercentage > 10) {
    if (status !== 'critical') status = 'warning';
    issues.push(`${health.performance.slowQueryPercentage}% of queries are slow. Consider optimization.`);
  }

  // Check for very slow queries
  if (health.performance.maxDuration > 1000) {
    status = 'critical';
    issues.push(`Maximum query duration: ${health.performance.maxDuration}ms. Critical performance issue detected.`);
  } else if (health.performance.maxDuration > 500) {
    if (status !== 'critical') status = 'warning';
    issues.push(`Maximum query duration: ${health.performance.maxDuration}ms. Review slow queries.`);
  }

  // Check for large tables without proper indexing
  const largeTableThreshold = 1000000; // 1 million rows
  health.tables.forEach(table => {
    if (table.rowCount > largeTableThreshold) {
      const tableIndexes = health.indexes.filter(idx => idx.tableName === table.name);
      const unusedIndexes = tableIndexes.filter(idx => idx.scans === 0);

      if (tableIndexes.length === 0) {
        if (status !== 'critical') status = 'warning';
        issues.push(`Large table "${table.name}" (${formatNumber(table.rowCount)} rows) has no indexes.`);
      } else if (unusedIndexes.length > 0) {
        issues.push(`Table "${table.name}" has ${unusedIndexes.length} unused indexes that can be removed.`);
      }
    }
  });

  return { status, issues };
}

/**
 * Export all monitoring functions for admin dashboard
 */
export const monitor = {
  getDatabaseHealth,
  getSlowQueryAnalysis,
  checkDatabaseHealth,
  getConnectionStats,
  getTableStats,
  getIndexStats,
  formatBytes,
  formatNumber,
};

export default monitor;
