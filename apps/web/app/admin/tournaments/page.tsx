/**
 * Admin Tournaments Management Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Comprehensive tournament management interface for admins
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getTournaments(orgId: string) {
  return await prisma.tournament.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          players: true,
          matches: true,
        },
      },
    },
  });
}

export default async function AdminTournamentsPage() {
  const session = await auth();

  if (!session?.user?.orgId) {
    return <div>No organization selected</div>;
  }

  const tournaments = await getTournaments(session.user.orgId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tournament Management
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage all tournaments across your organization
          </p>
        </div>
        <Link
          href="/tournaments/new"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + New Tournament
        </Link>
      </div>

      {/* Tournaments List */}
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
        {tournaments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No tournaments yet</p>
            <Link
              href="/tournaments/new"
              className="inline-block text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Create your first tournament →
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                  Players
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                  Matches
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tournaments.map((tournament) => (
                <tr key={tournament.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {tournament.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`
                        inline-flex rounded-full px-2 text-xs font-semibold leading-5
                        ${
                          tournament.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : tournament.status === 'registration'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : tournament.status === 'completed'
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }
                      `}
                    >
                      {tournament.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {tournament.format.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {tournament._count.players}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {tournament._count.matches}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tournament.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/tournaments/${tournament.id}`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
