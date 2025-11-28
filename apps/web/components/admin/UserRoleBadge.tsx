/**
 * User Role Badge Component
 * Sprint 9 Phase 2 - Admin Dashboard
 * Displays user role with appropriate styling
 *
 * Performance: Memoized to prevent unnecessary re-renders
 */

'use client';

import { memo } from 'react';
import { UserRole } from '@tournament/shared/types/user';
import { Crown, Target, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
}

const roleConfig: Record<
  UserRole,
  {
    label: string;
    bgColor: string;
    textColor: string;
    icon: LucideIcon;
  }
> = {
  [UserRole.ADMIN]: {
    label: 'Admin',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-800 dark:text-purple-300',
    icon: Crown,
  },
  [UserRole.ORGANIZER]: {
    label: 'Organizer',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300',
    icon: Target,
  },
  [UserRole.PLAYER]: {
    label: 'Player',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-800 dark:text-gray-200',
    icon: User,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const UserRoleBadge = memo(function UserRoleBadge({ role, size = 'md' }: Props) {
  const config = roleConfig[role];
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
      role="img"
      aria-label={`${config.label} role`}
    >
      <IconComponent className="w-3 h-3" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
});

export default UserRoleBadge;
