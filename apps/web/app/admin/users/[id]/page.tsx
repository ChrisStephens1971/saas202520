/**
 * User Detail Page
 * Sprint 9 Phase 2 - Admin Dashboard
 * Displays comprehensive user information, activity history, and moderation controls
 */

'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { UserDetailResponse, UserRole, UserStatus } from '@tournament/shared/types/user';
import UserRoleBadge from '@/components/admin/UserRoleBadge';
import UserStatusBadge from '@/components/admin/UserStatusBadge';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'activity' | 'tournaments' | 'moderation'
  >('overview');

  // Fetch user details
  const {
    data,
    error,
    isLoading,
    mutate: _mutate,
  } = useSWR<UserDetailResponse>(`/api/admin/users/${resolvedParams.id}`, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">
            <p className="text-lg font-semibold">Error loading user details</p>
            <p className="text-sm mt-2">{error?.message || 'User not found'}</p>
            <button
              onClick={() => router.push('/admin/users')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { user, organizations, recentActivity, moderationHistory, tournaments } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => router.push('/admin/users')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Users
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-600">
                    {(user.name || user.email)?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{user.name || 'Unnamed User'}</h1>
                <p className="text-gray-600 mt-1">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <UserRoleBadge role={user.role as UserRole} />
                  <UserStatusBadge status={user.status as UserStatus} />
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/admin/users/${user.id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit User
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'tournaments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Tournaments ({tournaments.length})
            </button>
            <button
              onClick={() => setActiveTab('moderation')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'moderation'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Moderation ({moderationHistory.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600">Tournaments</div>
                <div className="text-3xl font-bold text-blue-600 mt-2">{user.totalTournaments}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600">Matches</div>
                <div className="text-3xl font-bold text-green-600 mt-2">{user.totalMatches}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600">Win Rate</div>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  {user.totalMatches > 0
                    ? Math.round((user.totalWins / user.totalMatches) * 100)
                    : 0}
                  %
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600">Organizations</div>
                <div className="text-3xl font-bold text-orange-600 mt-2">
                  {user.organizationCount}
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Email</dt>
                  <dd className="text-sm text-gray-900 mt-1">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Joined</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Last Login</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), {
                          addSuffix: true,
                        })
                      : 'Never'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Last Activity</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {user.lastActivityAt
                      ? formatDistanceToNow(new Date(user.lastActivityAt), {
                          addSuffix: true,
                        })
                      : 'No activity'}
                  </dd>
                </div>
                {user.status === UserStatus.BANNED && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Banned At</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {user.bannedAt
                          ? formatDistanceToNow(new Date(user.bannedAt), {
                              addSuffix: true,
                            })
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Ban Reason</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {user.banReason || 'No reason provided'}
                      </dd>
                    </div>
                  </>
                )}
                {user.status === UserStatus.SUSPENDED && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Suspended Until</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {user.suspendedUntil
                          ? formatDistanceToNow(new Date(user.suspendedUntil), {
                              addSuffix: true,
                            })
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Suspension Reason</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {user.suspensionReason || 'No reason provided'}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {/* Organizations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizations</h2>
              <div className="space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium text-gray-900">{org.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Role: <span className="font-medium">{org.role}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Joined{' '}
                      {formatDistanceToNow(new Date(org.joinedAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                ))}
                {organizations.length === 0 && (
                  <p className="text-sm text-gray-500">No organizations</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.resource}
                        {activity.resourceId && ` (ID: ${activity.resourceId})`}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {activity.ipAddress && (
                      <span className="text-xs text-gray-500">{activity.ipAddress}</span>
                    )}
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Tournament History</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tournament.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Status: <span className="font-medium">{tournament.status}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Created{' '}
                        {formatDistanceToNow(new Date(tournament.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {tournament.completedAt && (
                      <span className="text-xs text-green-600 font-medium">Completed</span>
                    )}
                  </div>
                </div>
              ))}
              {tournaments.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <p>No tournaments</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Moderation History</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {moderationHistory.map((action) => (
                <div key={action.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {action.actionType.toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{action.reason}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        By {action.performedBy} •{' '}
                        {formatDistanceToNow(new Date(action.performedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {action.expiresAt && (
                      <span className="text-xs text-orange-600">
                        Expires{' '}
                        {formatDistanceToNow(new Date(action.expiresAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {moderationHistory.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <p>No moderation history</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
