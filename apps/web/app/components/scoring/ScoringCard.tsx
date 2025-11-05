'use client';

/**
 * Mobile-First Scoring Card (SCORE-001)
 * Optimized for quick score entry on mobile devices
 * Features: Large touch targets, real-time validation, undo support
 */

import { useState, useEffect } from 'react';
import type { MatchScore } from '@tournament/shared/types/scoring';
import { isHillHill, formatScore } from '@tournament/shared';

interface ScoringCardProps {
  matchId: string;
  playerAName: string;
  playerBName: string;
  initialScore: MatchScore;
  initialRev: number;
  onScoreUpdate?: (newScore: MatchScore) => void;
}

export function ScoringCard({
  matchId,
  playerAName,
  playerBName,
  initialScore,
  initialRev,
  onScoreUpdate,
}: ScoringCardProps) {
  const [score, setScore] = useState<MatchScore>(initialScore);
  const [rev, setRev] = useState(initialRev);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHillHillConfirm, setShowHillHillConfirm] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState<'A' | 'B' | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const raceTo = score.raceTo || 9;
  const deviceId = typeof window !== 'undefined'
    ? (localStorage.getItem('deviceId') || generateDeviceId())
    : 'server';

  function generateDeviceId(): string {
    const id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', id);
    return id;
  }

  // Check undo availability on mount
  useEffect(() => {
    async function checkUndoAvailability() {
      try {
        const response = await fetch(`/api/matches/${matchId}/score/history?limit=1`);
        if (response.ok) {
          const data = await response.json();
          setCanUndo(data.canUndo);
        }
      } catch (err) {
        console.error('Error checking undo availability:', err);
      }
    }

    checkUndoAvailability();
  }, [matchId]);

  async function incrementScore(player: 'A' | 'B') {
    // Check for hill-hill situation
    const newScore = {
      playerA: player === 'A' ? score.playerA + 1 : score.playerA,
      playerB: player === 'B' ? score.playerB + 1 : score.playerB,
    };

    if (isHillHill({ ...score, ...newScore }, raceTo)) {
      setShowHillHillConfirm(true);
      setPendingPlayer(player);
      return;
    }

    await submitScoreIncrement(player);
  }

  async function submitScoreIncrement(player: 'A' | 'B') {
    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await fetch(`/api/matches/${matchId}/score/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          player,
          device: deviceId,
          rev,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update score');
      }

      // Update local state
      setScore(data.match.score);
      setRev(data.match.rev);
      setWarnings(data.validation.warnings || []);
      setCanUndo(true);

      // Notify parent
      onScoreUpdate?.(data.match.score);

      // Close hill-hill modal if open
      setShowHillHillConfirm(false);
      setPendingPlayer(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error incrementing score:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function undoLastScore() {
    if (!canUndo) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/matches/${matchId}/score/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          device: deviceId,
          rev,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to undo score');
      }

      // Update local state
      setScore(data.match.score);
      setRev(data.match.rev);
      setCanUndo(data.canUndo);
      setWarnings([]);

      // Notify parent
      onScoreUpdate?.(data.match.score);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error undoing score:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Score Display */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <div className="text-center mb-2 text-gray-600 text-sm">
          {formatScore(score, raceTo)}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Player A */}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">
              {playerAName}
            </div>
            <div className="text-6xl font-bold text-blue-600 mb-4">
              {score.playerA}
            </div>
            <button
              onClick={() => incrementScore('A')}
              disabled={isLoading || score.playerA >= raceTo}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 px-4 rounded-lg text-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              +1
            </button>
          </div>

          {/* Player B */}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">
              {playerBName}
            </div>
            <div className="text-6xl font-bold text-green-600 mb-4">
              {score.playerB}
            </div>
            <button
              onClick={() => incrementScore('B')}
              disabled={isLoading || score.playerB >= raceTo}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-4 rounded-lg text-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {/* Undo Button */}
      {canUndo && (
        <button
          onClick={undoLastScore}
          disabled={isLoading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 px-4 rounded-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↶ Undo Last Score
        </button>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              {warnings.map((warning, i) => (
                <p key={i} className="text-sm text-yellow-700">{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hill-Hill Confirmation Modal */}
      {showHillHillConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-center">Hill-Hill!</h3>
            <p className="text-gray-700 mb-6 text-center">
              Both players are one game away from winning. Confirm score for{' '}
              {pendingPlayer === 'A' ? playerAName : playerBName}?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setShowHillHillConfirm(false);
                  setPendingPlayer(null);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingPlayer && submitScoreIncrement(pendingPlayer)}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
