/**
 * User Status Badge Component
 * Sprint 9 Phase 2 - Admin Dashboard
 * Displays user status with appropriate styling
 */

'use client';

import { UserStatus } from '@tournament/shared/types/user';

interface Props {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  [UserStatus.ACTIVE]: {
    label: 'Active',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: '✓',
  },
  [UserStatus.PENDING]: {
    label: 'Pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: '⏳',
  },
  [UserStatus.SUSPENDED]: {
    label: 'Suspended',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: '⚠',
  },
  [UserStatus.BANNED]: {
    label: 'Banned',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '🚫',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function UserStatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
