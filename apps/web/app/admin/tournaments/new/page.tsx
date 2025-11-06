/**
 * Admin Tournament Creation Wizard
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Multi-step form for creating tournaments:
 * 1. Basic Info (name, slug, description)
 * 2. Settings (format, game type, race to, max players)
 * 3. Review & Create
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import type { CreateTournamentRequest, TournamentFormat, GameType } from '@tournament/api-contracts';
import { generateSlug } from '@tournament/api-contracts';
import { TournamentStatusBadge } from '@/components/admin/TournamentStatusBadge';

type WizardStep = 'basic' | 'settings' | 'review';

interface TournamentFormData {
  name: string;
  slug: string;
  description?: string;
  format: TournamentFormat;
  gameType: GameType;
  raceToWins: number;
  maxPlayers?: number | null;
}

export default function AdminNewTournamentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TournamentFormData>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      format: 'single_elimination',
      gameType: 'eight-ball',
      raceToWins: 3,
      maxPlayers: null,
    },
  });

  const watchName = watch('name');
  const watchFormat = watch('format');

  // Permission check
  const canCreate = session?.user?.role === 'owner' || session?.user?.role === 'td';

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-8 rounded-lg text-center">
            <p className="text-2xl font-semibold mb-2">Access Denied</p>
            <p className="mb-4">You do not have permission to create tournaments</p>
            <button
              onClick={() => router.push('/admin/tournaments')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    if (currentStep === 'basic') {
      setValue('slug', generateSlug(name));
    }
  };

  // Navigation
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
    setError(null);
  };

  // Create tournament
  async function onSubmit(data: TournamentFormData) {
    setCreating(true);
    setError(null);

    try {
      const payload: CreateTournamentRequest = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        format: data.format,
        sport: 'pool',
        gameType: data.gameType,
        raceToWins: data.raceToWins,
        maxPlayers: data.maxPlayers || undefined,
      };

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create tournament');
      }

      const result = await response.json();
      console.log('Tournament created:', result);

      // Navigate to tournament details
      router.push(`/admin/tournaments/${result.tournament.id}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
      setCreating(false);
    }
  }

  const FORMAT_OPTIONS: { value: TournamentFormat; label: string; description: string }[] = [
    {
      value: 'single_elimination',
      label: 'Single Elimination',
      description: 'Traditional single-elim bracket - lose once and you\'re out',
    },
    {
      value: 'double_elimination',
      label: 'Double Elimination',
      description: 'Winners + Losers brackets - two chances to win',
    },
    {
      value: 'round_robin',
      label: 'Round Robin',
      description: 'Every player plays every other player',
    },
    {
      value: 'modified_single',
      label: 'Modified Single',
      description: 'Single-elim with modifications (e.g., third-place match)',
    },
    {
      value: 'chip_format',
      label: 'Chip Format',
      description: 'Players collect chips, top X advance to finals',
    },
  ];

  const GAME_OPTIONS: { value: GameType; label: string }[] = [
    { value: 'eight-ball', label: '8-Ball' },
    { value: 'nine-ball', label: '9-Ball' },
    { value: 'ten-ball', label: '10-Ball' },
    { value: 'straight-pool', label: 'Straight Pool (14.1)' },
  ];

  // Step indicators
  const steps = [
    { id: 'basic', label: 'Basic Info', number: 1 },
    { id: 'settings', label: 'Settings', number: 2 },
    { id: 'review', label: 'Review', number: 3 },
  ] as const;

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/tournaments')}
            className="text-gray-300 hover:text-white mb-4 inline-flex items-center gap-2"
          >
            ← Back to Tournaments
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Create New Tournament</h1>
          <p className="text-gray-300">Follow the wizard to set up your tournament</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold
                      ${
                        index <= currentStepIndex
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }
                    `}
                  >
                    {step.number}
                  </div>
                  <div className="ml-3">
                    <div
                      className={`
                        font-semibold
                        ${index <= currentStepIndex ? 'text-white' : 'text-gray-400'}
                      `}
                    >
                      {step.label}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-4
                      ${index < currentStepIndex ? 'bg-purple-600' : 'bg-gray-600'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form Steps */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-6">
            {/* Step 1: Basic Info */}
            {currentStep === 'basic' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Basic Information</h2>

                {/* Tournament Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Tournament Name *
                  </label>
                  <input
                    {...register('name', { required: 'Tournament name is required' })}
                    type="text"
                    id="name"
                    onChange={handleNameChange}
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Summer Pool Championship"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label
                    htmlFor="slug"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    URL Slug *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">/tournaments/</span>
                    <input
                      {...register('slug', {
                        required: 'Slug is required',
                        pattern: {
                          value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                          message: 'Slug must be lowercase alphanumeric with hyphens',
                        },
                      })}
                      type="text"
                      id="slug"
                      className="flex-1 px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="summer-pool-championship"
                    />
                  </div>
                  {errors.slug && (
                    <p className="mt-1 text-sm text-red-400">{errors.slug.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Describe your tournament..."
                  />
                </div>
              </div>
            )}

            {/* Step 2: Settings */}
            {currentStep === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Tournament Settings</h2>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Tournament Format *
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {FORMAT_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`
                          relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${
                            watchFormat === option.value
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                          }
                        `}
                      >
                        <input
                          {...register('format')}
                          type="radio"
                          value={option.value}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-white">{option.label}</div>
                          <div className="text-sm text-gray-400">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Game Type */}
                <div>
                  <label
                    htmlFor="gameType"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Game Type *
                  </label>
                  <select
                    {...register('gameType')}
                    id="gameType"
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-purple-500"
                  >
                    {GAME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Race To Wins */}
                <div>
                  <label
                    htmlFor="raceToWins"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Race To *
                  </label>
                  <input
                    {...register('raceToWins', {
                      valueAsNumber: true,
                      min: { value: 1, message: 'Minimum 1 game' },
                      max: { value: 21, message: 'Maximum 21 games' },
                    })}
                    type="number"
                    id="raceToWins"
                    min={1}
                    max={21}
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-sm text-gray-400">
                    Number of games a player must win to win the match (1-21)
                  </p>
                  {errors.raceToWins && (
                    <p className="mt-1 text-sm text-red-400">{errors.raceToWins.message}</p>
                  )}
                </div>

                {/* Max Players */}
                <div>
                  <label
                    htmlFor="maxPlayers"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Maximum Players (Optional)
                  </label>
                  <input
                    {...register('maxPlayers', {
                      valueAsNumber: true,
                      setValueAs: (v) => (v === '' ? null : Number(v)),
                      min: { value: 8, message: 'Minimum 8 players' },
                      max: { value: 128, message: 'Maximum 128 players' },
                    })}
                    type="number"
                    id="maxPlayers"
                    min={8}
                    max={128}
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Leave empty for unlimited"
                  />
                  <p className="mt-1 text-sm text-gray-400">
                    Optional: Set a cap on the number of participants (8-128)
                  </p>
                  {errors.maxPlayers && (
                    <p className="mt-1 text-sm text-red-400">{errors.maxPlayers.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Review & Create</h2>

                <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                  <div>
                    <div className="text-sm text-gray-400">Tournament Name</div>
                    <div className="text-xl font-semibold text-white">{getValues('name')}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">URL</div>
                    <div className="text-white">/tournaments/{getValues('slug')}</div>
                  </div>

                  {getValues('description') && (
                    <div>
                      <div className="text-sm text-gray-400">Description</div>
                      <div className="text-white">{getValues('description')}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                    <div>
                      <div className="text-sm text-gray-400">Format</div>
                      <div className="text-white capitalize">
                        {getValues('format').replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Game Type</div>
                      <div className="text-white capitalize">
                        {getValues('gameType').replace('-', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Race To</div>
                      <div className="text-white">{getValues('raceToWins')} games</div>
                    </div>
                    {getValues('maxPlayers') && (
                      <div>
                        <div className="text-sm text-gray-400">Max Players</div>
                        <div className="text-white">{getValues('maxPlayers')} players</div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400">Initial Status</div>
                    <div className="mt-2">
                      <TournamentStatusBadge status="draft" />
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                      Tournament will be created in draft status. You can add players and configure
                      additional settings before making it active.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            {currentStep !== 'basic' && (
              <button
                type="button"
                onClick={() => {
                  const prevIndex = Math.max(0, currentStepIndex - 1);
                  goToStep(steps[prevIndex].id);
                }}
                disabled={creating}
                className="px-6 py-3 border border-gray-600 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                ← Previous
              </button>
            )}

            <div className={currentStep === 'basic' ? 'ml-auto' : ''}>
              {currentStep === 'review' ? (
                <button
                  type="submit"
                  disabled={creating}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating Tournament...' : 'Create Tournament'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex = Math.min(steps.length - 1, currentStepIndex + 1);
                    goToStep(steps[nextIndex].id);
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
