/**
 * Tests for Tournament API Contracts
 *
 * Comprehensive test coverage for tournament schemas, validation, and helper functions.
 */

// Jest globals (describe, it, expect) are available automatically
import {
  // Enums
  TournamentStatus,
  TournamentFormat,
  SportType,
  GameType,

  // Entity Schemas
  TournamentSchema,
  TournamentWithStatsSchema,

  // Request Schemas
  CreateTournamentRequestSchema,
  UpdateTournamentRequestSchema,
  GetTournamentParamsSchema,
  ListTournamentsQuerySchema,
  DeleteTournamentParamsSchema,

  // Response Schemas
  CreateTournamentResponseSchema,
  GetTournamentResponseSchema,
  UpdateTournamentResponseSchema,
  ListTournamentsResponseSchema,

  // Helpers
  generateSlug,
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS,
} from './tournaments';

describe('Tournament API Contracts', () => {

  // ==========================================================================
  // Enum Tests
  // ==========================================================================

  describe('TournamentStatus Enum', () => {
    it('should accept valid tournament status values', () => {
      expect(TournamentStatus.parse('draft')).toBe('draft');
      expect(TournamentStatus.parse('registration')).toBe('registration');
      expect(TournamentStatus.parse('active')).toBe('active');
      expect(TournamentStatus.parse('paused')).toBe('paused');
      expect(TournamentStatus.parse('completed')).toBe('completed');
      expect(TournamentStatus.parse('cancelled')).toBe('cancelled');
    });

    it('should reject invalid tournament status values', () => {
      expect(() => TournamentStatus.parse('invalid')).toThrow();
      expect(() => TournamentStatus.parse('DRAFT')).toThrow();
      expect(() => TournamentStatus.parse('')).toThrow();
      expect(() => TournamentStatus.parse(null)).toThrow();
    });
  });

  describe('TournamentFormat Enum', () => {
    it('should accept valid tournament format values', () => {
      expect(TournamentFormat.parse('single_elimination')).toBe('single_elimination');
      expect(TournamentFormat.parse('double_elimination')).toBe('double_elimination');
      expect(TournamentFormat.parse('round_robin')).toBe('round_robin');
      expect(TournamentFormat.parse('modified_single')).toBe('modified_single');
      expect(TournamentFormat.parse('chip_format')).toBe('chip_format');
    });

    it('should reject invalid tournament format values', () => {
      expect(() => TournamentFormat.parse('invalid_format')).toThrow();
      expect(() => TournamentFormat.parse('single-elimination')).toThrow();
      expect(() => TournamentFormat.parse('')).toThrow();
    });
  });

  describe('SportType Enum', () => {
    it('should accept valid sport type values', () => {
      expect(SportType.parse('pool')).toBe('pool');
    });

    it('should reject invalid sport type values', () => {
      expect(() => SportType.parse('darts')).toThrow();
      expect(() => SportType.parse('Pool')).toThrow();
      expect(() => SportType.parse('')).toThrow();
    });
  });

  describe('GameType Enum', () => {
    it('should accept valid game type values', () => {
      expect(GameType.parse('eight-ball')).toBe('eight-ball');
      expect(GameType.parse('nine-ball')).toBe('nine-ball');
      expect(GameType.parse('ten-ball')).toBe('ten-ball');
      expect(GameType.parse('straight-pool')).toBe('straight-pool');
    });

    it('should reject invalid game type values', () => {
      expect(() => GameType.parse('8-ball')).toThrow();
      expect(() => GameType.parse('nineball')).toThrow();
      expect(() => GameType.parse('')).toThrow();
    });
  });

  // ==========================================================================
  // Entity Schema Tests
  // ==========================================================================

  describe('TournamentSchema', () => {
    const validTournament = {
      id: 'clt1234567890abcdefg',
      orgId: 'clt1234567890abcdef1',
      name: 'Summer Championship 2025',
      slug: 'summer-championship-2025',
      description: 'Annual summer pool tournament',
      status: 'registration',
      format: 'double_elimination',
      sport: 'pool',
      gameType: 'eight-ball',
      raceToWins: 7,
      maxPlayers: 32,
      createdAt: '2025-01-01T12:00:00.000Z',
      updatedAt: '2025-01-02T15:30:00.000Z',
      startedAt: null,
      completedAt: null,
      createdBy: 'clt1234567890abcdef2',
    };

    it('should accept valid tournament data', () => {
      const result = TournamentSchema.parse(validTournament);
      expect(result).toEqual(validTournament);
    });

    it('should accept tournament with null optional fields', () => {
      const tournamentWithNulls = {
        ...validTournament,
        description: null,
        maxPlayers: null,
        startedAt: null,
        completedAt: null,
      };
      const result = TournamentSchema.parse(tournamentWithNulls);
      expect(result).toEqual(tournamentWithNulls);
    });

    it('should reject invalid CUID formats', () => {
      expect(() => TournamentSchema.parse({ ...validTournament, id: 'invalid-id' })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, orgId: '123' })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, createdBy: '' })).toThrow();
    });

    it('should reject empty tournament name', () => {
      expect(() => TournamentSchema.parse({ ...validTournament, name: '' })).toThrow();
    });

    it('should reject tournament name over 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => TournamentSchema.parse({ ...validTournament, name: longName })).toThrow();
    });

    it('should reject invalid slug format', () => {
      expect(() => TournamentSchema.parse({ ...validTournament, slug: 'Invalid_Slug' })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, slug: 'slug with spaces' })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, slug: '-leading-hyphen' })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, slug: 'trailing-hyphen-' })).toThrow();
    });

    it('should reject race to wins outside valid range', () => {
      expect(() => TournamentSchema.parse({ ...validTournament, raceToWins: 0 })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, raceToWins: 22 })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, raceToWins: -1 })).toThrow();
    });

    it('should accept race to wins in valid range', () => {
      expect(TournamentSchema.parse({ ...validTournament, raceToWins: 1 })).toBeTruthy();
      expect(TournamentSchema.parse({ ...validTournament, raceToWins: 7 })).toBeTruthy();
      expect(TournamentSchema.parse({ ...validTournament, raceToWins: 21 })).toBeTruthy();
    });

    it('should reject max players outside valid range', () => {
      expect(() => TournamentSchema.parse({ ...validTournament, maxPlayers: 7 })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, maxPlayers: 129 })).toThrow();
    });

    it('should reject invalid datetime formats', () => {
      expect(() => TournamentSchema.parse({ ...validTournament, createdAt: '2025-01-01' })).toThrow();
      expect(() => TournamentSchema.parse({ ...validTournament, updatedAt: 'invalid-date' })).toThrow();
    });
  });

  describe('TournamentWithStatsSchema', () => {
    const validTournamentWithStats = {
      id: 'clt1234567890abcdefg',
      orgId: 'clt1234567890abcdef1',
      name: 'Summer Championship 2025',
      slug: 'summer-championship-2025',
      description: 'Annual summer pool tournament',
      status: 'active',
      format: 'single_elimination',
      sport: 'pool',
      gameType: 'nine-ball',
      raceToWins: 9,
      maxPlayers: 16,
      createdAt: '2025-01-01T12:00:00.000Z',
      updatedAt: '2025-01-02T15:30:00.000Z',
      startedAt: '2025-01-05T09:00:00.000Z',
      completedAt: null,
      createdBy: 'clt1234567890abcdef2',
      playerCount: 14,
      matchCount: 15,
      completedMatchCount: 7,
    };

    it('should accept valid tournament with stats', () => {
      const result = TournamentWithStatsSchema.parse(validTournamentWithStats);
      expect(result).toEqual(validTournamentWithStats);
    });

    it('should reject negative stat counts', () => {
      expect(() => TournamentWithStatsSchema.parse({ ...validTournamentWithStats, playerCount: -1 })).toThrow();
      expect(() => TournamentWithStatsSchema.parse({ ...validTournamentWithStats, matchCount: -5 })).toThrow();
      expect(() => TournamentWithStatsSchema.parse({ ...validTournamentWithStats, completedMatchCount: -10 })).toThrow();
    });

    it('should accept zero stat counts', () => {
      const statsWithZero = {
        ...validTournamentWithStats,
        playerCount: 0,
        matchCount: 0,
        completedMatchCount: 0,
      };
      const result = TournamentWithStatsSchema.parse(statsWithZero);
      expect(result).toEqual(statsWithZero);
    });
  });

  // ==========================================================================
  // Request Schema Tests
  // ==========================================================================

  describe('CreateTournamentRequestSchema', () => {
    const validRequest = {
      name: 'New Tournament',
      slug: 'new-tournament',
      description: 'Test description',
      format: 'double_elimination',
      sport: 'pool',
      gameType: 'eight-ball',
      raceToWins: 7,
      maxPlayers: 32,
      startDate: '2025-06-01T10:00:00.000Z',
    };

    it('should accept valid create tournament request', () => {
      const result = CreateTournamentRequestSchema.parse(validRequest);
      expect(result.name).toBe('New Tournament');
      expect(result.slug).toBe('new-tournament');
    });

    it('should transform slug to lowercase', () => {
      const requestWithUppercaseSlug = { ...validRequest, slug: 'NEW-TOURNAMENT' };
      const result = CreateTournamentRequestSchema.parse(requestWithUppercaseSlug);
      expect(result.slug).toBe('new-tournament');
    });

    it('should default sport to pool', () => {
      const { sport, ...requestWithoutSport } = validRequest;
      const result = CreateTournamentRequestSchema.parse(requestWithoutSport);
      expect(result.sport).toBe('pool');
    });

    it('should accept request without optional fields', () => {
      const minimalRequest = {
        name: 'Minimal Tournament',
        slug: 'minimal-tournament',
        format: 'single_elimination',
        gameType: 'nine-ball',
        raceToWins: 5,
      };
      const result = CreateTournamentRequestSchema.parse(minimalRequest);
      expect(result).toBeTruthy();
      expect(result.sport).toBe('pool'); // Default value
    });

    it('should reject empty tournament name', () => {
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, name: '' })).toThrow();
    });

    it('should reject invalid slug format', () => {
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, slug: 'Invalid Slug' })).toThrow();
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, slug: 'slug_with_underscore' })).toThrow();
    });

    it('should reject invalid race to wins values', () => {
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, raceToWins: 0 })).toThrow();
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, raceToWins: 22 })).toThrow();
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, raceToWins: -1 })).toThrow();
    });

    it('should reject invalid max players values', () => {
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, maxPlayers: 7 })).toThrow();
      expect(() => CreateTournamentRequestSchema.parse({ ...validRequest, maxPlayers: 200 })).toThrow();
    });
  });

  describe('UpdateTournamentRequestSchema', () => {
    it('should accept partial updates', () => {
      const partialUpdate = { name: 'Updated Name' };
      const result = UpdateTournamentRequestSchema.parse(partialUpdate);
      expect(result.name).toBe('Updated Name');
    });

    it('should accept null for nullable fields', () => {
      const updateWithNull = { description: null, maxPlayers: null };
      const result = UpdateTournamentRequestSchema.parse(updateWithNull);
      expect(result.description).toBeNull();
      expect(result.maxPlayers).toBeNull();
    });

    it('should transform slug to lowercase', () => {
      const update = { slug: 'UPPERCASE-SLUG' };
      const result = UpdateTournamentRequestSchema.parse(update);
      expect(result.slug).toBe('uppercase-slug');
    });

    it('should accept empty update object', () => {
      const emptyUpdate = {};
      const result = UpdateTournamentRequestSchema.parse(emptyUpdate);
      expect(result).toEqual({});
    });

    it('should reject invalid field values', () => {
      expect(() => UpdateTournamentRequestSchema.parse({ name: '' })).toThrow();
      expect(() => UpdateTournamentRequestSchema.parse({ raceToWins: 0 })).toThrow();
      expect(() => UpdateTournamentRequestSchema.parse({ maxPlayers: 5 })).toThrow();
    });
  });

  describe('ListTournamentsQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const query = { limit: 50, offset: 100, status: 'active', format: 'double_elimination' };
      const result = ListTournamentsQuerySchema.parse(query);
      expect(result).toEqual(query);
    });

    it('should use default values when not provided', () => {
      const emptyQuery = {};
      const result = ListTournamentsQuerySchema.parse(emptyQuery);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should coerce string numbers to integers', () => {
      const queryWithStrings = { limit: '20', offset: '40' };
      const result = ListTournamentsQuerySchema.parse(queryWithStrings);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(40);
    });

    it('should reject invalid limit values', () => {
      expect(() => ListTournamentsQuerySchema.parse({ limit: 0 })).toThrow();
      expect(() => ListTournamentsQuerySchema.parse({ limit: 101 })).toThrow();
      expect(() => ListTournamentsQuerySchema.parse({ limit: -1 })).toThrow();
    });

    it('should reject negative offset', () => {
      expect(() => ListTournamentsQuerySchema.parse({ offset: -1 })).toThrow();
    });

    it('should accept optional filters', () => {
      const queryWithFilters = { status: 'registration' };
      const result = ListTournamentsQuerySchema.parse(queryWithFilters);
      expect(result.status).toBe('registration');
      expect(result.limit).toBe(50); // Default
    });
  });

  describe('GetTournamentParamsSchema', () => {
    it('should accept valid CUID', () => {
      const params = { id: 'clt1234567890abcdefg' };
      const result = GetTournamentParamsSchema.parse(params);
      expect(result).toEqual(params);
    });

    it('should reject invalid CUID format', () => {
      expect(() => GetTournamentParamsSchema.parse({ id: 'invalid-id' })).toThrow();
      expect(() => GetTournamentParamsSchema.parse({ id: '123' })).toThrow();
      expect(() => GetTournamentParamsSchema.parse({ id: '' })).toThrow();
    });
  });

  describe('DeleteTournamentParamsSchema', () => {
    it('should accept valid CUID', () => {
      const params = { id: 'clt1234567890abcdefg' };
      const result = DeleteTournamentParamsSchema.parse(params);
      expect(result).toEqual(params);
    });

    it('should reject invalid CUID format', () => {
      expect(() => DeleteTournamentParamsSchema.parse({ id: 'not-a-cuid' })).toThrow();
    });
  });

  // ==========================================================================
  // Response Schema Tests
  // ==========================================================================

  describe('CreateTournamentResponseSchema', () => {
    it('should accept valid create tournament response', () => {
      const response = {
        tournament: {
          id: 'clt1234567890abcdefg',
          orgId: 'clt1234567890abcdef1',
          name: 'New Tournament',
          slug: 'new-tournament',
          description: null,
          status: 'draft',
          format: 'single_elimination',
          sport: 'pool',
          gameType: 'eight-ball',
          raceToWins: 7,
          maxPlayers: 32,
          createdAt: '2025-01-01T12:00:00.000Z',
          updatedAt: '2025-01-01T12:00:00.000Z',
          startedAt: null,
          completedAt: null,
          createdBy: 'clt1234567890abcdef2',
        },
      };
      const result = CreateTournamentResponseSchema.parse(response);
      expect(result).toEqual(response);
    });
  });

  describe('ListTournamentsResponseSchema', () => {
    it('should accept valid list tournaments response', () => {
      const response = {
        tournaments: [
          {
            id: 'clt1234567890abcdefg',
            orgId: 'clt1234567890abcdef1',
            name: 'Tournament 1',
            slug: 'tournament-1',
            description: null,
            status: 'active',
            format: 'double_elimination',
            sport: 'pool',
            gameType: 'nine-ball',
            raceToWins: 9,
            maxPlayers: null,
            createdAt: '2025-01-01T12:00:00.000Z',
            updatedAt: '2025-01-02T15:30:00.000Z',
            startedAt: '2025-01-05T09:00:00.000Z',
            completedAt: null,
            createdBy: 'clt1234567890abcdef2',
            playerCount: 16,
            matchCount: 15,
            completedMatchCount: 8,
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };
      const result = ListTournamentsResponseSchema.parse(response);
      expect(result).toEqual(response);
    });

    it('should accept empty tournament list', () => {
      const emptyResponse = {
        tournaments: [],
        total: 0,
        limit: 50,
        offset: 0,
      };
      const result = ListTournamentsResponseSchema.parse(emptyResponse);
      expect(result).toEqual(emptyResponse);
    });
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe('generateSlug()', () => {
    it('should convert to lowercase', () => {
      expect(generateSlug('UPPERCASE TOURNAMENT')).toBe('uppercase-tournament');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('My New Tournament')).toBe('my-new-tournament');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Tournament @#$% 2025')).toBe('tournament-2025');
    });

    it('should collapse multiple hyphens', () => {
      expect(generateSlug('Tournament   ---   2025')).toBe('tournament-2025');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('   Tournament 2025   ')).toBe('tournament-2025');
    });

    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('should handle complex names', () => {
      expect(generateSlug('Summer Pool Tournament 2025!!!')).toBe('summer-pool-tournament-2025');
    });

    it('should preserve numbers', () => {
      expect(generateSlug('Tournament 8-Ball 2025')).toBe('tournament-8-ball-2025');
    });
  });

  describe('isValidStatusTransition()', () => {
    it('should allow same status transition', () => {
      expect(isValidStatusTransition('draft', 'draft')).toBe(true);
      expect(isValidStatusTransition('active', 'active')).toBe(true);
    });

    it('should allow valid transitions from draft', () => {
      expect(isValidStatusTransition('draft', 'registration')).toBe(true);
      expect(isValidStatusTransition('draft', 'cancelled')).toBe(true);
    });

    it('should reject invalid transitions from draft', () => {
      expect(isValidStatusTransition('draft', 'active')).toBe(false);
      expect(isValidStatusTransition('draft', 'completed')).toBe(false);
    });

    it('should allow valid transitions from registration', () => {
      expect(isValidStatusTransition('registration', 'active')).toBe(true);
      expect(isValidStatusTransition('registration', 'cancelled')).toBe(true);
    });

    it('should allow valid transitions from active', () => {
      expect(isValidStatusTransition('active', 'paused')).toBe(true);
      expect(isValidStatusTransition('active', 'completed')).toBe(true);
      expect(isValidStatusTransition('active', 'cancelled')).toBe(true);
    });

    it('should allow valid transitions from paused', () => {
      expect(isValidStatusTransition('paused', 'active')).toBe(true);
      expect(isValidStatusTransition('paused', 'cancelled')).toBe(true);
    });

    it('should not allow transitions from terminal states', () => {
      expect(isValidStatusTransition('completed', 'active')).toBe(false);
      expect(isValidStatusTransition('completed', 'draft')).toBe(false);
      expect(isValidStatusTransition('cancelled', 'active')).toBe(false);
      expect(isValidStatusTransition('cancelled', 'draft')).toBe(false);
    });

    it('should verify VALID_STATUS_TRANSITIONS structure', () => {
      expect(VALID_STATUS_TRANSITIONS.draft).toEqual(['registration', 'cancelled']);
      expect(VALID_STATUS_TRANSITIONS.registration).toEqual(['active', 'cancelled']);
      expect(VALID_STATUS_TRANSITIONS.active).toEqual(['paused', 'completed', 'cancelled']);
      expect(VALID_STATUS_TRANSITIONS.paused).toEqual(['active', 'cancelled']);
      expect(VALID_STATUS_TRANSITIONS.completed).toEqual([]);
      expect(VALID_STATUS_TRANSITIONS.cancelled).toEqual([]);
    });
  });
});