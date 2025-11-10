/**
 * TableStatusGrid Component
 * Sprint 2 - TD Console Room View
 *
 * Displays grid of all tables with their current status:
 * - Available (green)
 * - In Use (blue) with match info
 * - Blocked/Maintenance (red)
 * - Shows ETA for tables in use
 */

'use client';

import { useMemo } from 'react';
import type { TableWithMatch } from '@/types/room-view';
import { TableStatus } from '@tournament/shared';

interface TableStatusGridProps {
  tables: TableWithMatch[];
  onTableClick?: (table: TableWithMatch) => void;
  loading?: boolean;
  className?: string;
}

export function TableStatusGrid({
  tables,
  onTableClick,
  loading = false,
  className = '',
}: TableStatusGridProps) {
  // Sort tables by label
  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [tables]);

  if (loading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 ${className}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-white/10 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Tables</h3>
        <div className="flex items-center gap-4 text-xs">
          <LegendItem color="bg-green-500" label="Available" />
          <LegendItem color="bg-blue-500" label="In Use" />
          <LegendItem color="bg-red-500" label="Blocked" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sortedTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onClick={() => onTableClick?.(table)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual Table Card
 */
interface TableCardProps {
  table: TableWithMatch;
  onClick?: () => void;
}

function TableCard({ table, onClick }: TableCardProps) {
  const statusConfig = useMemo(() => {
    switch (table.status) {
      case TableStatus.AVAILABLE:
        return {
          bg: 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30',
          indicator: 'bg-green-500',
          text: 'text-green-300',
          label: 'Available',
        };
      case TableStatus.IN_USE:
        return {
          bg: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30',
          indicator: 'bg-blue-500',
          text: 'text-blue-300',
          label: 'In Use',
        };
      case TableStatus.BLOCKED:
        return {
          bg: 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30',
          indicator: 'bg-red-500',
          text: 'text-red-300',
          label: 'Blocked',
        };
      default:
        return {
          bg: 'bg-gray-500/20 border-gray-500/50 hover:bg-gray-500/30',
          indicator: 'bg-gray-500',
          text: 'text-gray-300',
          label: 'Unknown',
        };
    }
  }, [table.status]);

  // Format ETA
  const eta = useMemo(() => {
    if (!table.estimatedAvailableAt) return null;
    const now = new Date();
    const etaTime = new Date(table.estimatedAvailableAt);
    const diff = etaTime.getTime() - now.getTime();

    if (diff < 0) return 'Soon';

    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, [table.estimatedAvailableAt]);

  // Format time since last activity
  const lastActivity = useMemo(() => {
    if (!table.lastActivity) return null;
    const now = new Date();
    const last = new Date(table.lastActivity);
    const diff = now.getTime() - last.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [table.lastActivity]);

  return (
    <button
      onClick={onClick}
      className={`
        aspect-square rounded-lg border-2 p-3
        backdrop-blur-sm transition-all duration-200
        flex flex-col items-center justify-center gap-2
        ${statusConfig.bg}
        ${onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}
      `}
      disabled={!onClick}
    >
      {/* Status Indicator */}
      <div className={`w-3 h-3 rounded-full ${statusConfig.indicator} animate-pulse`} />

      {/* Table Label */}
      <div className="text-center">
        <div className="font-bold text-white text-lg leading-tight">
          {table.label}
        </div>
        <div className={`text-xs ${statusConfig.text} leading-tight mt-0.5`}>
          {statusConfig.label}
        </div>
      </div>

      {/* Match Info (if in use) */}
      {table.status === TableStatus.IN_USE && table.currentMatch && (
        <div className="text-xs text-center text-gray-300 leading-tight">
          <div className="font-medium">Match #{table.currentMatch.position}</div>
          {eta && (
            <div className="text-gray-400 flex items-center justify-center gap-1 mt-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {eta}
            </div>
          )}
        </div>
      )}

      {/* Blocked Until Info */}
      {table.status === TableStatus.BLOCKED && table.blockedUntil && (
        <div className="text-xs text-center text-gray-300 leading-tight">
          <div className="text-gray-400">Until:</div>
          <div className="font-medium">
            {new Date(table.blockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}

      {/* Last Activity (if available and not in use) */}
      {table.status === TableStatus.AVAILABLE && lastActivity && (
        <div className="text-xs text-gray-400 leading-tight">
          {lastActivity}
        </div>
      )}
    </button>
  );
}

/**
 * Legend Item
 */
interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-gray-300">{label}</span>
    </div>
  );
}
