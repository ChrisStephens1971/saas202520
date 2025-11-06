/**
 * Admin Users Management Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * User management interface for admins
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getOrganizationMembers(orgId: string) {
  return await prisma.organizationMember.findMany({
    where: { orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user?.orgId) {
    return <div>No organization selected</div>;
  }

  const members = await getOrganizationMembers(session.user.orgId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage organization members and their roles
          </p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors">
          + Invite User
        </button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {members.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Owners</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {members.filter((m) => m.role === 'owner').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tournament Directors</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {members.filter((m) => m.role === 'td').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Scorekeepers</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {members.filter((m) => m.role === 'scorekeeper').length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                        {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {member.user.name || 'No name'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {member.user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`
                      inline-flex rounded-full px-2 text-xs font-semibold leading-5
                      ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                          : member.role === 'td'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : member.role === 'scorekeeper'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
