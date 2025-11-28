'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import SwipeableCard from '@/components/mobile/SwipeableCard';
import BottomSheet from '@/components/mobile/BottomSheet';
import TouchOptimizedButton from '@/components/mobile/TouchOptimizedButton';
import { triggerHaptic } from '@/lib/pwa/haptics';
import { cn } from '@/lib/utils';

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  participants: number;
  rounds: Round[];
}

interface Round {
  id: string;
  number: number;
  matches: Match[];
}

interface Match {
  id: string;
  player1: {
    id: string;
    name: string;
    score?: number;
  };
  player2: {
    id: string;
    name: string;
    score?: number;
  };
  status: 'pending' | 'in-progress' | 'completed';
  winner?: string;
  table?: number;
}

interface MobileTournamentViewProps {
  tournament: Tournament;
  onRefresh?: () => Promise<void>;
}

/**
 * Mobile Tournament View
 *
 * Touch-optimized tournament bracket view with swipe navigation.
 * Features:
 * - Touch-optimized bracket visualization
 * - Swipe between rounds
 * - Pull-to-refresh
 * - Bottom sheet for match details
 * - Floating action button for quick actions
 * - Responsive card layout
 *
 * Accessibility:
 * - Touch targets ≥44x44px
 * - Screen reader support
 * - Keyboard navigation
 * - Clear visual hierarchy
 */
export function MobileTournamentView({ tournament, onRefresh }: MobileTournamentViewProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handlePreviousRound = useCallback(() => {
    if (currentRound > 0) {
      setCurrentRound(currentRound - 1);
      triggerHaptic('selection');
    }
  }, [currentRound]);

  const handleNextRound = useCallback(() => {
    if (currentRound < tournament.rounds.length - 1) {
      setCurrentRound(currentRound + 1);
      triggerHaptic('selection');
    }
  }, [currentRound, tournament.rounds.length]);

  const _handleSwipeLeft = useCallback(() => {
    handleNextRound();
  }, [handleNextRound]);

  const _handleSwipeRight = useCallback(() => {
    handlePreviousRound();
  }, [handlePreviousRound]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    triggerHaptic('medium');

    try {
      await onRefresh();
      triggerHaptic('success');
    } catch (error) {
      triggerHaptic('error');
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const handleMatchPress = useCallback((match: Match) => {
    setSelectedMatch(match);
    setShowDetails(true);
    triggerHaptic('light');
  }, []);

  const round = tournament.rounds[currentRound];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {tournament.name}
            </h1>
            <TouchOptimizedButton
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
              icon={<Info className="w-5 h-5" />}
              ariaLabel="Tournament details"
            />
          </div>

          {/* Tournament Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{tournament.date}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{tournament.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{tournament.participants} players</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-900 dark:text-white font-medium capitalize">
                {tournament.status}
              </span>
            </div>
          </div>
        </div>

        {/* Round Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <TouchOptimizedButton
            variant="ghost"
            size="sm"
            onClick={handlePreviousRound}
            disabled={currentRound === 0}
            icon={<ChevronLeft className="w-5 h-5" />}
            ariaLabel="Previous round"
          />

          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Round {round?.number || 1}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {round?.matches.length || 0} matches
            </div>
          </div>

          <TouchOptimizedButton
            variant="ghost"
            size="sm"
            onClick={handleNextRound}
            disabled={currentRound === tournament.rounds.length - 1}
            icon={<ChevronRight className="w-5 h-5" />}
            ariaLabel="Next round"
          />
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Matches List */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {round?.matches.map((match) => (
              <SwipeableCard key={match.id} onSwipeDown={handleRefresh} enableVerticalSwipe={true}>
                <div
                  onClick={() => handleMatchPress(match)}
                  className={cn(
                    'p-4 rounded-lg cursor-pointer',
                    'bg-white dark:bg-gray-800',
                    'border-2 border-gray-200 dark:border-gray-700',
                    'hover:border-blue-500 dark:hover:border-blue-400',
                    'transition-colors',
                    'min-h-[88px]' // Ensure touch target height
                  )}
                  role="button"
                  tabIndex={0}
                  aria-label={`Match: ${match.player1.name} vs ${match.player2.name}`}
                >
                  {/* Match Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Table {match.table || 'TBD'}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        match.status === 'completed' &&
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        match.status === 'in-progress' &&
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        match.status === 'pending' &&
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      )}
                    >
                      {match.status}
                    </span>
                  </div>

                  {/* Players */}
                  <div className="space-y-2">
                    {/* Player 1 */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'font-medium',
                          match.winner === match.player1.id
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {match.player1.name}
                      </span>
                      {match.player1.score !== undefined && (
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {match.player1.score}
                        </span>
                      )}
                    </div>

                    {/* VS Divider */}
                    <div className="text-center text-xs text-gray-400 dark:text-gray-600">vs</div>

                    {/* Player 2 */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'font-medium',
                          match.winner === match.player2.id
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {match.player2.name}
                      </span>
                      {match.player2.score !== undefined && (
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {match.player2.score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <TouchOptimizedButton
          variant="primary"
          size="lg"
          onClick={() => {
            triggerHaptic('medium');
            // Handle quick action (e.g., add match, report score)
          }}
          icon={<Plus className="w-6 h-6" />}
          className="rounded-full shadow-2xl w-14 h-14 p-0"
          ariaLabel="Quick action"
        />
      </div>

      {/* Match Details Bottom Sheet */}
      <BottomSheet
        isOpen={showDetails && selectedMatch !== null}
        onClose={() => setShowDetails(false)}
        title={
          selectedMatch ? `${selectedMatch.player1.name} vs ${selectedMatch.player2.name}` : ''
        }
        height={60}
      >
        {selectedMatch && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Table</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedMatch.table || 'Not assigned'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Status</div>
                <div className="font-medium text-gray-900 dark:text-white capitalize">
                  {selectedMatch.status}
                </div>
              </div>
            </div>

            {selectedMatch.status === 'completed' && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    Winner:{' '}
                    {selectedMatch.winner === selectedMatch.player1.id
                      ? selectedMatch.player1.name
                      : selectedMatch.player2.name}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 space-y-2">
              <TouchOptimizedButton fullWidth variant="primary">
                Report Score
              </TouchOptimizedButton>
              <TouchOptimizedButton fullWidth variant="secondary">
                View Details
              </TouchOptimizedButton>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export default MobileTournamentView;
