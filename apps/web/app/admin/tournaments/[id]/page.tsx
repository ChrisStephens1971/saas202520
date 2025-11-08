/**
 * Admin Tournament Details Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * View comprehensive tournament information with real-time updates
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { TournamentWithStats } from '@tournament/api-contracts';
import { TournamentStatusBadge, StatusProgress } from '@/components/admin/TournamentStatusBadge';
import { useSocketEvent, useTournamentRoom } from '@/hooks/useSocket';
import TournamentBracket from '@/components/TournamentBracket';

export default function AdminTournamentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<TournamentWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join tournament room for real-time updates
  useTournamentRoom(tournamentId, session?.user?.id);

  // Permission checks
  const canEdit = session?.user?.role === 'owner' || session?.user?.role === 'td';
  const canDelete = session?.user?.role === 'owner';

  // Fetch tournament details
  useEffect(() => {
    async function fetchTournament() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/tournaments/${tournamentId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to load tournament');
        }

        const data = await response.json();
        setTournament(data.tournament);
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tournament');
      } finally {
        setLoading(false);
      }
    }

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  // Real-time updates
  useSocketEvent('tournament:updated', (payload) => {
    if (payload.tournamentId === tournamentId) {
      setTournament((prev) =>
        prev ? { ...prev, ...payload.updates } : prev
      );
    }
  });

  // Handle delete
  async function handleDelete() {
    if (!tournament) return;

    if (
      !confirm(
        `Are you sure you want to delete "${tournament.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to delete tournament');
      }

      router.push('/admin/tournaments');
    } catch (err) {
      console.error('Error deleting tournament:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete tournament');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white text-lg">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-8 rounded-lg text-center">
            <p className="text-2xl font-semibold mb-2">Error Loading Tournament</p>
            <p className="mb-4">{error || 'Tournament not found'}</p>
            <button
              onClick={() => router.push('/admin/tournaments')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const FORMAT_LABELS: Record<string, string> = {
    single_elimination: 'Single Elimination',
    double_elimination: 'Double Elimination',
    round_robin: 'Round Robin',
    modified_single: 'Modified Single',
    chip_format: 'Chip Format',
  };

  const completionPercentage =
    tournament.matchCount > 0
      ? Math.round((tournament.completedMatchCount / tournament.matchCount) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <button
              onClick={() => router.push('/admin/tournaments')}
              className="text-gray-300 hover:text-white mb-4 inline-flex items-center gap-2"
            >
              ← Back to Tournaments
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
            <p className="text-gray-300">/{tournament.slug}</p>
          </div>
          <div className="flex gap-3">
            {canEdit && (
              <button
                onClick={() => router.push(`/admin/tournaments/${tournamentId}/edit`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Edit Tournament
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Status & Progress */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Status</h3>
              <TournamentStatusBadge status={tournament.status} size="lg" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{completionPercentage}%</div>
              <div className="text-sm text-gray-300">Complete</div>
            </div>
          </div>
          <StatusProgress status={tournament.status} />
        </div>

        {/* Main Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Tournament Details */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Tournament Details</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Format</div>
                <div className="text-lg text-white font-medium">
                  {FORMAT_LABELS[tournament.format]}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Game Type</div>
                <div className="text-lg text-white font-medium capitalize">
                  {tournament.gameType.replace('-', ' ')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Race To</div>
                <div className="text-lg text-white font-medium">
                  {tournament.raceToWins} games
                </div>
              </div>
              {tournament.maxPlayers && (
                <div>
                  <div className="text-sm text-gray-400">Max Players</div>
                  <div className="text-lg text-white font-medium">
                    {tournament.maxPlayers} players
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Players</span>
                <span className="text-2xl font-bold text-white">
                  {tournament.playerCount}
                  {tournament.maxPlayers && ` / ${tournament.maxPlayers}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Matches</span>
                <span className="text-2xl font-bold text-white">{tournament.matchCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Completed Matches</span>
                <span className="text-2xl font-bold text-green-400">
                  {tournament.completedMatchCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Remaining Matches</span>
                <span className="text-2xl font-bold text-yellow-400">
                  {tournament.matchCount - tournament.completedMatchCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-3">Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{tournament.description}</p>
          </div>
        )}

        {/* Tournament Bracket */}
        {(tournament.format === 'single_elimination' || tournament.format === 'double_elimination') && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Tournament Bracket</h3>
            <div className="bg-white rounded-lg p-4">
              <TournamentBracket tournamentId={tournamentId} />
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Timeline</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Created</div>
              <div className="text-white">
                {new Date(tournament.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-400">
                {new Date(tournament.createdAt).toLocaleTimeString()}
              </div>
            </div>
            {tournament.startedAt && (
              <div>
                <div className="text-sm text-gray-400">Started</div>
                <div className="text-white">
                  {new Date(tournament.startedAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(tournament.startedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
            {tournament.completedAt && (
              <div>
                <div className="text-sm text-gray-400">Completed</div>
                <div className="text-white">
                  {new Date(tournament.completedAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(tournament.completedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-400">Last Updated</div>
              <div className="text-white">
                {new Date(tournament.updatedAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-400">
                {new Date(tournament.updatedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
