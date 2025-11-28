// Tournament Detail Page - Works for all tournament formats
// Shows tournament information, players, matches, and standings

import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import { prisma } from '@tournament/shared';
import TournamentActions from '@/components/tournaments/TournamentActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: {
        orderBy: [
          { status: 'desc' }, // checked-in first
          { seed: 'asc' },
        ],
      },
      matches: {
        orderBy: { id: 'desc' },
        take: 10,
        include: {
          playerA: true,
          playerB: true,
        },
      },
      tables: {
        orderBy: { label: 'asc' },
      },
      organization: true,
    },
  });

  if (!tournament) {
    return null;
  }

  return tournament;
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;
  const tournament = await getTournament(id);

  if (!tournament) {
    notFound();
  }

  // Check if user has access to this tournament's organization
  if (tournament.orgId !== session.user.orgId) {
    redirect('/unauthorized');
  }

  // If it's a chip format tournament, redirect to the specialized page
  if (tournament.format === 'chip_format') {
    redirect(`/tournaments/${id}/chip-format`);
  }

  // Calculate statistics
  const totalPlayers = tournament.players.length;
  const checkedInPlayers = tournament.players.filter((p) => p.status === 'checked-in').length;
  const activePlayers = tournament.players.filter(
    (p) => !['withdrawn', 'no_show'].includes(p.status)
  ).length;
  const completedMatches = tournament.matches.filter((m) => m.state === 'completed').length;
  const activeMatches = tournament.matches.filter((m) => m.state === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link href="/console" className="text-gray-500 hover:text-gray-700">
                  ← Back to Console
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{tournament.name}</h1>
              <p className="text-sm text-gray-600">
                {tournament.organization.name} • {tournament.format.replace(/-/g, ' ')}
              </p>
            </div>
            <div className="flex gap-2">
              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                  tournament.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : tournament.status === 'registration'
                      ? 'bg-blue-100 text-blue-800'
                      : tournament.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : tournament.status === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                }`}
              >
                {tournament.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Total Players</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{totalPlayers}</div>
            <div className="mt-1 text-xs text-gray-600">{checkedInPlayers} checked in</div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Active Players</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{activePlayers}</div>
            <div className="mt-1 text-xs text-gray-600">Currently playing</div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Matches</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {tournament.matches.length}
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {completedMatches} completed, {activeMatches} active
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Tables</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {tournament.tables.length}
            </div>
            <div className="mt-1 text-xs text-gray-600">Available tables</div>
          </div>
        </div>

        {/* Tournament Info */}
        {tournament.description && (
          <div className="rounded-lg bg-white shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-2">About</h2>
            <p className="text-gray-600">{tournament.description}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Players List */}
          <div className="rounded-lg bg-white shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Players ({totalPlayers})</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {tournament.players.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">No players registered yet</div>
              ) : (
                tournament.players.map((player) => (
                  <div key={player.id} className="px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{player.name}</div>
                        {player.email && (
                          <div className="text-xs text-gray-500">{player.email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {player.seed && (
                          <span className="text-xs text-gray-500">Seed #{player.seed}</span>
                        )}
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            player.status === 'checked-in'
                              ? 'bg-green-100 text-green-800'
                              : player.status === 'registered'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {player.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="rounded-lg bg-white shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Matches</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {tournament.matches.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">No matches yet</div>
              ) : (
                tournament.matches.map((match) => (
                  <div key={match.id} className="px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          {match.playerA?.name || 'TBD'} vs {match.playerB?.name || 'TBD'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {match.tableId && `Table assigned`}
                          {match.round && ` • Round ${match.round}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.state === 'completed' && match.winnerId && (
                          <span className="text-xs font-medium text-green-600">
                            Winner:{' '}
                            {match.winnerId === match.playerAId
                              ? match.playerA?.name
                              : match.playerB?.name}
                          </span>
                        )}
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            match.state === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : match.state === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {match.state}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tables */}
        {tournament.tables.length > 0 && (
          <div className="rounded-lg bg-white shadow mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Tables ({tournament.tables.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
              {tournament.tables.map((table) => (
                <div
                  key={table.id}
                  className={`rounded-lg border-2 p-4 text-center ${
                    table.status === 'available'
                      ? 'border-green-200 bg-green-50'
                      : table.status === 'in_use'
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{table.label}</div>
                  <div className="text-xs text-gray-600 mt-1 capitalize">
                    {table.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <TournamentActions
          tournamentId={tournament.id}
          status={tournament.status}
          totalPlayers={totalPlayers}
        />
      </main>
    </div>
  );
}
