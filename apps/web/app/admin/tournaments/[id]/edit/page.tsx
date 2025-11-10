/**
 * Admin Tournament Edit Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Edit tournament with comprehensive validation and status management
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { TournamentWithStats, UpdateTournamentRequest } from '@tournament/api-contracts';
import { TournamentForm } from '@/components/admin/TournamentForm';

export default function AdminTournamentEditPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<TournamentWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission check
  const canEdit = session?.user?.role === 'owner' || session?.user?.role === 'td';

  // Fetch tournament
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
        setTournament(data.tournament as TournamentWithStats);
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

  // Handle form submission
  async function handleSubmit(data: UpdateTournamentRequest) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update tournament');
      }

      await response.json();

      // Navigate back to details page
      router.push(`/admin/tournaments/${tournamentId}`);
    } catch (err) {
      console.error('Error updating tournament:', err);
      setError(err instanceof Error ? err.message : 'Failed to update tournament');
      setSaving(false);
    }
  }

  // Check permissions
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-8 rounded-lg text-center">
            <p className="text-2xl font-semibold mb-2">Access Denied</p>
            <p className="mb-4">You do not have permission to edit tournaments</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/admin/tournaments/${tournamentId}`)}
            className="text-gray-300 hover:text-white mb-4 inline-flex items-center gap-2"
          >
            ← Back to Tournament
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Edit Tournament</h1>
          <p className="text-gray-300">{tournament.name}</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Tournament Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
          <TournamentForm
            initialData={{
              name: tournament.name,
              slug: tournament.slug,
              description: tournament.description || '',
              format: tournament.format,
              gameType: tournament.gameType,
              raceToWins: tournament.raceToWins,
              maxPlayers: tournament.maxPlayers,
              status: tournament.status,
              startDate: tournament.startedAt || null,
            }}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/admin/tournaments/${tournamentId}`)}
            submitLabel="Save Changes"
            isLoading={saving}
            mode="edit"
          />
        </div>

        {/* Status Change Warning */}
        {tournament.status !== 'draft' && (
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500 text-yellow-200 px-6 py-4 rounded-lg">
            <p className="font-semibold mb-1">Status Change Warning</p>
            <p className="text-sm">
              Changing certain fields may affect active matches and player brackets. Proceed with
              caution when tournament is not in draft status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
