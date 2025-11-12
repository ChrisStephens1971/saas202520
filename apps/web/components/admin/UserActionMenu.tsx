/**
 * User Action Menu Component
 * Sprint 9 Phase 2 - Admin Dashboard
 * Dropdown menu with user moderation actions
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { UserWithActivity, UserStatus } from '@tournament/shared/types/user';
import { Eye, Edit, RefreshCw, AlertTriangle, Pause, Ban, Play, CheckCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type ConfirmDialogState = {
  open: boolean;
  action: 'warn' | 'suspend' | 'ban' | null;
  userId: string | null;
};

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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    action: null,
    userId: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleDestructiveAction = (action: 'warn' | 'suspend' | 'ban', userId: string) => {
    setConfirmDialog({
      open: true,
      action,
      userId,
    });
    setIsOpen(false);
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.action || !confirmDialog.userId) return;

    setIsProcessing(true);
    try {
      switch (confirmDialog.action) {
        case 'warn':
          onWarn(confirmDialog.userId);
          break;
        case 'suspend':
          onSuspend(confirmDialog.userId);
          break;
        case 'ban':
          onBan(confirmDialog.userId);
          break;
      }
    } finally {
      setIsProcessing(false);
      setConfirmDialog({ open: false, action: null, userId: null });
    }
  };

  const handleCloseDialog = () => {
    if (!isProcessing) {
      setConfirmDialog({ open: false, action: null, userId: null });
    }
  };

  const getDialogContent = () => {
    switch (confirmDialog.action) {
      case 'warn':
        return {
          title: 'Warn User',
          description: `Are you sure you want to issue a warning to ${user.email}? They will receive a notification about this warning.`,
          confirmText: 'Issue Warning',
          variant: 'warning' as const,
        };
      case 'suspend':
        return {
          title: 'Suspend User',
          description: `Are you sure you want to suspend ${user.email}? They will not be able to access their account until unsuspended.`,
          confirmText: 'Suspend User',
          variant: 'danger' as const,
        };
      case 'ban':
        return {
          title: 'Ban User',
          description: `Are you sure you want to permanently ban ${user.email}? This action is severe and should only be used for serious violations.`,
          confirmText: 'Ban User',
          variant: 'danger' as const,
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Are you sure you want to perform this action?',
          confirmText: 'Confirm',
          variant: 'info' as const,
        };
    }
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
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            {/* View Details */}
            <button
              onClick={() => handleAction(() => onViewDetails(user.id))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              aria-label="View user details"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span>View Details</span>
            </button>

            {/* Edit User */}
            <button
              onClick={() => handleAction(() => onEdit(user.id))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              aria-label="Edit user"
            >
              <Edit className="w-4 h-4" aria-hidden="true" />
              <span>Edit User</span>
            </button>

            {/* Change Role */}
            <button
              onClick={() => handleAction(() => onChangeRole(user.id))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              aria-label="Change user role"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Change Role</span>
            </button>

            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

            {/* Moderation Actions */}
            {isActive && (
              <>
                <button
                  onClick={() => handleDestructiveAction('warn', user.id)}
                  className="w-full text-left px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2"
                  aria-label="Warn user"
                >
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span>Warn User</span>
                </button>

                <button
                  onClick={() => handleDestructiveAction('suspend', user.id)}
                  className="w-full text-left px-4 py-2 text-sm text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                  aria-label="Suspend user"
                >
                  <Pause className="w-4 h-4" aria-hidden="true" />
                  <span>Suspend User</span>
                </button>

                <button
                  onClick={() => handleDestructiveAction('ban', user.id)}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  aria-label="Ban user"
                >
                  <Ban className="w-4 h-4" aria-hidden="true" />
                  <span>Ban User</span>
                </button>
              </>
            )}

            {isSuspended && (
              <button
                onClick={() => handleAction(() => onUnsuspend(user.id))}
                className="w-full text-left px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                aria-label="Unsuspend user"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                <span>Unsuspend User</span>
              </button>
            )}

            {isBanned && (
              <button
                onClick={() => handleAction(() => onUnban(user.id))}
                className="w-full text-left px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                aria-label="Unban user"
              >
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                <span>Unban User</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        {...getDialogContent()}
        open={confirmDialog.open}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmAction}
        isLoading={isProcessing}
      />
    </div>
  );
}
