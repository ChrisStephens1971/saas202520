/**
 * TournamentOverview Component
 * Sprint 2 - TD Console Room View
 *
 * Displays real-time tournament statistics:
 * - Active, completed, pending matches
 * - Table availability
 * - Average match duration
 * - Estimated completion time
 */

'use client';

import { useMemo } from 'react';
import type { TournamentOverview } from '@/types/room-view';

interface TournamentOverviewProps {
  data: TournamentOverview;
  loading?: boolean;
  className?: string;
}

export function TournamentOverviewComponent({
  data,
  loading = false,
  className = '',
}: TournamentOverviewProps) {
  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (data.totalMatches === 0) return 0;
    return Math.round((data.completedMatches / data.totalMatches) * 100);
  }, [data.completedMatches, data.totalMatches]);

  // Calculate table utilization
  const tableUtilization = useMemo(() => {
    if (data.totalTables === 0) return 0;
    const inUse = data.totalTables - data.availableTables;
    return Math.round((inUse / data.totalTables) * 100);
  }, [data.availableTables, data.totalTables]);

  // Format ETA
  const formattedETA = useMemo(() => {
    if (!data.estimatedCompletionTime) return 'Calculating...';
    const now = new Date();
    const eta = new Date(data.estimatedCompletionTime);
    const diff = eta.getTime() - now.getTime();

    if (diff < 0) return 'Soon';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [data.estimatedCompletionTime]);

  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="backdrop-blur-lg bg-white/10 rounded-xl p-4 border border-white/20 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-white/20 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Matches */}
        <StatCard
          title="Active"
          value={data.activeMatches}
          subtitle="matches playing"
          icon="🎯"
          variant="success"
        />

        {/* Pending Matches */}
        <StatCard
          title="Pending"
          value={data.pendingMatches}
          subtitle="in queue"
          icon="⏳"
          variant="warning"
        />

        {/* Completed Matches */}
        <StatCard
          title="Completed"
          value={data.completedMatches}
          subtitle={`of ${data.totalMatches}`}
          icon="✅"
          variant="default"
        />

        {/* Available Tables */}
        <StatCard
          title="Tables"
          value={data.availableTables}
          subtitle={`of ${data.totalTables} free`}
          icon="🎱"
          variant={data.availableTables > 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tournament Progress */}
        <div className="backdrop-blur-lg bg-white/10 rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Tournament Progress</span>
            <span className="text-sm font-bold text-white">{progressPercentage}%</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {data.completedMatches} / {data.totalMatches} matches
            </span>
            {data.estimatedCompletionTime && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ETA: {formattedETA}
              </span>
            )}
          </div>
        </div>

        {/* Table Utilization */}
        <div className="backdrop-blur-lg bg-white/10 rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Table Utilization</span>
            <span className="text-sm font-bold text-white">{tableUtilization}%</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                tableUtilization > 75
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : tableUtilization > 50
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-red-500 to-rose-500'
              }`}
              style={{ width: `${tableUtilization}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {data.totalTables - data.availableTables} / {data.totalTables} in use
            </span>
            <span>Avg: {data.averageMatchDuration.toFixed(1)} min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * StatCard - Individual stat display
 */
interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ title, value, subtitle, icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'border-white/20 bg-white/10',
    success: 'border-green-500/30 bg-green-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    danger: 'border-red-500/30 bg-red-500/10',
  };

  return (
    <div className={`backdrop-blur-lg rounded-xl p-4 border ${variantStyles[variant]} hover:bg-white/20 transition-colors`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
