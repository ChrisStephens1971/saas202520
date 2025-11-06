/**
 * Admin Tournament List (Client Component)
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Full CRUD tournament management with TanStack Table
 * Features: search, filter, sort, pagination, bulk operations, real-time updates
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TournamentWithStats, TournamentStatus } from '@tournament/api-contracts';
import { TournamentTable } from './TournamentTable';
import { useSocketEvent } from '@/hooks/useSocket';

interface TournamentListClientProps {
  initialTournaments: TournamentWithStats[];
  canEdit: boolean;
  canDelete: boolean;
}

export function TournamentListClient({
  initialTournaments,
  canEdit,
  canDelete,
}: TournamentListClientProps) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<TournamentWithStats[]>(initialTournaments);
  const [filteredTournaments, setFilteredTournaments] = useState<TournamentWithStats[]>(initialTournaments);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');

  // Apply status filter
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTournaments(tournaments);
    } else {
      setFilteredTournaments(tournaments.filter((t) => t.status === statusFilter));
    }
  }, [tournaments, statusFilter]);

  // Real-time updates via Socket.io
  useSocketEvent('tournament:created', (payload) => {
    console.log('Tournament created:', payload);
    // Fetch full tournament data
    fetch(`/api/tournaments/${payload.tournamentId}`)
      .then((res) => res.json())
      .then((data) => {
        setTournaments((current) => {
          // Check if already exists
          if (current.some((t) => t.id === payload.tournamentId)) {
            return current;
          }
          return [data.tournament, ...current];
        });
      })
      .catch(console.error);
  });

  useSocketEvent('tournament:updated', (payload) => {
    console.log('Tournament updated:', payload);
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === payload.tournamentId ? { ...t, ...payload.updates } : t
      )
    );
  });

  useSocketEvent('tournament:deleted', (payload) => {
    console.log('Tournament deleted:', payload);
    setTournaments((prev) => prev.filter((t) => t.id !== payload.tournamentId));
  });

  // Handle delete tournament
  async function handleDelete(tournamentId: string, tournamentName: string) {
    if (
      !confirm(
        `Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`
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

      // Remove from local state
      setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
    } catch (err) {
      console.error('Error deleting tournament:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete tournament');
    }
  }

  // Handle bulk delete
  async function handleBulkDelete(tournamentIds: string[]) {
    try {
      // Delete tournaments in parallel
      await Promise.all(
        tournamentIds.map((id) =>
          fetch(`/api/tournaments/${id}`, {
            method: 'DELETE',
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to delete tournament ${id}`);
          })
        )
      );

      // Remove from local state
      setTournaments((prev) => prev.filter((t) => !tournamentIds.includes(t.id)));
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete some tournaments');
      throw err;
    }
  }

  // Status counts
  const statusCounts = {
    all: tournaments.length,
    draft: tournaments.filter((t) => t.status === 'draft').length,
    registration: tournaments.filter((t) => t.status === 'registration').length,
    active: tournaments.filter((t) => t.status === 'active').length,
    paused: tournaments.filter((t) => t.status === 'paused').length,
    completed: tournaments.filter((t) => t.status === 'completed').length,
    cancelled: tournaments.filter((t) => t.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tournament Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all tournaments for your organization
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push('/admin/tournaments/new')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            + Create Tournament
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`
            bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer transition-all border-2
            ${
              statusFilter === 'all'
                ? 'border-purple-500'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statusCounts.all}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">All</div>
        </div>
        {(
          [
            'draft',
            'registration',
            'active',
            'paused',
            'completed',
            'cancelled',
          ] as TournamentStatus[]
        ).map((status) => (
          <div
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`
              bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer transition-all border-2
              ${
                statusFilter === status
                  ? 'border-purple-500'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {statusCounts[status]}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {status}
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-6 py-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All ({statusCounts.all})
        </button>
        {(
          [
            'draft',
            'registration',
            'active',
            'paused',
            'completed',
            'cancelled',
          ] as TournamentStatus[]
        ).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              statusFilter === status
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {status} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Tournament Table */}
      <TournamentTable
        data={filteredTournaments}
        isLoading={false}
        onDelete={canDelete ? handleDelete : undefined}
        onBulkDelete={canDelete ? handleBulkDelete : undefined}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
