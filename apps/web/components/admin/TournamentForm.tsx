/**
 * TournamentForm Component
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Reusable form for creating and editing tournaments
 * Uses React Hook Form + Zod validation
 */

'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type {
  TournamentFormat,
  TournamentStatus,
  GameType,
  CreateTournamentRequest,
  UpdateTournamentRequest,
} from '@tournament/api-contracts';
import { generateSlug } from '@tournament/api-contracts';
import { useEffect } from 'react';

// Form validation schema
const _tournamentFormSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(255, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000, 'Description too long').optional(),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'modified_single', 'chip_format']),
  gameType: z.enum(['eight-ball', 'nine-ball', 'ten-ball', 'straight-pool']),
  raceToWins: z.number().int().min(1, 'Race to wins must be at least 1').max(21, 'Cannot exceed 21'),
  maxPlayers: z.number().int().min(8, 'Minimum 8 players').max(128, 'Maximum 128 players').optional().nullable(),
  status: z.enum(['draft', 'registration', 'active', 'paused', 'completed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional().nullable(),
});

type TournamentFormData = z.infer<typeof tournamentFormSchema>;

interface TournamentFormProps {
  initialData?: Partial<TournamentFormData>;
  onSubmit: (data: CreateTournamentRequest | UpdateTournamentRequest) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const FORMAT_OPTIONS: { value: TournamentFormat; label: string; description: string }[] = [
  {
    value: 'single_elimination',
    label: 'Single Elimination',
    description: 'Traditional single-elim bracket',
  },
  {
    value: 'double_elimination',
    label: 'Double Elimination',
    description: 'Winners + Losers brackets',
  },
  {
    value: 'round_robin',
    label: 'Round Robin',
    description: 'Every player plays every other player',
  },
  {
    value: 'modified_single',
    label: 'Modified Single',
    description: 'Single-elim with modifications',
  },
  {
    value: 'chip_format',
    label: 'Chip Format',
    description: 'Players collect chips, top X advance',
  },
];

const GAME_OPTIONS: { value: GameType; label: string }[] = [
  { value: 'eight-ball', label: '8-Ball' },
  { value: 'nine-ball', label: '9-Ball' },
  { value: 'ten-ball', label: '10-Ball' },
  { value: 'straight-pool', label: 'Straight Pool (14.1)' },
];

const STATUS_OPTIONS: { value: TournamentStatus; label: string; disabled?: boolean }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'registration', label: 'Registration' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed', disabled: true },
  { value: 'cancelled', label: 'Cancelled' },
];

export function TournamentForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Tournament',
  isLoading = false,
  mode = 'create',
}: TournamentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TournamentFormData>({
    defaultValues: {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
      format: initialData?.format || 'single_elimination',
      gameType: initialData?.gameType || 'eight-ball',
      raceToWins: initialData?.raceToWins || 3,
      maxPlayers: initialData?.maxPlayers || null,
      status: initialData?.status || 'draft',
      startDate: initialData?.startDate || null,
    },
  });

  const watchName = watch('name');

  // Auto-generate slug from name (only in create mode)
  useEffect(() => {
    if (mode === 'create' && watchName) {
      const generatedSlug = generateSlug(watchName);
      setValue('slug', generatedSlug);
    }
  }, [watchName, setValue, mode]);

  const handleFormSubmit = async (data: TournamentFormData) => {
    try {
      await onSubmit(data as CreateTournamentRequest | UpdateTournamentRequest);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h3>

        {/* Tournament Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tournament Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            placeholder="e.g., Summer Pool Championship"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL Slug *
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">/tournaments/</span>
            <input
              {...register('slug')}
              type="text"
              id="slug"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              placeholder="summer-pool-championship"
            />
          </div>
          {errors.slug && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.slug.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            placeholder="Describe your tournament..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.description.message}
            </p>
          )}
        </div>
      </div>

      {/* Tournament Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tournament Configuration
        </h3>

        {/* Format */}
        <div>
          <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tournament Format *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FORMAT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="relative flex items-start p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <input
                  {...register('format')}
                  type="radio"
                  value={option.value}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.format && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.format.message}
            </p>
          )}
        </div>

        {/* Game Type */}
        <div>
          <label htmlFor="gameType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Game Type *
          </label>
          <select
            {...register('gameType')}
            id="gameType"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            {GAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.gameType && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.gameType.message}
            </p>
          )}
        </div>

        {/* Race To Wins */}
        <div>
          <label htmlFor="raceToWins" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Race To *
          </label>
          <input
            {...register('raceToWins', { valueAsNumber: true })}
            type="number"
            id="raceToWins"
            min={1}
            max={21}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Number of games a player must win to win the match (1-21)
          </p>
          {errors.raceToWins && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.raceToWins.message}
            </p>
          )}
        </div>

        {/* Max Players */}
        <div>
          <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maximum Players
          </label>
          <input
            {...register('maxPlayers', {
              valueAsNumber: true,
              setValueAs: (v) => v === '' ? null : Number(v),
            })}
            type="number"
            id="maxPlayers"
            min={8}
            max={128}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            placeholder="Leave empty for unlimited"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Optional: Set a cap on the number of participants (8-128)
          </p>
          {errors.maxPlayers && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.maxPlayers.message}
            </p>
          )}
        </div>
      </div>

      {/* Status (Edit mode only) */}
      {mode === 'edit' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tournament Status
          </h3>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              {...register('status')}
              id="status"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.status.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-4 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
