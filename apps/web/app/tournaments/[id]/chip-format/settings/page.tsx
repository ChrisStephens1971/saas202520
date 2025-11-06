/**
 * Chip Format Settings Page
 * Tournament configuration and manual adjustments
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ChipAdjustmentModal from '@/components/chip-format/ChipAdjustmentModal';

interface Tournament {
  id: string;
  name: string;
  format: string;
  chipConfig: {
    winnerChips: number;
    loserChips: number;
    qualificationRounds: number;
    finalsCount: number;
    pairingStrategy: string;
    allowDuplicatePairings: boolean;
    tiebreaker: string;
  };
}

interface Player {
  id: string;
  name: string;
  chipCount: number;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [tournamentRes, playersRes] = await Promise.all([
          fetch(`/api/tournaments/${id}`),
          fetch(`/api/tournaments/${id}/players`),
        ]);

        const tournamentData = await tournamentRes.json();
        const playersData = await playersRes.json();

        setTournament(tournamentData);
        setPlayers(playersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!tournament || tournament.format !== 'chip_format') {
    router.push('/tournaments');
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/tournaments" className="hover:text-gray-900">
          Tournaments
        </Link>
        <span>/</span>
        <Link
          href={`/tournaments/${id}/chip-format`}
          className="hover:text-gray-900"
        >
          {tournament.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Settings</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tournament Settings</h1>
          <p className="text-gray-600 mt-1">Configuration and manual adjustments</p>
        </div>
        <Link
          href={`/tournaments/${id}/chip-format`}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Chip Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Chip Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Winner Chips
              </label>
              <div className="text-2xl font-bold text-green-600">
                {tournament.chipConfig.winnerChips}
              </div>
              <p className="text-xs text-gray-600">Chips awarded to match winners</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loser Chips
              </label>
              <div className="text-2xl font-bold text-blue-600">
                {tournament.chipConfig.loserChips}
              </div>
              <p className="text-xs text-gray-600">Chips awarded to match losers</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qualification Rounds
              </label>
              <div className="text-2xl font-bold text-purple-600">
                {tournament.chipConfig.qualificationRounds}
              </div>
              <p className="text-xs text-gray-600">Rounds before finals cutoff</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Finals Count
              </label>
              <div className="text-2xl font-bold text-orange-600">
                {tournament.chipConfig.finalsCount}
              </div>
              <p className="text-xs text-gray-600">Players advancing to finals</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pairing Strategy
            </label>
            <div className="text-lg font-semibold capitalize">
              {tournament.chipConfig.pairingStrategy.replace('_', ' ')}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {tournament.chipConfig.pairingStrategy === 'random' && 'Random pairing from queue'}
              {tournament.chipConfig.pairingStrategy === 'rating' && 'Pair by similar ratings'}
              {tournament.chipConfig.pairingStrategy === 'chip_diff' && 'Pair by similar chip counts'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiebreaker Method
            </label>
            <div className="text-lg font-semibold capitalize">
              {tournament.chipConfig.tiebreaker.replace('_', ' ')}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {tournament.chipConfig.tiebreaker === 'head_to_head' && 'Previous match results'}
              {tournament.chipConfig.tiebreaker === 'rating' && 'Player skill rating'}
              {tournament.chipConfig.tiebreaker === 'random' && 'Random selection'}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Adjustments */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Manual Chip Adjustments</h2>
            <p className="text-sm text-gray-600 mt-1">
              Correct errors or apply penalties/bonuses
            </p>
          </div>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition"
          >
            Adjust Player Chips
          </button>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> All chip adjustments are recorded in the audit trail with
                timestamps and reasons. Use this feature for:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                <li>Score corrections</li>
                <li>Late arrival penalties</li>
                <li>Sportsmanship bonuses</li>
                <li>Administrative adjustments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Chip Adjustment Modal */}
      <ChipAdjustmentModal
        tournamentId={id}
        players={players}
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
      />
    </div>
  );
}
