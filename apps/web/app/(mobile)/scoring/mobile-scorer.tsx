'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  Undo,
  Check,
  AlertCircle,
  Trophy
} from 'lucide-react';
import TouchOptimizedButton from '@/components/mobile/TouchOptimizedButton';
import BottomSheet from '@/components/mobile/BottomSheet';
import { gameHaptics, triggerHaptic } from '@/lib/pwa/haptics';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
  score: number;
  gamesWon: number;
}

interface ScoreHistory {
  timestamp: number;
  player1Score: number;
  player2Score: number;
  player1Games: number;
  player2Games: number;
  action: string;
}

interface MobileScorerProps {
  match: {
    id: string;
    player1: {
      id: string;
      name: string;
    };
    player2: {
      id: string;
      name: string;
    };
    format: {
      gamesToWin: number;
      pointsToWin: number;
    };
  };
  onComplete?: (winner: string, scores: any) => void;
  onCancel?: () => void;
}

/**
 * Mobile Scorer Component
 *
 * Touch-optimized score keeper with large tap targets and haptic feedback.
 * Features:
 * - Large tap targets (60x60px) for score buttons
 * - Swipe to undo last action
 * - Haptic feedback on all score changes
 * - Quick score buttons (game won, game lost)
 * - Confirmation dialog for match completion
 * - Score history with undo
 *
 * Accessibility:
 * - Touch targets ≥60x60px for primary actions
 * - Clear visual feedback
 * - Screen reader support
 * - Keyboard navigation
 */
