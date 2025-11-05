/**
 * Tests for Match State Machine
 */

import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  validateTransition,
  validateTransitionPrerequisites,
  transitionMatchState,
  MatchStateTransitionError,
  getStateDescription,
  isTerminalState,
  getValidNextStates,
  VALID_TRANSITIONS,
} from './state-machine';
import type { MatchState } from '../types';

describe('Match State Machine', () => {
  describe('Valid Transitions', () => {
    it('should allow pending → ready', () => {
      expect(isValidTransition('pending', 'ready')).toBe(true);
    });

    it('should allow pending → cancelled', () => {
      expect(isValidTransition('pending', 'cancelled')).toBe(true);
    });

    it('should allow ready → assigned', () => {
      expect(isValidTransition('ready', 'assigned')).toBe(true);
    });

    it('should allow ready → cancelled', () => {
      expect(isValidTransition('ready', 'cancelled')).toBe(true);
    });

    it('should allow assigned → active', () => {
      expect(isValidTransition('assigned', 'active')).toBe(true);
    });

    it('should allow assigned → ready (unassign)', () => {
      expect(isValidTransition('assigned', 'ready')).toBe(true);
    });

    it('should allow assigned → cancelled', () => {
      expect(isValidTransition('assigned', 'cancelled')).toBe(true);
    });

    it('should allow active → completed', () => {
      expect(isValidTransition('active', 'completed')).toBe(true);
    });

    it('should allow active → cancelled', () => {
      expect(isValidTransition('active', 'cancelled')).toBe(true);
    });

    it('should allow same state transition (no-op)', () => {
      expect(isValidTransition('pending', 'pending')).toBe(true);
      expect(isValidTransition('ready', 'ready')).toBe(true);
      expect(isValidTransition('active', 'active')).toBe(true);
    });
  });

  describe('Invalid Transitions', () => {
    it('should reject pending → active (skip steps)', () => {
      expect(isValidTransition('pending', 'active')).toBe(false);
    });

    it('should reject pending → completed (skip steps)', () => {
      expect(isValidTransition('pending', 'completed')).toBe(false);
    });

    it('should reject ready → active (skip assigned)', () => {
      expect(isValidTransition('ready', 'active')).toBe(false);
    });

    it('should reject ready → completed (skip steps)', () => {
      expect(isValidTransition('ready', 'completed')).toBe(false);
    });

    it('should reject completed → any state (terminal)', () => {
      expect(isValidTransition('completed', 'pending')).toBe(false);
      expect(isValidTransition('completed', 'ready')).toBe(false);
      expect(isValidTransition('completed', 'active')).toBe(false);
      expect(isValidTransition('completed', 'cancelled')).toBe(false);
    });

    it('should reject cancelled → any state (terminal)', () => {
      expect(isValidTransition('cancelled', 'pending')).toBe(false);
      expect(isValidTransition('cancelled', 'ready')).toBe(false);
      expect(isValidTransition('cancelled', 'active')).toBe(false);
      expect(isValidTransition('cancelled', 'completed')).toBe(false);
    });

    it('should reject backward transitions (except assigned → ready)', () => {
      expect(isValidTransition('active', 'assigned')).toBe(false);
      expect(isValidTransition('active', 'ready')).toBe(false);
      expect(isValidTransition('active', 'pending')).toBe(false);
      expect(isValidTransition('completed', 'active')).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should not throw for valid transitions', () => {
      expect(() => validateTransition('match-1', 'pending', 'ready')).not.toThrow();
      expect(() => validateTransition('match-1', 'ready', 'assigned')).not.toThrow();
      expect(() => validateTransition('match-1', 'assigned', 'active')).not.toThrow();
    });

    it('should throw MatchStateTransitionError for invalid transitions', () => {
      expect(() => validateTransition('match-1', 'pending', 'active')).toThrow(
        MatchStateTransitionError
      );
      expect(() => validateTransition('match-1', 'completed', 'active')).toThrow(
        MatchStateTransitionError
      );
    });

    it('should include helpful error message', () => {
      try {
        validateTransition('match-1', 'pending', 'active');
      } catch (error) {
        expect(error).toBeInstanceOf(MatchStateTransitionError);
        const err = error as MatchStateTransitionError;
        expect(err.message).toContain("Invalid state transition from 'pending' to 'active'");
        expect(err.message).toContain('ready, cancelled');
        expect(err.matchId).toBe('match-1');
        expect(err.fromState).toBe('pending');
        expect(err.toState).toBe('active');
      }
    });
  });

  describe('Transition Prerequisites', () => {
    it('should require both players for ready state when coming from pending', () => {
      expect(() =>
        validateTransitionPrerequisites('pending', 'ready', { playerAId: 'p1' })
      ).toThrow('both playerAId and playerBId required');

      expect(() =>
        validateTransitionPrerequisites('pending', 'ready', { playerBId: 'p2' })
      ).toThrow('both playerAId and playerBId required');

      expect(() =>
        validateTransitionPrerequisites('pending', 'ready', { playerAId: 'p1', playerBId: 'p2' })
      ).not.toThrow();
    });

    it('should NOT require players when transitioning to ready from assigned (unassign)', () => {
      expect(() =>
        validateTransitionPrerequisites('assigned', 'ready', {})
      ).not.toThrow();
    });

    it('should require tableId for assigned state', () => {
      expect(() =>
        validateTransitionPrerequisites('ready', 'assigned', {})
      ).toThrow('tableId required');

      expect(() =>
        validateTransitionPrerequisites('ready', 'assigned', { tableId: 't1' })
      ).not.toThrow();
    });

    it('should require winnerId and score for completed state', () => {
      expect(() =>
        validateTransitionPrerequisites('active', 'completed', {})
      ).toThrow('winnerId required');

      expect(() =>
        validateTransitionPrerequisites('active', 'completed', { winnerId: 'p1' })
      ).toThrow('score required');

      expect(() =>
        validateTransitionPrerequisites('active', 'completed', {
          winnerId: 'p1',
          score: { playerA: 5, playerB: 3 },
        })
      ).not.toThrow();
    });

    it('should require reason for cancelled state', () => {
      expect(() =>
        validateTransitionPrerequisites('ready', 'cancelled', {})
      ).toThrow('reason required');

      expect(() =>
        validateTransitionPrerequisites('ready', 'cancelled', { reason: 'Player no-show' })
      ).not.toThrow();
    });
  });

  describe('Transition Execution', () => {
    it('should create valid transition event', () => {
      const transition = transitionMatchState(
        'match-1',
        'pending',
        'ready',
        { playerAId: 'p1', playerBId: 'p2' },
        'user-1'
      );

      expect(transition).toEqual({
        matchId: 'match-1',
        fromState: 'pending',
        toState: 'ready',
        reason: undefined,
        actor: 'user-1',
        timestamp: expect.any(Date),
      });
    });

    it('should include reason in transition event', () => {
      const transition = transitionMatchState(
        'match-1',
        'active',
        'cancelled',
        { reason: 'Player withdrew' },
        'user-1'
      );

      expect(transition.reason).toBe('Player withdrew');
    });

    it('should throw if transition is invalid', () => {
      expect(() =>
        transitionMatchState(
          'match-1',
          'pending',
          'completed',
          { winnerId: 'p1', score: { playerA: 5, playerB: 3 } },
          'user-1'
        )
      ).toThrow(MatchStateTransitionError);
    });

    it('should throw if prerequisites not met', () => {
      expect(() =>
        transitionMatchState('match-1', 'pending', 'ready', {}, 'user-1')
      ).toThrow('both playerAId and playerBId required');
    });
  });

  describe('State Helpers', () => {
    it('should provide state descriptions', () => {
      expect(getStateDescription('pending')).toBe('Waiting for players to be determined');
      expect(getStateDescription('ready')).toBe('Both players known, waiting for table assignment');
      expect(getStateDescription('active')).toBe('Match in progress');
      expect(getStateDescription('completed')).toBe('Match finished');
    });

    it('should identify terminal states', () => {
      expect(isTerminalState('completed')).toBe(true);
      expect(isTerminalState('cancelled')).toBe(true);
      expect(isTerminalState('pending')).toBe(false);
      expect(isTerminalState('ready')).toBe(false);
      expect(isTerminalState('active')).toBe(false);
    });

    it('should list valid next states', () => {
      expect(getValidNextStates('pending')).toEqual(['ready', 'cancelled']);
      expect(getValidNextStates('ready')).toEqual(['assigned', 'cancelled']);
      expect(getValidNextStates('assigned')).toEqual(['active', 'ready', 'cancelled']);
      expect(getValidNextStates('active')).toEqual(['completed', 'cancelled']);
      expect(getValidNextStates('completed')).toEqual([]);
      expect(getValidNextStates('cancelled')).toEqual([]);
    });
  });

  describe('Complete Workflows', () => {
    it('should support full happy path workflow', () => {
      const matchId = 'match-1';
      const actor = 'user-1';

      // pending → ready
      const t1 = transitionMatchState(
        matchId,
        'pending',
        'ready',
        { playerAId: 'p1', playerBId: 'p2' },
        actor
      );
      expect(t1.toState).toBe('ready');

      // ready → assigned
      const t2 = transitionMatchState(
        matchId,
        'ready',
        'assigned',
        { tableId: 't1' },
        actor
      );
      expect(t2.toState).toBe('assigned');

      // assigned → active
      const t3 = transitionMatchState(matchId, 'assigned', 'active', {}, actor);
      expect(t3.toState).toBe('active');

      // active → completed
      const t4 = transitionMatchState(
        matchId,
        'active',
        'completed',
        { winnerId: 'p1', score: { playerA: 5, playerB: 3 } },
        actor
      );
      expect(t4.toState).toBe('completed');
    });

    it('should support cancellation from any non-terminal state', () => {
      const matchId = 'match-1';
      const actor = 'user-1';

      // Can cancel from pending
      expect(() =>
        transitionMatchState(
          matchId,
          'pending',
          'cancelled',
          { reason: 'Tournament cancelled' },
          actor
        )
      ).not.toThrow();

      // Can cancel from ready
      expect(() =>
        transitionMatchState(
          matchId,
          'ready',
          'cancelled',
          { reason: 'Player no-show' },
          actor
        )
      ).not.toThrow();

      // Can cancel from active
      expect(() =>
        transitionMatchState(
          matchId,
          'active',
          'cancelled',
          { reason: 'Equipment failure' },
          actor
        )
      ).not.toThrow();
    });

    it('should support table reassignment workflow', () => {
      const matchId = 'match-1';
      const actor = 'user-1';

      // assigned → ready (unassign)
      const t1 = transitionMatchState(matchId, 'assigned', 'ready', {}, actor);
      expect(t1.toState).toBe('ready');

      // ready → assigned (reassign to different table)
      const t2 = transitionMatchState(
        matchId,
        'ready',
        'assigned',
        { tableId: 't2' },
        actor
      );
      expect(t2.toState).toBe('assigned');
    });
  });
});
