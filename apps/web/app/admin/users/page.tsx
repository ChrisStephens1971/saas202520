/**
 * User Management Page
 * Sprint 9 Phase 2 - Admin Dashboard
 * Lists all users with advanced search, filter, and bulk operations
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import UserTable from '@/components/admin/UserTable';
import {
  UserWithActivity,
  UserRole,
  ModerationRequest,
} from '@tournament/shared/types/user';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UsersPage() {
  const router = useRouter();
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [moderationAction, setModerationAction] = useState<
    'warn' | 'suspend' | 'ban' | null
  >(null);
  const [moderationReason, setModerationReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users
  const { data, error, isLoading, mutate } = useSWR<{
    users: UserWithActivity[];
    total: number;
  }>('/api/admin/users', fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: true,
  });

  const users = data?.users || [];

  const handleUserClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const handleEdit = (userId: string) => {
    router.push(`/admin/users/${userId}/edit`);
  };

  const handleChangeRole = async (userId: string) => {
    // TODO: Implement role change modal
    console.log('Change role for user:', userId);
  };

  const openModerationModal = (
    userId: string,
    action: 'warn' | 'suspend' | 'ban'
  ) => {
    setSelectedUserId(userId);
    setModerationAction(action);
    setModerationReason('');
    setShowModerationModal(true);
  };

  const handleWarn = (userId: string) => {
    openModerationModal(userId, 'warn');
  };

  const handleSuspend = (userId: string) => {
    openModerationModal(userId, 'suspend');
  };

  const handleBan = (userId: string) => {
    openModerationModal(userId, 'ban');
  };

  const handleUnban = async (userId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unban',
          reason: 'Manual unban by admin',
        } as ModerationRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to unban user');
      }

      mutate();
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Failed to unban user. Please try again.');
    }
  };

  const handleUnsuspend = async (userId: string) => {
    if (!confirm('Are you sure you want to unsuspend this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsuspend',
          reason: 'Manual unsuspension by admin',
        } as ModerationRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to unsuspend user');
      }

      mutate();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      alert('Failed to unsuspend user. Please try again.');
    }
  };

  const handleModerationSubmit = async () => {
    if (!selectedUserId || !moderationAction) return;
    if (!moderationReason.trim()) {
      alert('Please provide a reason for this action');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: ModerationRequest = {
        action: moderationAction,
        reason: moderationReason,
        notifyUser: true,
      };

      if (moderationAction === 'suspend') {
        payload.duration = suspensionDays;
      }

      const response = await fetch(
        `/api/admin/users/${selectedUserId}/moderate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to perform moderation action');
      }

      mutate();
      setShowModerationModal(false);
      setSelectedUserId(null);
      setModerationAction(null);
    } catch (error) {
      console.error('Error performing moderation action:', error);
      alert('Failed to perform action. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">
            <p className="text-lg font-semibold">Error loading users</p>
            <p className="text-sm mt-2">{error.message}</p>
            <button
              onClick={() => mutate()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">
                Manage users, roles, and permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Total Users: <span className="font-semibold">{data?.total || 0}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow">
          <UserTable
            users={users}
            isLoading={isLoading}
            onUserClick={handleUserClick}
            onEdit={handleEdit}
            onChangeRole={handleChangeRole}
            onWarn={handleWarn}
            onSuspend={handleSuspend}
            onBan={handleBan}
            onUnban={handleUnban}
            onUnsuspend={handleUnsuspend}
          />
        </div>
      </div>

      {/* Moderation Modal */}
      {showModerationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {moderationAction === 'warn' && 'Warn User'}
                {moderationAction === 'suspend' && 'Suspend User'}
                {moderationAction === 'ban' && 'Ban User'}
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              {moderationAction === 'suspend' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suspension Duration (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={suspensionDays}
                    onChange={(e) => setSuspensionDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Provide a clear reason for this action..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action will be logged and the user will
                  be notified.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModerationModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleModerationSubmit}
                disabled={isSubmitting || !moderationReason.trim()}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  moderationAction === 'warn'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : moderationAction === 'suspend'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
