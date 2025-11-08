// Dashboard Page - Protected route showing user info

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch real dashboard stats
  const orgId = session.user.orgId;

  // Count active tournaments (registration, active, paused)
  const activeTournamentsCount = await prisma.tournament.count({
    where: {
      orgId,
      status: {
        in: ['registration', 'active', 'paused'],
      },
    },
  });

  // Count total players across all tournaments
  const totalPlayersCount = await prisma.player.count({
    where: {
      tournament: {
        orgId,
      },
    },
  });

  // Count completed matches across all tournaments
  const completedMatchesCount = await prisma.match.count({
    where: {
      tournament: {
        orgId,
      },
      state: 'completed',
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {session.user.name || session.user.email}!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Organization: {session.user.orgSlug} ({session.user.role})
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick stats */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Tournaments</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{activeTournamentsCount}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Players</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{totalPlayersCount}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed Matches</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{completedMatchesCount}</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Session Info</h2>
          <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="mt-4">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
