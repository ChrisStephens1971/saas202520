/**
 * TournamentBracket Component Tests
 * Tests for bracket visualization component (Task D)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TournamentBracket from '../TournamentBracket';
import type { BracketStructure } from '@/lib/api/types/public-api.types';

describe('TournamentBracket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching bracket', () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TournamentBracket tournamentId="tournament-123" />);

      expect(screen.getByText('Loading bracket...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show message when no bracket data available', async () => {
      const emptyBracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [],
          losersBracket: [],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyBracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('No bracket data available yet.')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch bracket')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should reload page when retry button is clicked', async () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('Single Elimination Bracket', () => {
    it('should display winners bracket with rounds and matches', async () => {
      const singleEliminationBracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Quarterfinals',
              matches: [
                {
                  matchId: 'match-1',
                  playerA: { id: 'player-1', name: 'John Doe', seed: 1 },
                  playerB: { id: 'player-2', name: 'Jane Smith', seed: 8 },
                  score: { playerA: 3, playerB: 1 },
                  status: 'completed',
                  winner: { id: 'player-1', name: 'John Doe' },
                },
              ],
            },
            {
              round: 2,
              name: 'Finals',
              matches: [
                {
                  matchId: 'match-2',
                  playerA: { id: 'player-1', name: 'John Doe', seed: 1 },
                  playerB: { id: 'player-3', name: 'Bob Johnson', seed: 4 },
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => singleEliminationBracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('Tournament Bracket')).toBeInTheDocument();
        expect(screen.getByText('Quarterfinals')).toBeInTheDocument();
        expect(screen.getByText('Finals')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should highlight winner with green background and checkmark', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Finals',
              matches: [
                {
                  matchId: 'match-1',
                  playerA: { id: 'player-1', name: 'Winner', seed: 1 },
                  playerB: { id: 'player-2', name: 'Loser', seed: 2 },
                  score: { playerA: 3, playerB: 1 },
                  status: 'completed',
                  winner: { id: 'player-1', name: 'Winner' },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        const winnerElement = screen.getByText('Winner').closest('div');
        expect(winnerElement).toHaveClass('bg-green-50', 'font-semibold');
      });
    });

    it('should display seed numbers for players', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Round 1',
              matches: [
                {
                  matchId: 'match-1',
                  playerA: { id: 'player-1', name: 'Player A', seed: 1 },
                  playerB: { id: 'player-2', name: 'Player B', seed: 16 },
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#16')).toBeInTheDocument();
      });
    });

    it('should display TBD for missing players', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Round 1',
              matches: [
                {
                  matchId: 'match-1',
                  playerA: null,
                  playerB: null,
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        const tbdElements = screen.getAllByText('TBD');
        expect(tbdElements).toHaveLength(2);
      });
    });

    it('should display scores for completed matches', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Finals',
              matches: [
                {
                  matchId: 'match-1',
                  playerA: { id: 'player-1', name: 'Player A', seed: 1 },
                  playerB: { id: 'player-2', name: 'Player B', seed: 2 },
                  score: { playerA: 3, playerB: 1 },
                  status: 'completed',
                  winner: { id: 'player-1', name: 'Player A' },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('Final')).toBeInTheDocument();
      });
    });

    it('should display match status correctly', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Round 1',
              matches: [
                {
                  matchId: 'match-1',
                  playerA: { id: 'player-1', name: 'Player A', seed: 1 },
                  playerB: { id: 'player-2', name: 'Player B', seed: 2 },
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
                {
                  matchId: 'match-2',
                  playerA: { id: 'player-3', name: 'Player C', seed: 3 },
                  playerB: { id: 'player-4', name: 'Player D', seed: 4 },
                  score: { playerA: 2, playerB: 1 },
                  status: 'in_progress',
                  winner: null,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });
  });

  describe('Double Elimination Bracket', () => {
    it('should display both winners and losers brackets', async () => {
      const doubleEliminationBracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Winners Round 1',
              matches: [
                {
                  matchId: 'match-w1',
                  playerA: { id: 'player-1', name: 'Winner Player 1' },
                  playerB: { id: 'player-2', name: 'Winner Player 2' },
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
              ],
            },
          ],
          losersBracket: [
            {
              round: 1,
              name: 'Losers Round 1',
              matches: [
                {
                  matchId: 'match-l1',
                  playerA: { id: 'player-3', name: 'Loser Player 1' },
                  playerB: { id: 'player-4', name: 'Loser Player 2' },
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => doubleEliminationBracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('Winners Bracket')).toBeInTheDocument();
        expect(screen.getByText('Losers Bracket')).toBeInTheDocument();
        expect(screen.getByText('Winner Player 1')).toBeInTheDocument();
        expect(screen.getByText('Loser Player 1')).toBeInTheDocument();
      });
    });

    it('should not show losers bracket section if empty', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Finals',
              matches: [
                {
                  matchId: 'match-1',
                  playerA: { id: 'player-1', name: 'Player A' },
                  playerB: { id: 'player-2', name: 'Player B' },
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
              ],
            },
          ],
          losersBracket: [],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        expect(screen.getByText('Tournament Bracket')).toBeInTheDocument();
        expect(screen.queryByText('Losers Bracket')).not.toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should fetch bracket from correct endpoint', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-456" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/tournaments/tournament-456/bracket');
      });
    });

    it('should refetch when tournamentId changes', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [],
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => bracket,
      } as Response);

      const { rerender } = render(<TournamentBracket tournamentId="tournament-1" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/tournaments/tournament-1/bracket');
      });

      rerender(<TournamentBracket tournamentId="tournament-2" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/tournaments/tournament-2/bracket');
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Match Card Styling', () => {
    it('should apply correct border color for match status', async () => {
      const bracket: { data: BracketStructure } = {
        data: {
          winnersBracket: [
            {
              round: 1,
              name: 'Round 1',
              matches: [
                {
                  matchId: 'match-completed',
                  playerA: { id: 'player-1', name: 'Player A' },
                  playerB: { id: 'player-2', name: 'Player B' },
                  score: { playerA: 3, playerB: 1 },
                  status: 'completed',
                  winner: { id: 'player-1', name: 'Player A' },
                },
                {
                  matchId: 'match-in-progress',
                  playerA: { id: 'player-3', name: 'Player C' },
                  playerB: { id: 'player-4', name: 'Player D' },
                  score: { playerA: 2, playerB: 1 },
                  status: 'in_progress',
                  winner: null,
                },
                {
                  matchId: 'match-pending',
                  playerA: { id: 'player-5', name: 'Player E' },
                  playerB: { id: 'player-6', name: 'Player F' },
                  score: { playerA: 0, playerB: 0 },
                  status: 'pending',
                  winner: null,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => bracket,
      } as Response);

      render(<TournamentBracket tournamentId="tournament-123" />);

      await waitFor(() => {
        const completedMatch = screen.getByText('Player A').closest('div')
          ?.parentElement?.parentElement;
        const inProgressMatch = screen.getByText('Player C').closest('div')
          ?.parentElement?.parentElement;
        const pendingMatch = screen.getByText('Player E').closest('div')
          ?.parentElement?.parentElement;

        expect(completedMatch).toHaveClass('border-green-500');
        expect(inProgressMatch).toHaveClass('border-blue-500');
        expect(pendingMatch).toHaveClass('border-gray-300');
      });
    });
  });
});
