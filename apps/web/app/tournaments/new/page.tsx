'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type {
  TournamentFormat,
  GameType,
  CreateTournamentRequest,
} from '@tournament/api-contracts';

/**
 * Tournament Creation Form
 *
 * Allows owners and TDs to create new tournaments with:
 * - Auto-generated slugs from tournament name
 * - Real-time slug uniqueness validation
 * - Zod schema validation on submit
 * - All tournament configuration options
 *
 * Role requirements: owner or td
 */
export default function NewTournamentPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Form state
  const [formData, setFormData] = useState<Partial<CreateTournamentRequest>>({
    name: '',
    slug: '',
    description: '',
    format: 'single_elimination',
    sport: 'pool',
    gameType: 'eight-ball',
    raceToWins: 5,
    maxPlayers: undefined,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Permission check
  const canCreate = session?.user?.role === 'owner' || session?.user?.role === 'td';

  useEffect(() => {
    if (!canCreate && session) {
      router.push('/tournaments');
    }
  }, [canCreate, session, router]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugTouched && formData.name) {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, slugTouched]);

  // Check slug uniqueness (debounced)
  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        // Check if slug exists by trying to fetch tournaments
        const response = await fetch('/api/tournaments');
        if (response.ok) {
          const data = await response.json();
          const slugExists = data.tournaments.some(
            (t: { slug: string }) => t.slug === formData.slug
          );
          setSlugAvailable(!slugExists);
        }
      } catch (err) {
        console.error('Error checking slug:', err);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.slug]);

  // Handle form field changes
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    if (name === 'slug') {
      setSlugTouched(true);
    }

    setFormData(prev => ({
      ...prev,
      [name]:
        name === 'raceToWins' || name === 'maxPlayers'
          ? value === ''
            ? undefined
            : parseInt(value, 10)
          : value,
    }));
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.slug || !formData.gameType) {
        throw new Error('Please fill in all required fields');
      }

      // Check slug availability
      if (slugAvailable === false) {
        throw new Error('This slug is already taken. Please choose another.');
      }

      // Submit tournament
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to create tournament: ${response.statusText}`);
      }

      const data = await response.json();

      // Redirect to tournament detail page
      router.push(`/tournaments/${data.tournament.id}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
      setLoading(false);
    }
  }

  // Tournament format options
  const formatOptions: { value: TournamentFormat; label: string; description: string }[] = [
    {
      value: 'single_elimination',
      label: 'Single Elimination',
      description: 'Traditional bracket - lose once and you\'re out',
    },
    {
      value: 'double_elimination',
      label: 'Double Elimination',
      description: 'Winners + Losers brackets - two chances',
    },
    {
      value: 'round_robin',
      label: 'Round Robin',
      description: 'Everyone plays everyone',
    },
    {
      value: 'modified_single',
      label: 'Modified Single Elimination',
      description: 'Single elim with modifications (e.g., third-place match)',
    },
    {
      value: 'chip_format',
      label: 'Chip Format',
      description: 'Collect chips, top players advance',
    },
  ];

  // Game type options
  const gameTypeOptions: { value: GameType; label: string }[] = [
    { value: 'eight-ball', label: '8-Ball' },
    { value: 'nine-ball', label: '9-Ball' },
    { value: 'ten-ball', label: '10-Ball' },
    { value: 'straight-pool', label: 'Straight Pool (14.1)' },
  ];

  if (!canCreate) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/tournaments')}
            className="text-gray-300 hover:text-white mb-4 flex items-center"
          >
            ← Back to Tournaments
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Create Tournament</h1>
          <p className="text-gray-300">
            Set up a new tournament for your organization
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
          {/* Tournament Name */}
          <div className="mb-6">
            <label htmlFor="name" className="block text-white font-semibold mb-2">
              Tournament Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={255}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Summer Championship 2024"
            />
          </div>

          {/* Slug */}
          <div className="mb-6">
            <label htmlFor="slug" className="block text-white font-semibold mb-2">
              URL Slug <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                maxLength={100}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  slugAvailable === false
                    ? 'border-red-500'
                    : slugAvailable === true
                    ? 'border-green-500'
                    : 'border-white/20'
                }`}
                placeholder="summer-championship-2024"
              />
              {checkingSlug && (
                <div className="absolute right-3 top-3 text-gray-400">
                  <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                </div>
              )}
              {!checkingSlug && slugAvailable === true && (
                <div className="absolute right-3 top-3 text-green-400">✓</div>
              )}
              {!checkingSlug && slugAvailable === false && (
                <div className="absolute right-3 top-3 text-red-400">✗</div>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Lowercase letters, numbers, and hyphens only. Auto-generated from name.
            </p>
            {slugAvailable === false && (
              <p className="text-sm text-red-400 mt-1">
                This slug is already taken. Please choose another.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-white font-semibold mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              maxLength={2000}
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Tell players about this tournament..."
            />
            <p className="text-sm text-gray-400 mt-1">
              {(formData.description?.length || 0)} / 2000 characters
            </p>
          </div>

          {/* Tournament Format */}
          <div className="mb-6">
            <label htmlFor="format" className="block text-white font-semibold mb-2">
              Tournament Format <span className="text-red-400">*</span>
            </label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-400 mt-1">
              {formatOptions.find(o => o.value === formData.format)?.description}
            </p>
          </div>

          {/* Game Type */}
          <div className="mb-6">
            <label htmlFor="gameType" className="block text-white font-semibold mb-2">
              Game Type <span className="text-red-400">*</span>
            </label>
            <select
              id="gameType"
              name="gameType"
              value={formData.gameType}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {gameTypeOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Race to Wins */}
          <div className="mb-6">
            <label htmlFor="raceToWins" className="block text-white font-semibold mb-2">
              Race to Wins <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              id="raceToWins"
              name="raceToWins"
              value={formData.raceToWins}
              onChange={handleChange}
              required
              min={1}
              max={21}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-sm text-gray-400 mt-1">
              Number of games a player must win to win a match (1-21)
            </p>
          </div>

          {/* Max Players */}
          <div className="mb-8">
            <label htmlFor="maxPlayers" className="block text-white font-semibold mb-2">
              Max Players (Optional)
            </label>
            <input
              type="number"
              id="maxPlayers"
              name="maxPlayers"
              value={formData.maxPlayers || ''}
              onChange={handleChange}
              min={8}
              max={128}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Leave blank for no limit"
            />
            <p className="text-sm text-gray-400 mt-1">
              Maximum number of players allowed to register (8-128)
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/tournaments')}
              disabled={loading}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || slugAvailable === false}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
