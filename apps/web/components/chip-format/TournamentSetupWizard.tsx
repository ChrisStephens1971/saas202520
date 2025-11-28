/**
 * Tournament Setup Wizard Component
 * Epic: UI-001 - Tournament Setup Form
 * Sprint 6 - Multi-step wizard for chip format tournaments
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

interface ChipFormatConfig {
  name: string;
  startDate: string;
  game: string;
  description: string;
  winnerChips: number;
  loserChips: number;
  qualificationRounds: number;
  finalsCount: number;
  pairingStrategy: 'random' | 'rating' | 'chip_diff';
  allowDuplicatePairings: boolean;
  tiebreaker: 'head_to_head' | 'rating' | 'random';
  maxPlayers?: number;
}

const defaultValues: ChipFormatConfig = {
  name: '',
  startDate: new Date().toISOString().split('T')[0],
  game: '',
  description: '',
  winnerChips: 3,
  loserChips: 1,
  qualificationRounds: 5,
  finalsCount: 8,
  pairingStrategy: 'random',
  allowDuplicatePairings: false,
  tiebreaker: 'head_to_head',
};

interface Props {
  onClose: () => void;
}

export default function TournamentSetupWizard({ onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChipFormatConfig>({
    defaultValues,
  });

  const formData = watch();

  const onSubmit = async (data: ChipFormatConfig) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          format: 'chip_format',
          chipConfig: {
            winnerChips: data.winnerChips,
            loserChips: data.loserChips,
            qualificationRounds: data.qualificationRounds,
            finalsCount: data.finalsCount,
            pairingStrategy: data.pairingStrategy,
            allowDuplicatePairings: data.allowDuplicatePairings,
            tiebreaker: data.tiebreaker,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to create tournament');

      const tournament = await response.json();
      router.push(`/tournaments/${tournament.id}/chip-format`);
      onClose();
    } catch (error) {
      console.error('Failed to create tournament:', error);
      toast.error('Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create Chip Format Tournament</h2>
              <p className="text-blue-100 mt-1">Step {currentStep} of 4</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold">
              ×
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-blue-800 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-semibold mb-4">Basic Tournament Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Name *
                </label>
                <input
                  {...register('name', { required: true })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Summer Championship 2025"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">Tournament name is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  {...register('startDate', { required: true })}
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Game *</label>
                <input
                  {...register('game', { required: true })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Chess, Go, Poker"
                />
                {errors.game && <p className="text-red-600 text-sm mt-1">Game is required</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your tournament..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Players (optional)
                </label>
                <input
                  {...register('maxPlayers', { valueAsNumber: true })}
                  type="number"
                  min="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>
          )}

          {/* Step 2: Chip Configuration */}
          {currentStep === 2 && (
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-semibold mb-4">Chip Format Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Winner Chips *
                  </label>
                  <input
                    {...register('winnerChips', { required: true, valueAsNumber: true, min: 1 })}
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Chips awarded to match winners</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loser Chips *
                  </label>
                  <input
                    {...register('loserChips', { required: true, valueAsNumber: true, min: 0 })}
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Chips awarded to match losers</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualification Rounds *
                  </label>
                  <input
                    {...register('qualificationRounds', {
                      required: true,
                      valueAsNumber: true,
                      min: 1,
                    })}
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Rounds before finals cutoff</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finals Count *
                  </label>
                  <input
                    {...register('finalsCount', { required: true, valueAsNumber: true, min: 2 })}
                    type="number"
                    min="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Players advancing to finals</p>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                <p className="text-sm text-blue-700">
                  <strong>Preview:</strong> Players will compete for {formData.qualificationRounds}{' '}
                  rounds. Winners earn {formData.winnerChips} chips, losers earn{' '}
                  {formData.loserChips} chips. Top {formData.finalsCount} players advance to finals.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Advanced Settings */}
          {currentStep === 3 && (
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-semibold mb-4">Advanced Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pairing Strategy *
                </label>
                <select
                  {...register('pairingStrategy')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="random">Random Pairing</option>
                  <option value="rating">Rating-Based Pairing</option>
                  <option value="chip_diff">Chip Difference Pairing</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  {formData.pairingStrategy === 'random' &&
                    'Players are paired randomly from the queue'}
                  {formData.pairingStrategy === 'rating' &&
                    'Players with similar ratings are paired together'}
                  {formData.pairingStrategy === 'chip_diff' &&
                    'Players with similar chip counts are paired'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiebreaker Method *
                </label>
                <select
                  {...register('tiebreaker')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="head_to_head">Head-to-Head Record</option>
                  <option value="rating">Player Rating</option>
                  <option value="random">Random</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Used when multiple players have the same chip count at finals cutoff
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  {...register('allowDuplicatePairings')}
                  type="checkbox"
                  id="allowDuplicates"
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="allowDuplicates" className="text-sm font-medium text-gray-700">
                  Allow duplicate pairings (players can face each other multiple times)
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-semibold mb-4">Review & Confirm</h3>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Basic Information</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-gray-600">Name:</dt>
                    <dd className="font-medium">{formData.name}</dd>
                    <dt className="text-gray-600">Game:</dt>
                    <dd className="font-medium">{formData.game}</dd>
                    <dt className="text-gray-600">Start Date:</dt>
                    <dd className="font-medium">
                      {new Date(formData.startDate).toLocaleDateString()}
                    </dd>
                    {formData.maxPlayers && (
                      <>
                        <dt className="text-gray-600">Max Players:</dt>
                        <dd className="font-medium">{formData.maxPlayers}</dd>
                      </>
                    )}
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Chip Configuration</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-gray-600">Winner Chips:</dt>
                    <dd className="font-medium text-green-600">{formData.winnerChips}</dd>
                    <dt className="text-gray-600">Loser Chips:</dt>
                    <dd className="font-medium text-blue-600">{formData.loserChips}</dd>
                    <dt className="text-gray-600">Qualification Rounds:</dt>
                    <dd className="font-medium">{formData.qualificationRounds}</dd>
                    <dt className="text-gray-600">Finals Count:</dt>
                    <dd className="font-medium">{formData.finalsCount}</dd>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Advanced Settings</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-gray-600">Pairing Strategy:</dt>
                    <dd className="font-medium capitalize">
                      {formData.pairingStrategy.replace('_', ' ')}
                    </dd>
                    <dt className="text-gray-600">Tiebreaker:</dt>
                    <dd className="font-medium capitalize">
                      {formData.tiebreaker.replace('_', ' ')}
                    </dd>
                    <dt className="text-gray-600">Duplicate Pairings:</dt>
                    <dd className="font-medium">
                      {formData.allowDuplicatePairings ? 'Allowed' : 'Not Allowed'}
                    </dd>
                  </dl>
                </div>
              </div>

              {formData.description && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                    {formData.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="p-6 border-t bg-gray-50 flex items-center justify-between rounded-b-lg">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    step === currentStep
                      ? 'bg-blue-600'
                      : step < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400"
              >
                {isSubmitting ? 'Creating...' : 'Create Tournament'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
