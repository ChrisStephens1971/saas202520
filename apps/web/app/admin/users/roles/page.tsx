/**
 * Role Management Page
 * Sprint 9 Phase 2 - Admin Dashboard
 * View and manage user roles and permissions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
} from '@tournament/shared/types/user';

export default function RolesPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.PLAYER);

  const roles = Object.values(UserRole);

  const roleDescriptions = {
    [UserRole.ADMIN]: {
      title: 'Administrator',
      description:
        'Full system access with all permissions. Can manage users, organizations, and system settings.',
      icon: '👑',
      color: 'purple',
    },
    [UserRole.ORGANIZER]: {
      title: 'Organizer',
      description:
        'Can create and manage tournaments, invite players, and manage organization settings.',
      icon: '🎯',
      color: 'blue',
    },
    [UserRole.PLAYER]: {
      title: 'Player',
      description:
        'Basic user role with access to register for tournaments and manage own profile.',
      icon: '🎱',
      color: 'gray',
    },
  };

  const permissionGroups = {
    'User Management': [
      Permission.USERS_VIEW,
      Permission.USERS_EDIT,
      Permission.USERS_DELETE,
      Permission.USERS_BAN,
      Permission.USERS_SUSPEND,
      Permission.ROLES_MANAGE,
    ],
    'Tournament Management': [
      Permission.TOURNAMENTS_VIEW_ALL,
      Permission.TOURNAMENTS_VIEW_OWN,
      Permission.TOURNAMENTS_CREATE,
      Permission.TOURNAMENTS_EDIT_ALL,
      Permission.TOURNAMENTS_EDIT_OWN,
      Permission.TOURNAMENTS_DELETE_ALL,
      Permission.TOURNAMENTS_DELETE_OWN,
    ],
    'Organization Management': [
      Permission.ORGANIZATIONS_VIEW,
      Permission.ORGANIZATIONS_EDIT,
      Permission.ORGANIZATIONS_MANAGE_MEMBERS,
    ],
    'Profile Management': [
      Permission.PROFILE_VIEW_OWN,
      Permission.PROFILE_EDIT_OWN,
      Permission.TOURNAMENTS_REGISTER,
    ],
  };

  const getPermissionName = (permission: Permission): string => {
    return permission
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

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

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600 mt-1">
              View and understand user roles and their permissions
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">User Roles</h2>
                <p className="text-sm text-gray-600 mt-1">Select a role to view permissions</p>
              </div>
              <div className="p-2">
                {roles.map((role) => {
                  const config = roleDescriptions[role];
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`w-full text-left p-4 rounded-lg transition-colors mb-2 ${
                        selectedRole === role
                          ? `bg-${config.color}-50 border-2 border-${config.color}-500`
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-900">{config.title}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {ROLE_PERMISSIONS[role].includes(Permission.ADMIN_FULL_ACCESS)
                              ? 'All permissions'
                              : `${ROLE_PERMISSIONS[role].length} permissions`}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Info Card */}
            <div className="bg-white rounded-lg shadow mt-6 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                About {roleDescriptions[selectedRole].title}
              </h3>
              <p className="text-sm text-gray-600">{roleDescriptions[selectedRole].description}</p>
            </div>
          </div>

          {/* Permissions Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{roleDescriptions[selectedRole].icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {roleDescriptions[selectedRole].title} Permissions
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {ROLE_PERMISSIONS[selectedRole].includes(Permission.ADMIN_FULL_ACCESS)
                        ? 'This role has full system access'
                        : 'Detailed permissions for this role'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {ROLE_PERMISSIONS[selectedRole].includes(Permission.ADMIN_FULL_ACCESS) ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔓</div>
                    <p className="text-lg font-semibold text-gray-900">Full Access</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Administrators have unrestricted access to all system features and functions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(permissionGroups).map(([groupName, permissions]) => {
                      const hasAnyPermission = permissions.some((permission) =>
                        hasPermission(selectedRole, permission)
                      );

                      if (!hasAnyPermission) return null;

                      return (
                        <div key={groupName}>
                          <h3 className="font-semibold text-gray-900 mb-3">{groupName}</h3>
                          <div className="space-y-2">
                            {permissions.map((permission) => {
                              const hasAccess = hasPermission(selectedRole, permission);

                              if (!hasAccess) return null;

                              return (
                                <div
                                  key={permission}
                                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                                >
                                  <svg
                                    className="w-5 h-5 text-green-600 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {getPermissionName(permission)}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">{permission}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Permissions Matrix</h2>
                <p className="text-sm text-gray-600 mt-1">Quick comparison of all roles</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Permission Category
                      </th>
                      {roles.map((role) => (
                        <th
                          key={role}
                          className="px-6 py-3 text-center text-sm font-semibold text-gray-900"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>{roleDescriptions[role].icon}</span>
                            <span>{roleDescriptions[role].title}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(permissionGroups).map(([groupName, permissions]) => (
                      <tr key={groupName} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{groupName}</td>
                        {roles.map((role) => {
                          const hasAnyInGroup = permissions.some((permission) =>
                            hasPermission(role, permission)
                          );

                          return (
                            <td key={role} className="px-6 py-4 text-center">
                              {hasAnyInGroup ? (
                                <svg
                                  className="w-5 h-5 text-green-600 mx-auto"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-5 h-5 text-gray-300 mx-auto"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
