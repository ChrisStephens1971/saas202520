/**
 * AchievementBadge Component
 * Sprint 10 Week 2 - Day 3: UI Components
 *
 * Displays a single achievement badge with tier coloring and details.
 */

'use client';

import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerAchievement } from '@/lib/player-profiles/types';

interface AchievementBadgeProps {
  achievement: PlayerAchievement;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

const tierColors = {
  BRONZE: 'bg-amber-700 text-white border-amber-800',
  SILVER: 'bg-gray-400 text-gray-900 border-gray-500',
  GOLD: 'bg-yellow-500 text-gray-900 border-yellow-600',
  PLATINUM: 'bg-purple-600 text-white border-purple-700',
};

const tierGradients = {
  BRONZE: 'from-amber-700 to-amber-900',
  SILVER: 'from-gray-400 to-gray-600',
  GOLD: 'from-yellow-400 to-yellow-600',
  PLATINUM: 'from-purple-600 to-purple-800',
};

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export function AchievementBadge({
  achievement,
  size = 'md',
  showDetails = true,
  className,
}: AchievementBadgeProps) {
  const tier = achievement.achievement.tier;
  const tierColor = tierColors[tier as keyof typeof tierColors];
  const tierGradient = tierGradients[tier as keyof typeof tierGradients];
  const sizeClass = sizeClasses[size];

  const unlockedDate = new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn('group relative', className)}>
      {/* Badge Circle */}
      <div
        className={cn(
          'rounded-full border-4 flex items-center justify-center',
          'transition-transform duration-200 group-hover:scale-110',
          'shadow-lg cursor-pointer',
          sizeClass,
          tierColor
        )}
      >
        {achievement.achievement.iconUrl ? (
          <img
            src={achievement.achievement.iconUrl}
            alt={achievement.achievement.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <Trophy
            className={cn(
              'text-current',
              size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-10 w-10' : 'h-14 w-14'
            )}
          />
        )}
      </div>

      {/* Progress Ring (for progressive achievements) */}
      {achievement.progress < 100 && (
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            opacity="0.2"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${achievement.progress * 2.827} 282.7`}
            className="text-blue-500"
          />
        </svg>
      )}

      {/* Tier Badge */}
      <div
        className={cn(
          'absolute -bottom-2 left-1/2 -translate-x-1/2',
          'px-2 py-0.5 rounded-full text-xs font-bold border-2',
          'shadow-md',
          tierColor
        )}
      >
        {tier}
      </div>

      {/* Hover Details Tooltip */}
      {showDetails && (
        <div
          className={cn(
            'absolute z-50 w-64 p-4 bg-popover text-popover-foreground',
            'border rounded-lg shadow-xl',
            'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
            'transition-all duration-200',
            'bottom-full left-1/2 -translate-x-1/2 mb-2',
            'pointer-events-none'
          )}
        >
          <div
            className={cn(
              'absolute -bottom-2 left-1/2 -translate-x-1/2',
              'w-4 h-4 bg-popover border-r border-b',
              'rotate-45'
            )}
          />

          <div className="relative">
            <h3 className="font-bold text-lg mb-1">{achievement.achievement.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {achievement.achievement.description}
            </p>

            <div className="flex items-center justify-between text-xs">
              <div
                className={cn(
                  'px-2 py-1 rounded font-semibold',
                  `bg-gradient-to-r ${tierGradient}`,
                  'text-white'
                )}
              >
                {tier} • {achievement.achievement.points} pts
              </div>
              <div className="text-muted-foreground">
                {achievement.progress < 100
                  ? `${achievement.progress}% complete`
                  : `Unlocked ${unlockedDate}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
