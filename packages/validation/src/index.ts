// Validation Schemas using Zod
import { z } from 'zod';
import { VALIDATION } from '@tournament/shared';

// Tournament validation
export const createTournamentSchema = z.object({
  name: z.string().min(1).max(VALIDATION.MAX_NAME_LENGTH),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'modified_single', 'chip_format']),
  sportConfigId: z.string().uuid(),
});

// Player validation
export const createPlayerSchema = z.object({
  name: z.string().min(1).max(VALIDATION.MAX_NAME_LENGTH),
  email: z.string().email().max(VALIDATION.MAX_EMAIL_LENGTH).optional(),
  phone: z.string().max(VALIDATION.MAX_PHONE_LENGTH).optional(),
  rating: z.object({
    system: z.enum(['apa', 'fargo', 'bca', 'manual']),
    value: z.union([z.number(), z.string()]),
  }).optional(),
});

// Score validation
export const updateScoreSchema = z.object({
  matchId: z.string().uuid(),
  playerAScore: z.number().int().min(0),
  playerBScore: z.number().int().min(0),
  raceTo: z.number().int().min(1).optional(),
});

export * from './schemas/index.js';
