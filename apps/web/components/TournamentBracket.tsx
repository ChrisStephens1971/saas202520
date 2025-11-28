'use client';

import { useState, useEffect } from 'react';
import type {
  BracketStructure,
  BracketRound,
  BracketMatchNode,
} from '@/lib/api/types/public-api.types';

interface TournamentBracketProps {
  tournamentId: string;
}

export default function TournamentBracket({ tournamentId }: TournamentBracketProps) {
  const [bracket, setBracket] = useState<BracketStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBracket() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/tournaments/${tournamentId}/bracket`);

        if (!response.ok) {
          throw new Error('Failed to fetch bracket');
        }

        const data = await response.json();
        setBracket(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bracket');
      } finally {
        setLoading(false);
      }
    }

    if (tournamentId) {
      fetchBracket();
    }
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading bracket...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!bracket || bracket.winnersBracket.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-12 text-center">
        <p className="text-gray-600">No bracket data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Winners Bracket */}
      <div>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          {bracket.losersBracket ? 'Winners Bracket' : 'Tournament Bracket'}
        </h2>
        <BracketView rounds={bracket.winnersBracket} />
      </div>

      {/* Losers Bracket (Double Elimination) */}
      {bracket.losersBracket && bracket.losersBracket.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Losers Bracket</h2>
          <BracketView rounds={bracket.losersBracket} />
        </div>
      )}
    </div>
  );
}

interface BracketViewProps {
  rounds: BracketRound[];
}

function BracketView({ rounds }: BracketViewProps) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-8 pb-4">
        {rounds.map((round, roundIndex) => (
          <div key={round.round} className="flex flex-col">
            {/* Round Header */}
            <div className="mb-4 text-center">
              <h3 className="text-sm font-semibold text-gray-700">{round.name}</h3>
              <p className="text-xs text-gray-500">Round {round.round}</p>
            </div>

            {/* Matches */}
            <div className="flex flex-col justify-around space-y-6 flex-1">
              {round.matches.map((match, matchIndex) => (
                <div
                  key={match.matchId}
                  className="relative"
                  style={{
                    marginTop:
                      matchIndex === 0 ? calculateMatchSpacing(roundIndex, matchIndex) : undefined,
                  }}
                >
                  <MatchCard match={match} />

                  {/* Connector Line (to next round) */}
                  {roundIndex < rounds.length - 1 && (
                    <div className="absolute left-full top-1/2 h-0.5 w-8 bg-gray-300"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MatchCardProps {
  match: BracketMatchNode;
}

function MatchCard({ match }: MatchCardProps) {
  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500';
      case 'in_progress':
        return 'border-blue-500';
      case 'pending':
        return 'border-gray-300';
      default:
        return 'border-gray-300';
    }
  };

  const isWinner = (playerId: string | null) => {
    return playerId && match.winner && playerId === match.winner.id;
  };

  return (
    <div
      className={`w-64 rounded-lg border-2 bg-white shadow-md ${getMatchStatusColor(match.status)}`}
    >
      {/* Player A */}
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          match.playerA && isWinner(match.playerA.id) ? 'bg-green-50 font-semibold' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.playerA?.seed && (
            <span className="flex-shrink-0 text-xs font-medium text-gray-500">
              #{match.playerA.seed}
            </span>
          )}
          <span className="truncate">{match.playerA?.name || 'TBD'}</span>
          {match.playerA && isWinner(match.playerA.id) && (
            <span className="flex-shrink-0 text-green-600">✓</span>
          )}
        </div>
        <span className="ml-2 flex-shrink-0 font-bold text-gray-900">
          {match.status === 'completed' ? match.score.playerA : '-'}
        </span>
      </div>

      {/* Player B */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          match.playerB && isWinner(match.playerB.id) ? 'bg-green-50 font-semibold' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.playerB?.seed && (
            <span className="flex-shrink-0 text-xs font-medium text-gray-500">
              #{match.playerB.seed}
            </span>
          )}
          <span className="truncate">{match.playerB?.name || 'TBD'}</span>
          {match.playerB && isWinner(match.playerB.id) && (
            <span className="flex-shrink-0 text-green-600">✓</span>
          )}
        </div>
        <span className="ml-2 flex-shrink-0 font-bold text-gray-900">
          {match.status === 'completed' ? match.score.playerB : '-'}
        </span>
      </div>

      {/* Match Status */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <span className="text-xs text-gray-600">
          {match.status === 'completed' && 'Final'}
          {match.status === 'in_progress' && 'In Progress'}
          {match.status === 'pending' && 'Pending'}
        </span>
      </div>
    </div>
  );
}

/**
 * Calculate vertical spacing for matches to create proper bracket flow
 * Later rounds should have more spacing between matches
 */
function calculateMatchSpacing(roundIndex: number, matchIndex: number): string {
  if (matchIndex === 0) {
    // First match in each round gets base spacing that increases by round
    const baseSpacing = Math.pow(2, roundIndex) * 16; // 16px, 32px, 64px, etc.
    return `${baseSpacing}px`;
  }
  return '0px';
}
