/**
 * User Role Badge Component
 * Sprint 9 Phase 2 - Admin Dashboard
 * Displays user role with appropriate styling
 */

'use client';

import { UserRole } from '@tournament/shared/types/user';

interface Props {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
}

const roleConfig = {
  [UserRole.ADMIN]: {
    label: 'Admin',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: '👑',
  },
  [UserRole.ORGANIZER]: {
    label: 'Organizer',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '🎯',
  },
  [UserRole.PLAYER]: {
    label: 'Player',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: '🎱',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function UserRoleBadge({ role, size = 'md' }: Props) {
  const config = roleConfig[role];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