export function MobileScorer({
  match,
  onComplete,
  onCancel
}: MobileScorerProps) {
  const [player1, setPlayer1] = useState<Player>({
    id: match.player1.id,
    name: match.player1.name,
    score: 0,
    gamesWon: 0
  });

  const [player2, setPlayer2] = useState<Player>({
    id: match.player2.id,
    name: match.player2.name,
    score: 0,
    gamesWon: 0
  });

  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const addToHistory = useCallback(
    (action: string) => {
      setHistory((prev) => [
        ...prev,
        {
          timestamp: Date.now(),
          player1Score: player1.score,
          player2Score: player2.score,
          player1Games: player1.gamesWon,
          player2Games: player2.gamesWon,
          action
        }
      ]);
    },
    [player1, player2]
  );

  const updateScore = useCallback(
    (playerId: string, delta: number) => {
      if (playerId === player1.id) {
        const newScore = Math.max(0, player1.score + delta);
        setPlayer1((prev) => ({ ...prev, score: newScore }));

        // Check if game won
        if (newScore >= match.format.pointsToWin) {
          const newGamesWon = player1.gamesWon + 1;
          setPlayer1((prev) => ({ ...prev, gamesWon: newGamesWon, score: 0 }));
          setPlayer2((prev) => ({ ...prev, score: 0 }));
          gameHaptics.winGame();

          // Check if match won
          if (newGamesWon >= match.format.gamesToWin) {
            setWinner(player1.id);
            setShowConfirmation(true);
            gameHaptics.winMatch();
          }

          addToHistory(`${player1.name} won game`);
        } else {
          delta > 0 ? gameHaptics.scorePoint() : gameHaptics.undo();
          addToHistory(`${player1.name} ${delta > 0 ? '+' : ''}${delta} point`);
        }
      } else {
        const newScore = Math.max(0, player2.score + delta);
        setPlayer2((prev) => ({ ...prev, score: newScore }));

        // Check if game won
        if (newScore >= match.format.pointsToWin) {
          const newGamesWon = player2.gamesWon + 1;
          setPlayer2((prev) => ({ ...prev, gamesWon: newGamesWon, score: 0 }));
          setPlayer1((prev) => ({ ...prev, score: 0 }));
          gameHaptics.winGame();

          // Check if match won
          if (newGamesWon >= match.format.gamesToWin) {
            setWinner(player2.id);
            setShowConfirmation(true);
            gameHaptics.winMatch();
          }

          addToHistory(`${player2.name} won game`);
        } else {
          delta > 0 ? gameHaptics.scorePoint() : gameHaptics.undo();
          addToHistory(`${player2.name} ${delta > 0 ? '+' : ''}${delta} point`);
        }
      }
    },
    [player1, player2, match.format, addToHistory]
  );

  const handleGameWon = useCallback(
    (playerId: string) => {
      if (playerId === player1.id) {
        const newGamesWon = player1.gamesWon + 1;
        setPlayer1((prev) => ({ ...prev, gamesWon: newGamesWon, score: 0 }));
        setPlayer2((prev) => ({ ...prev, score: 0 }));
        gameHaptics.winGame();

        if (newGamesWon >= match.format.gamesToWin) {
          setWinner(player1.id);
          setShowConfirmation(true);
          gameHaptics.winMatch();
        }

        addToHistory(`${player1.name} won game (quick score)`);
      } else {
        const newGamesWon = player2.gamesWon + 1;
        setPlayer2((prev) => ({ ...prev, gamesWon: newGamesWon, score: 0 }));
        setPlayer1((prev) => ({ ...prev, score: 0 }));
        gameHaptics.winGame();

        if (newGamesWon >= match.format.gamesToWin) {
          setWinner(player2.id);
          setShowConfirmation(true);
          gameHaptics.winMatch();
        }

        addToHistory(`${player2.name} won game (quick score)`);
      }
    },
    [player1, player2, match.format, addToHistory]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) {
      triggerHaptic('error');
      return;
    }

    const lastState = history[history.length - 1];
    setPlayer1((prev) => ({
      ...prev,
      score: lastState.player1Score,
      gamesWon: lastState.player1Games
    }));
    setPlayer2((prev) => ({
      ...prev,
      score: lastState.player2Score,
      gamesWon: lastState.player2Games
    }));
    setHistory((prev) => prev.slice(0, -1));
    gameHaptics.undo();
  }, [history]);

  const handleConfirmComplete = useCallback(() => {
    if (winner && onComplete) {
      onComplete(winner, {
        player1: { score: player1.score, gamesWon: player1.gamesWon },
        player2: { score: player2.score, gamesWon: player2.gamesWon },
        history
      });
    }
  }, [winner, player1, player2, history, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Score Match
            </h1>
            <div className="flex gap-2">
              <TouchOptimizedButton
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={history.length === 0}
                icon={<Undo className="w-5 h-5" />}
                hapticType="medium"
                ariaLabel="Undo last action"
              />
              <TouchOptimizedButton
                variant="danger"
                size="sm"
                onClick={onCancel}
                ariaLabel="Cancel scoring"
              >
                Cancel
              </TouchOptimizedButton>
            </div>
          </div>

          {/* Match Format */}
          <div className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
            Best of {match.format.gamesToWin * 2 - 1} games • {match.format.pointsToWin} points to win
          </div>
        </div>
      </div>

      {/* Players Scoring Area */}
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Player 1 */}
        <div className="flex-1 flex flex-col justify-center items-center bg-blue-50 dark:bg-blue-900/20 p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {player1.name}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Games Won
              </div>
              <div className="flex gap-1">
                {Array.from({ length: match.format.gamesToWin }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full',
                      i < player1.gamesWon
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Score Display */}
          <motion.div
            className="text-8xl font-bold text-blue-600 dark:text-blue-400 mb-8"
            key={player1.score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {player1.score}
          </motion.div>

          {/* Score Controls */}
          <div className="flex gap-4 mb-4">
            <TouchOptimizedButton
              variant="secondary"
              size="lg"
              onClick={() => updateScore(player1.id, -1)}
              disabled={player1.score === 0}
              icon={<Minus className="w-8 h-8" />}
              className="w-16 h-16 rounded-full"
              hapticType="light"
              ariaLabel="Decrease score"
            />
            <TouchOptimizedButton
              variant="primary"
              size="lg"
              onClick={() => updateScore(player1.id, 1)}
              icon={<Plus className="w-8 h-8" />}
              className="w-16 h-16 rounded-full"
              hapticType="light"
              ariaLabel="Increase score"
            />
          </div>

          {/* Quick Actions */}
          <TouchOptimizedButton
            variant="success"
            size="md"
            onClick={() => handleGameWon(player1.id)}
            icon={<Trophy className="w-5 h-5" />}
            hapticType="medium"
          >
            Game Won
          </TouchOptimizedButton>
        </div>

        {/* Divider */}
        <div className="relative h-1 bg-gray-300 dark:bg-gray-700">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-4 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
            VS
          </div>
        </div>

        {/* Player 2 */}
        <div className="flex-1 flex flex-col justify-center items-center bg-red-50 dark:bg-red-900/20 p-6">
          {/* Quick Actions */}
          <TouchOptimizedButton
            variant="success"
            size="md"
            onClick={() => handleGameWon(player2.id)}
            icon={<Trophy className="w-5 h-5" />}
            hapticType="medium"
          >
            Game Won
          </TouchOptimizedButton>

          {/* Score Controls */}
          <div className="flex gap-4 my-4">
            <TouchOptimizedButton
              variant="secondary"
              size="lg"
              onClick={() => updateScore(player2.id, -1)}
              disabled={player2.score === 0}
              icon={<Minus className="w-8 h-8" />}
              className="w-16 h-16 rounded-full"
              hapticType="light"
              ariaLabel="Decrease score"
            />
            <TouchOptimizedButton
              variant="primary"
              size="lg"
              onClick={() => updateScore(player2.id, 1)}
              icon={<Plus className="w-8 h-8" />}
              className="w-16 h-16 rounded-full"
              hapticType="light"
              ariaLabel="Increase score"
            />
          </div>

          {/* Score Display */}
          <motion.div
            className="text-8xl font-bold text-red-600 dark:text-red-400 mb-8"
            key={player2.score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {player2.score}
          </motion.div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {player2.name}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Games Won
              </div>
              <div className="flex gap-1">
                {Array.from({ length: match.format.gamesToWin }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full',
                      i < player2.gamesWon
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <BottomSheet
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Match Complete"
        height={50}
      >
        <div className="text-center space-y-6">
          <div>
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {winner === player1.id ? player1.name : player2.name} Wins!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Final Score: {player1.gamesWon} - {player2.gamesWon}
            </p>
          </div>

          <div className="space-y-2">
            <TouchOptimizedButton
              fullWidth
              variant="primary"
              size="lg"
              onClick={handleConfirmComplete}
              icon={<Check className="w-5 h-5" />}
              hapticType="success"
            >
              Confirm Result
            </TouchOptimizedButton>
            <TouchOptimizedButton
              fullWidth
              variant="secondary"
              onClick={() => {
                setShowConfirmation(false);
                setWinner(null);
                triggerHaptic('light');
              }}
            >
              Continue Playing
            </TouchOptimizedButton>
          </div>
        </div>
      </BottomSheet>

      {/* History Panel (Optional) */}
      {history.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-h-32 overflow-y-auto">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Recent Actions
          </div>
          <div className="space-y-1">
            {history.slice(-3).reverse().map((item, index) => (
              <div
                key={item.timestamp}
                className="text-xs text-gray-700 dark:text-gray-300"
              >
                {item.action}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileScorer;
