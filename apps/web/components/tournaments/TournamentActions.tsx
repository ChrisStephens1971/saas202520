'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from 'sonner';

interface TournamentActionsProps {
  tournamentId: string;
  status: string;
  totalPlayers: number;
}

export default function TournamentActions({
  tournamentId,
  status,
  totalPlayers,
}: TournamentActionsProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartRegistration = async () => {
    const ok = await confirm({
      title: 'Start Registration',
      description: 'Are you sure you want to start registration for this tournament?',
      actionLabel: 'Start Registration',
      cancelLabel: 'Cancel',
    });

    if (!ok) return;

    setIsLoading(true);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'registration' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start registration');
      }

      toast.success('Registration started successfully!');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTournament = async () => {
    if (totalPlayers < 2) {
      toast.error('You need at least 2 players to start the tournament');
      return;
    }

    const ok = await confirm({
      title: 'Start Tournament',
      description: `Are you sure you want to start the tournament with ${totalPlayers} players?`,
      actionLabel: 'Start Tournament',
      cancelLabel: 'Cancel',
    });

    if (!ok) return;

    setIsLoading(true);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start tournament');
      }

      toast.success('Tournament started successfully!');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mt-8 space-y-4">
        <div className="flex gap-4">
          {status === 'draft' && (
            <button
              onClick={handleStartRegistration}
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Starting...' : 'Start Registration'}
            </button>
          )}

          {status === 'registration' && (
            <>
              <Link
                href={`/tournaments/${tournamentId}/players/new`}
                className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 inline-block"
              >
                Add Player
              </Link>
              <button
                onClick={handleStartTournament}
                disabled={isLoading}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting...' : 'Start Tournament'}
              </button>
            </>
          )}

          {status === 'active' && (
            <>
              <Link
                href={`/tournaments/${tournamentId}/matches`}
                className="rounded-md bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 inline-block"
              >
                Manage Matches
              </Link>
              <Link
                href={`/tournaments/${tournamentId}/players`}
                className="rounded-md bg-gray-600 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 inline-block"
              >
                View Players
              </Link>
            </>
          )}

          {/* Settings link available for all statuses */}
          <Link
            href={`/tournaments/${tournamentId}/settings`}
            className="rounded-md bg-gray-500 px-6 py-2 text-sm font-medium text-white hover:bg-gray-600 inline-block"
          >
            Settings
          </Link>
        </div>
      </div>
      {ConfirmDialog}
    </>
  );
}
