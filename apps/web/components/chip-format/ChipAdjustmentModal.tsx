/**
 * Chip Adjustment Modal Component
 * Epic: UI-006 - Manual Chip Adjustments
 * TD interface for manual chip corrections
 */

'use client';

import { useState } from 'react';
import { mutate } from 'swr';

interface Player {
  id: string;
  name: string;
  chipCount: number;
}

interface Props {
  tournamentId: string;
  players: Player[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ChipAdjustmentModal({
  tournamentId,
  players,
  isOpen,
  onClose,
}: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
  const newChipCount = selectedPlayer ? selectedPlayer.chipCount + adjustment : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPlayerId) {
      setError('Please select a player');
      return;
    }

    if (adjustment === 0) {
      setError('Adjustment cannot be zero');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    if (newChipCount < 0) {
      setError('Adjustment would result in negative chips');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/players/${selectedPlayerId}/chips`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adjustment, reason }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to adjust chips');
      }

      // Refresh standings
      await mutate(`/api/tournaments/${tournamentId}/chip-standings?includeStats=true`);

      // Reset and close
      setSelectedPlayerId('');
      setAdjustment(0);
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust chips');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Manual Chip Adjustment</h2>
          <p className="text-gray-600 mt-1">Adjust player chips for corrections or penalties</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Player Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Player *
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">-- Choose a player --</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} (Current: {player.chipCount} chips)
                </option>
              ))}
            </select>
          </div>

          {/* Current Chips Display */}
          {selectedPlayer && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
              <div className="text-sm text-blue-700">
                <strong>Current chip count:</strong> {selectedPlayer.chipCount}
              </div>
            </div>
          )}

          {/* Adjustment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Amount *
            </label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter positive or negative number"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Positive numbers add chips, negative numbers subtract
            </p>
          </div>

          {/* Preview */}
          {selectedPlayer && adjustment !== 0 && (
            <div
              className={`border-l-4 p-3 ${
                newChipCount >= 0
                  ? 'bg-green-50 border-green-400'
                  : 'bg-red-50 border-red-400'
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  newChipCount >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                New chip count: {newChipCount}
                {newChipCount < 0 && ' (INVALID - Cannot be negative)'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {adjustment > 0 ? `+${adjustment}` : adjustment} chips
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Adjustment *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="e.g., Late arrival penalty, Sportsmanship bonus, Score correction"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              This reason will be recorded in the audit trail
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400"
              disabled={isLoading || !selectedPlayerId || adjustment === 0 || !reason.trim()}
            >
              {isLoading ? 'Applying...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
