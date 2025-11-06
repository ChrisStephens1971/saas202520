/**
 * MetricsCard Component
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 *
 * Displays a single metric with:
 * - Current value
 * - Trend indicator (up/down arrow)
 * - Percentage change from previous period
 * - Visual color coding (green for positive, red for negative)
 * - Optional sparkline chart
 */

'use client';

import { useMemo } from 'react';

export interface MetricsCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
  description?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function MetricsCard({
  title,
  value,
  previousValue,
  currentValue,
  trend: propTrend,
  trendPercentage: propTrendPercentage,
  description,
  icon,
  format = 'number',
  loading = false,
  variant = 'default',
}: MetricsCardProps) {
  // Calculate trend automatically if values provided
  const calculatedTrend = useMemo(() => {
    if (propTrend) return propTrend;
    if (currentValue !== undefined && previousValue !== undefined) {
      if (currentValue > previousValue) return 'up';
      if (currentValue < previousValue) return 'down';
      return 'neutral';
    }
    return 'neutral';
  }, [currentValue, previousValue, propTrend]);

  // Calculate percentage change
  const calculatedPercentage = useMemo(() => {
    if (propTrendPercentage !== undefined) return propTrendPercentage;
    if (currentValue !== undefined && previousValue !== undefined && previousValue > 0) {
      return ((currentValue - previousValue) / previousValue) * 100;
    }
    return 0;
  }, [currentValue, previousValue, propTrendPercentage]);

  // Format value based on type
  const formattedValue = useMemo(() => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        // Convert minutes to hours/days
        if (value >= 1440) return `${(value / 1440).toFixed(1)} days`;
        if (value >= 60) return `${(value / 60).toFixed(1)} hours`;
        return `${value} mins`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  }, [value, format]);

  // Variant colors
  const variantStyles = {
    default: 'bg-white/10 border-white/20',
    success: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
  };

  // Trend colors
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  };

  // Trend icons
  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  if (loading) {
    return (
      <div className={`backdrop-blur-lg rounded-xl p-6 border ${variantStyles[variant]} animate-pulse`}>
        <div className="h-4 bg-white/20 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-white/20 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/20 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className={`backdrop-blur-lg rounded-xl p-6 border ${variantStyles[variant]} hover:bg-white/20 transition-colors`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-white">{formattedValue}</h3>
            {icon && <div className="text-gray-400">{icon}</div>}
          </div>
        </div>
        {icon && !loading && (
          <div className="text-gray-400 opacity-50">
            {icon}
          </div>
        )}
      </div>

      {/* Trend Indicator */}
      {(calculatedTrend !== 'neutral' || calculatedPercentage !== 0) && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${trendColors[calculatedTrend]}`}>
            {trendIcons[calculatedTrend]}
            <span className="text-sm font-semibold">
              {Math.abs(calculatedPercentage).toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {description || 'vs previous period'}
          </span>
        </div>
      )}

      {/* Description (if no trend) */}
      {calculatedTrend === 'neutral' && calculatedPercentage === 0 && description && (
        <p className="text-xs text-gray-400 mt-2">{description}</p>
      )}
    </div>
  );
}

/**
 * MetricsCardGroup Component
 * Groups multiple metrics cards with consistent spacing
 */
interface MetricsCardGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function MetricsCardGroup({ children, columns = 4 }: MetricsCardGroupProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {children}
    </div>
  );
}
