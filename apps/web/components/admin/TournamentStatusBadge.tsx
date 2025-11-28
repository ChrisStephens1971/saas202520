/**
 * TournamentStatusBadge Component
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Reusable status badge with color coding for tournament states
 *
 * Performance: Memoized to prevent unnecessary re-renders in tables
 */

'use client';

import { memo } from 'react';
import type { TournamentStatus } from '@tournament/api-contracts';
import { FileEdit, ClipboardList, Target, Pause, Trophy, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TournamentStatusBadgeProps {
  status: TournamentStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  TournamentStatus,
  {
    label: string;
    colors: string;
    icon: LucideIcon;
    description: string;
  }
> = {
  draft: {
    label: 'Draft',
    colors:
      'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
    icon: FileEdit,
    description: 'Tournament is being set up',
  },
  registration: {
    label: 'Registration',
    colors:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-600',
    icon: ClipboardList,
    description: 'Open for player registration',
  },
  active: {
    label: 'Active',
    colors:
      'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-600',
    icon: Target,
    description: 'Tournament in progress',
  },
  paused: {
    label: 'Paused',
    colors:
      'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-600',
    icon: Pause,
    description: 'Temporarily stopped',
  },
  completed: {
    label: 'Completed',
    colors:
      'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-600',
    icon: Trophy,
    description: 'Tournament finished',
  },
  cancelled: {
    label: 'Cancelled',
    colors:
      'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-600',
    icon: XCircle,
    description: 'Tournament cancelled',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export const TournamentStatusBadge = memo(function TournamentStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: TournamentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-full border
        ${config.colors}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
      title={config.description}
    >
      {showIcon && <IconComponent className="w-4 h-4" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
});

/**
 * TournamentStatusDot - Minimal indicator
 */
interface TournamentStatusDotProps {
  status: TournamentStatus;
  withLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const DOT_SIZES = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function TournamentStatusDot({
  status,
  withLabel = false,
  size = 'md',
}: TournamentStatusDotProps) {
  const config = STATUS_CONFIG[status];
  const _dotColor = config.colors.split(' ')[1]; // Extract text color for dot

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`
          rounded-full ${DOT_SIZES[size]}
          ${config.colors.includes('gray') ? 'bg-gray-500' : ''}
          ${config.colors.includes('blue') ? 'bg-blue-500' : ''}
          ${config.colors.includes('green') ? 'bg-green-500' : ''}
          ${config.colors.includes('yellow') ? 'bg-yellow-500' : ''}
          ${config.colors.includes('purple') ? 'bg-purple-500' : ''}
          ${config.colors.includes('red') ? 'bg-red-500' : ''}
        `}
        title={config.description}
      />
      {withLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{config.label}</span>
      )}
    </div>
  );
}

/**
 * Status progress indicator
 */
interface StatusProgressProps {
  status: TournamentStatus;
}

const STATUS_ORDER: TournamentStatus[] = ['draft', 'registration', 'active', 'paused', 'completed'];

export function StatusProgress({ status }: StatusProgressProps) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 w-full" />
        </div>
        <span className="text-xs font-medium text-red-600 dark:text-red-400">Cancelled</span>
      </div>
    );
  }

  const progress = isCompleted ? 100 : ((currentIndex + 1) / STATUS_ORDER.length) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
