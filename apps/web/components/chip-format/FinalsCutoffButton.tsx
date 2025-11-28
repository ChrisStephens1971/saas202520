/**
 * Finals Cutoff Button Component
 * Epic: UI-005 - Finals Cutoff UI
 * Trigger finals cutoff with confirmation
 */

'use client';

import { useState } from 'react';
import { mutate } from 'swr';

interface Props {
  tournamentId: string;
  chipConfig: {
    winnerChips: number;
    loserChips: number;
    qualificationRounds: number;
    finalsCount: number;
    pairingStrategy: string;
    tiebreaker: string;
  };
  status: string;
}

interface FinalsResult {
  success: boolean;
  finalists: Array<{
    playerId: string;
    playerName: string;
    chipCount: number;
    rank: number;
  }>;
  eliminated: Array<{
    playerId: string;
    playerName: string;
    chipCount: number;
    rank: number;
  }>;
  tiebreakersApplied?: Array<{
    playerId: string;
    playerName: string;
    method: string;
    result: string;
  }>;
  error?: string;
}

export default function FinalsCutoffButton({ tournamentId, chipConfig, status }: Props) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FinalsResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleApplyCutoff = async () => {
    setIsLoading(true);
    setShowConfirmation(false);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/apply-finals-cutoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data: FinalsResult = await response.json();
      setResult(data);
      setShowResult(true);

      if (data.success) {
        // Refresh standings
        await mutate(`/api/tournaments/${tournamentId}/chip-standings?includeStats=true`);
      }
    } catch (error) {
      setResult({
        success: false,
        finalists: [],
        eliminated: [],
        error: error instanceof Error ? error.message : 'Failed to apply finals cutoff',
      });
      setShowResult(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Button should be disabled if already in finals or completed
  const isDisabled = status === 'finals' || status === 'completed' || isLoading;

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfirmation(true)}
        disabled={isDisabled}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
          isDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {status === 'finals' ? 'Finals Cutoff Applied' : 'Apply Finals Cutoff'}
      </button>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Apply Finals Cutoff?</h2>
              <p className="text-gray-600 mt-2">
                This will select the top {chipConfig.finalsCount} players to advance to finals.
              </p>
            </div>

            <div className="p-6 space-y-4">
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
                      <strong>Warning:</strong> This action will:
                    </p>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                      <li>Select top {chipConfig.finalsCount} players as finalists</li>
                      <li>Mark remaining players as eliminated</li>
                      <li>Apply tiebreakers if necessary ({chipConfig.tiebreaker})</li>
                      <li>Change tournament status to &quot;finals&quot;</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="text-sm text-blue-700">
                  <strong>Configuration:</strong>
                </p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Finals count: {chipConfig.finalsCount} players</li>
                  <li>• Tiebreaker method: {chipConfig.tiebreaker.replace('_', ' ')}</li>
                  <li>• Qualification rounds: {chipConfig.qualificationRounds}</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCutoff}
                disabled={isLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400"
              >
                {isLoading ? 'Applying...' : 'Apply Cutoff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResult && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className={`p-6 border-b ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h2 className="text-2xl font-bold">
                {result.success ? '✓ Finals Cutoff Applied' : '✗ Cutoff Failed'}
              </h2>
            </div>

            {result.success ? (
              <div className="p-6 space-y-6">
                {/* Finalists */}
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3">
                    Finalists ({result.finalists.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.finalists.map((player) => (
                      <div
                        key={player.playerId}
                        className="border-l-4 border-green-500 bg-green-50 p-3 rounded"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">
                            #{player.rank} {player.playerName}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-sm">
                            {player.chipCount} chips
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tiebreakers */}
                {result.tiebreakersApplied && result.tiebreakersApplied.length > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Tiebreakers Applied
                    </h3>
                    <div className="space-y-2">
                      {result.tiebreakersApplied.map((tb, i) => (
                        <div key={i} className="text-sm text-yellow-700">
                          {tb.playerName}: {tb.method} → {tb.result}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eliminated */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Eliminated ({result.eliminated.length})
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {result.eliminated.map((player) => (
                      <div
                        key={player.playerId}
                        className="border-l-4 border-gray-300 bg-gray-50 p-2 rounded text-sm"
                      >
                        <span className="text-gray-700">
                          #{player.rank} {player.playerName} - {player.chipCount} chips
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="text-red-700">
                  {result.error || 'Failed to apply finals cutoff'}
                </div>
              </div>
            )}

            <div className="p-6 border-t">
              <button
                onClick={() => setShowResult(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
