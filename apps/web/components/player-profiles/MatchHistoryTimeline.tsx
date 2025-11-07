/**
 * Match History Timeline Component
 * Sprint 10 Week 2 - Day 3: UI Components
 *
 * Vertical timeline of player match history with pagination.
 */

'use client';

import { useState } from 'react';
import { MatchHistoryWithDetails } from '@/lib/player-profiles/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchHistoryTimelineProps {
  matches: MatchHistoryWithDetails[];
  playerId: string;
  showPagination?: boolean;
  pageSize?: number;
}

export function MatchHistoryTimeline({ matches, playerId, showPagination = true, pageSize = 10 }: MatchHistoryTimelineProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(matches.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayedMatches = showPagination ? matches.slice(startIndex, endIndex) : matches;

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No matches played yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-border" />

        {/* Matches */}
        <div className="space-y-6">
          {displayedMatches.map((match, index) => {
            const isWin = match.result === 'WIN';
            const isDraw = match.result === 'DRAW';

            return (
              <div key={match.id} className="relative pl-12 md:pl-20">
                {/* Timeline Dot */}
                <div
                  className={cn(
                    'absolute left-2 md:left-6 w-4 h-4 rounded-full border-4',
                    'transition-transform hover:scale-150',
                    isWin ? 'bg-green-500 border-green-200' : isDraw ? 'bg-gray-500 border-gray-200' : 'bg-red-500 border-red-200'
                  )}
                />

                {/* Match Card */}
                <div
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all hover:shadow-md',
                    isWin
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                      : isDraw
                        ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                        : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={isWin ? 'default' : isDraw ? 'secondary' : 'destructive'}
                          className={cn(isWin && 'bg-green-600', isDraw && 'bg-gray-600')}
                        >
                          {match.result}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{match.format}</span>
                      </div>
                      <h3 className="font-semibold text-lg">vs {match.opponent.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {match.playerScore} - {match.opponentScore}
                      </div>
                    </div>
                  </div>

                  {/* Tournament Info */}
                  <div className="flex flex-col md:flex-row gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {match.tournament.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(match.matchDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Match Metadata */}
                  {match.metadata && (
                    <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                      {match.metadata.round && <span>Round {match.metadata.round}</span>}
                      {match.metadata.bracket && <span className="capitalize">{match.metadata.bracket} Bracket</span>}
                      {match.metadata.tableNumber && <span>Table {match.metadata.tableNumber}</span>}
                    </div>
                  )}

                  {/* Duration */}
                  {match.duration && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Duration: {Math.floor(match.duration / 60)}h {match.duration % 60}m
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, matches.length)} of {matches.length} matches
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
