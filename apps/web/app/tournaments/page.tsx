'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type {
  TournamentWithStats,
  TournamentStatus,
  TournamentFormat,
} from '@tournament/api-contracts';

/**
 * Tournament List Page
 *
 * Displays all tournaments for the current organization with:
 * - Status filtering (Draft, Registration, Active, Completed, Cancelled)
 * - Status badges with color coding
 * - Quick actions (Edit, Delete) based on user role
 * - Empty state for new organizations
 * - Loading skeleton cards
 * - Responsive grid layout
 *
 * Role-based permissions:
 * - owner/td: Can edit and delete tournaments
 * - scorekeeper: View only
 * - streamer: View only
 */
export default function TournamentsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState<TournamentWithStats[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<TournamentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');

  // Fetch tournaments on mount
  useEffect(() => {
    async function fetchTournaments() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/tournaments');

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Failed to load tournaments: ${response.statusText}`);
        }

        const data = await response.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    }

    fetchTournaments();
  }, []);

  // Apply status filter
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTournaments(tournaments);
    } else {
      setFilteredTournaments(tournaments.filter(t => t.status === statusFilter));
    }
  }, [tournaments, statusFilter]);

  // Check if user has edit/delete permissions (owner or td)
  const canEdit = session?.user?.role === 'owner' || session?.user?.role === 'td';
  const canDelete = session?.user?.role === 'owner';

  // Handle delete tournament
  async function handleDelete(tournamentId: string, tournamentName: string) {
    if (!confirm(`Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`)) {
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

      // Remove from local state
      setTournaments(prev => prev.filter(t => t.id !== tournamentId));
    } catch (err) {
      console.error('Error deleting tournament:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete tournament');
    }
  }

  // Status badge colors
  const statusColors: Record<TournamentStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    registration: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  // Format badge display
  const formatBadges: Record<TournamentFormat, string> = {
    single_elimination: 'Single Elim',
    double_elimination: 'Double Elim',
    round_robin: 'Round Robin',
    modified_single: 'Modified Single',
    chip_format: 'Chip Format',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Tournaments</h1>
            <p className="text-gray-300">
              Your Organization
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => router.push('/tournaments/new')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              + Create Tournament
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All ({tournaments.length})
          </button>
          {(['draft', 'registration', 'active', 'paused', 'completed', 'cancelled'] as TournamentStatus[]).map(status => {
            const count = tournaments.filter(t => t.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 animate-pulse"
              >
                <div className="h-6 bg-white/20 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-white/20 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-white/20 rounded w-full mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTournaments.length === 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {statusFilter === 'all' ? 'No tournaments yet' : `No ${statusFilter} tournaments`}
            </h2>
            <p className="text-gray-300 mb-6">
              {statusFilter === 'all'
                ? 'Get started by creating your first tournament'
                : `No tournaments with ${statusFilter} status`}
            </p>
            {canEdit && statusFilter === 'all' && (
              <button
                onClick={() => router.push('/tournaments/new')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Create Your First Tournament
              </button>
            )}
          </div>
        )}

        {/* Tournament Grid */}
        {!loading && filteredTournaments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map(tournament => (
              <div
                key={tournament.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/tournaments/${tournament.id}`)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {tournament.name}
                    </h3>
                    <p className="text-sm text-gray-400">/{tournament.slug}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      statusColors[tournament.status]
                    }`}
                  >
                    {tournament.status}
                  </span>
                </div>

                {/* Description */}
                {tournament.description && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                {/* Meta Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="font-semibold mr-2">Format:</span>
                    <span>{formatBadges[tournament.format]}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="font-semibold mr-2">Game:</span>
                    <span className="capitalize">{tournament.gameType.replace('-', ' ')}</span>
                    <span className="mx-2">•</span>
                    <span>Race to {tournament.raceToWins}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="font-semibold mr-2">Players:</span>
                    <span>
                      {tournament.playerCount}
                      {tournament.maxPlayers && ` / ${tournament.maxPlayers}`}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="font-semibold mr-2">Matches:</span>
                    <span>
                      {tournament.completedMatchCount} / {tournament.matchCount} completed
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {(canEdit || canDelete) && (
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tournaments/${tournament.id}/edit`);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tournament.id, tournament.name);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
