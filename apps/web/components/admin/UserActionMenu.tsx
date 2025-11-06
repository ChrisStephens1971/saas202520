/**
 * User Action Menu Component
 * Sprint 9 Phase 2 - Admin Dashboard
 * Dropdown menu with user moderation actions
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { UserWithActivity, UserStatus } from '@tournament/shared/types/user';

interface Props {
  user: UserWithActivity;
  onEdit: (userId: string) => void;
  onChangeRole: (userId: string) => void;
  onWarn: (userId: string) => void;
  onSuspend: (userId: string) => void;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
  onUnsuspend: (userId: string) => void;
  onViewDetails: (userId: string) => void;
}

export default function UserActionMenu({
  user,
  onEdit,
  onChangeRole,
  onWarn,
  onSuspend,
  onBan,
  onUnban,
  onUnsuspend,
  onViewDetails,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const isBanned = user.status === UserStatus.BANNED;
  const isSuspended = user.status === UserStatus.SUSPENDED;
  const isActive = user.status === UserStatus.ACTIVE;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="User actions"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {/* View Details */}
            <button
              onClick={() => handleAction(() => onViewDetails(user.id))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <span>👁</span>
              <span>View Details</span>
            </button>

            {/* Edit User */}
            <button
              onClick={() => handleAction(() => onEdit(user.id))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <span>✏️</span>
              <span>Edit User</span>
            </button>

            {/* Change Role */}
            <button
              onClick={() => handleAction(() => onChangeRole(user.id))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Change Role</span>
            </button>

            <div className="border-t border-gray-200 my-1" />

            {/* Moderation Actions */}
            {isActive && (
              <>
                <button
                  onClick={() => handleAction(() => onWarn(user.id))}
                  className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 flex items-center gap-2"
                >
                  <span>⚠️</span>
                  <span>Warn User</span>
                </button>

                <button
                  onClick={() => handleAction(() => onSuspend(user.id))}
                  className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                >
                  <span>⏸️</span>
                  <span>Suspend User</span>
                </button>

                <button
                  onClick={() => handleAction(() => onBan(user.id))}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <span>🚫</span>
                  <span>Ban User</span>
                </button>
              </>
            )}

            {isSuspended && (
              <button
                onClick={() => handleAction(() => onUnsuspend(user.id))}
                className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
              >
                <span>▶️</span>
                <span>Unsuspend User</span>
              </button>
            )}

            {isBanned && (
              <button
                onClick={() => handleAction(() => onUnban(user.id))}
                className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
              >
                <span>✅</span>
                <span>Unban User</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
