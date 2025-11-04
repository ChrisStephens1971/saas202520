/**
 * Tests for Tournament API Contracts
 */

import { describe, it, expect } from '@jest/globals';
import {
  TournamentSchema,
  CreateTournamentRequestSchema,
  UpdateTournamentRequestSchema,
  GameType,
  TournamentFormat,
  TournamentStatus,
} from './tournaments';

describe('Tournament Contracts', () => {
  describe('TournamentSchema', () => {
    it('should validate a valid tournament', () => {
      const validTournament = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Summer Championship',
        game_type: 'eight-ball' as const,
        format: 'single-elimination' as const,
        status: 'active' as const,
        start_date: '2025-01-01T00:00:00Z',
        end_date: '2025-01-02T00:00:00Z',
        created_at: '2024-12-01T00:00:00Z',
        updated_at: '2024-12-01T00:00:00Z',
      };

      const result = TournamentSchema.safeParse(validTournament);
      expect(result.success).toBe(true);
    });

    it('should require tenant_id', () => {
      const invalidTournament = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        // tenant_id missing
        name: 'Summer Championship',
        game_type: 'eight-ball',
        format: 'single-elimination',
        status: 'active',
        start_date: '2025-01-01T00:00:00Z',
        end_date: null,
        created_at: '2024-12-01T00:00:00Z',
        updated_at: '2024-12-01T00:00:00Z',
      };

      const result = TournamentSchema.safeParse(invalidTournament);
      expect(result.success).toBe(false);
    });

    it('should allow null end_date', () => {
      const tournament = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Ongoing Tournament',
        game_type: 'nine-ball' as const,
        format: 'round-robin' as const,
        status: 'active' as const,
        start_date: '2025-01-01T00:00:00Z',
        end_date: null,
        created_at: '2024-12-01T00:00:00Z',
        updated_at: '2024-12-01T00:00:00Z',
      };

      const result = TournamentSchema.safeParse(tournament);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateTournamentRequestSchema', () => {
    it('should validate a valid create request', () => {
      const validRequest = {
        name: 'New Tournament',
        game_type: 'eight-ball' as const,
        format: 'single-elimination' as const,
        start_date: '2025-01-01T00:00:00Z',
      };

      const result = CreateTournamentRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidRequest = {
        name: '',
        game_type: 'eight-ball',
        format: 'single-elimination',
        start_date: '2025-01-01T00:00:00Z',
      };

      const result = CreateTournamentRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateTournamentRequestSchema', () => {
    it('should validate partial updates', () => {
      const validUpdate = {
        name: 'Updated Tournament Name',
      };

      const result = UpdateTournamentRequestSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow status updates', () => {
      const validUpdate = {
        status: 'completed' as const,
      };

      const result = UpdateTournamentRequestSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty updates', () => {
      const emptyUpdate = {};

      const result = UpdateTournamentRequestSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('Enum Schemas', () => {
    it('should validate game types', () => {
      expect(GameType.safeParse('eight-ball').success).toBe(true);
      expect(GameType.safeParse('nine-ball').success).toBe(true);
      expect(GameType.safeParse('invalid').success).toBe(false);
    });

    it('should validate tournament formats', () => {
      expect(TournamentFormat.safeParse('single-elimination').success).toBe(true);
      expect(TournamentFormat.safeParse('double-elimination').success).toBe(true);
      expect(TournamentFormat.safeParse('invalid').success).toBe(false);
    });

    it('should validate tournament statuses', () => {
      expect(TournamentStatus.safeParse('draft').success).toBe(true);
      expect(TournamentStatus.safeParse('active').success).toBe(true);
      expect(TournamentStatus.safeParse('completed').success).toBe(true);
      expect(TournamentStatus.safeParse('invalid').success).toBe(false);
    });
  });
});
