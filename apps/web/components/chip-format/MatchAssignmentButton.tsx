/**
 * Match Assignment Button Component
 * Epic: UI-004 - Match Assignment Interface
 * Single-click match assignment from queue
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
  count?: number;
  label?: string;
}

interface AssignmentResult {
  success: boolean;
  assignment?: {
    match: {
      id: string;
      playerAId: string;
      playerBId: string;
      playerAName: string;
      playerBName: string;
      tableNumber?: number;
    };
  };
  assignments?: Array<{
    match: {
      id: string;
      playerAId: string;
      playerBId: string;
      playerAName: string;
      playerBName: string;
      tableNumber?: number;
    };
  }>;
  count?: number;
  error?: string;
}

export default function MatchAssignmentButton({
  tournamentId,
  chipConfig,
  count = 1,
  label,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastAssignment, setLastAssignment] = useState<AssignmentResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAssign = async () => {
    setIsLoading(true);
    setShowResult(false);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches/assign-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chipConfig, count }),
      });

      const result: AssignmentResult = await response.json();

      setLastAssignment(result);
      setShowResult(true);

      if (result.success) {
        // Refresh queue stats and standings
        await Promise.all([
          mutate(`/api/tournaments/${tournamentId}/queue-stats`),
          mutate(`/api/tournaments/${tournamentId}/chip-standings?includeStats=true`),
        ]);

        // Hide success message after 3 seconds
        setTimeout(() => setShowResult(false), 3000);
      }
    } catch (error) {
      setLastAssignment({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign match',
      });
      setShowResult(true);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = label || (count === 1 ? 'Assign Next Match' : `Assign ${count} Matches`);

  return (
    <div className="relative">
      <button
        onClick={handleAssign}
        disabled={isLoading}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Assigning...
          </span>
        ) : (
          buttonLabel
        )}
      </button>

      {/* Assignment Result */}
      {showResult && lastAssignment && (
        <div
          className={`absolute top-full mt-2 left-0 right-0 p-4 rounded-lg shadow-lg z-10 ${
            lastAssignment.success
              ? 'bg-green-50 border-2 border-green-500'
              : 'bg-red-50 border-2 border-red-500'
          }`}
        >
          {lastAssignment.success ? (
            <div>
              <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Match{count > 1 ? 'es' : ''} Assigned Successfully!
              </div>

              {lastAssignment.assignment && (
                <div className="text-sm text-gray-700">
                  <div className="font-medium">
                    {lastAssignment.assignment.match.playerAName} vs.{' '}
                    {lastAssignment.assignment.match.playerBName}
                  </div>
                  {lastAssignment.assignment.match.tableNumber && (
                    <div className="text-gray-600">
                      Table: {lastAssignment.assignment.match.tableNumber}
                    </div>
                  )}
                </div>
              )}

              {lastAssignment.assignments && lastAssignment.count && (
                <div className="text-sm text-gray-700">
                  <div className="font-medium mb-1">{lastAssignment.count} matches assigned:</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {lastAssignment.assignments.map((assignment, i) => (
                      <div key={i} className="text-xs">
                        • {assignment.match.playerAName} vs. {assignment.match.playerBName}
                        {assignment.match.tableNumber && ` (Table ${assignment.match.tableNumber})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Assignment Failed
              </div>
              <div className="text-sm text-red-700">
                {lastAssignment.error || 'Not enough players available'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
