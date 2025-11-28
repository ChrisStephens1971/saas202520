/**
 * Organization Selection Page
 *
 * This page is shown when:
 * 1. User logs in for the first time (no org selected)
 * 2. User wants to switch organizations
 * 3. Middleware redirects user without org to this page
 *
 * Features:
 * - List all user's organizations
 * - Create new organization
 * - Select/switch organization
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  userRole: 'owner' | 'td' | 'scorekeeper' | 'streamer';
};

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { update } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');

  // Fetch user's organizations
  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/organizations');

        if (!response.ok) {
          throw new Error('Failed to fetch organizations');
        }

        const data = await response.json();
        setOrganizations(data.organizations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, []);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewOrgName(name);
    // Generate slug: lowercase, replace spaces with hyphens, remove special chars
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setNewOrgSlug(slug);
  };

  // Select an organization
  const handleSelectOrganization = async (org: Organization) => {
    try {
      // Update session with new org context
      await update({
        orgId: org.id,
        orgSlug: org.slug,
        role: org.userRole,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch {
      setError('Failed to select organization');
    }
  };

  // Create new organization
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create organization');
      }

      const data = await response.json();
      const newOrg = data.organization;

      // Add to list
      setOrganizations([...organizations, newOrg]);

      // Auto-select new organization
      await handleSelectOrganization(newOrg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
      setCreating(false);
    }
  };

  // Render role badge
  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-blue-600 text-white',
      td: 'bg-green-600 text-white',
      scorekeeper: 'bg-yellow-600 text-white',
      streamer: 'bg-purple-600 text-white',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded ${colors[role as keyof typeof colors]}`}
      >
        {role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Select Organization</h1>
          <p className="text-slate-400">Choose an organization to continue, or create a new one</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-slate-800/50 backdrop-blur p-8 rounded-lg border border-slate-700 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading organizations...</p>
          </div>
        ) : (
          <>
            {/* Organizations List */}
            {organizations.length > 0 && !showCreateForm && (
              <div className="space-y-4 mb-6">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrganization(org)}
                    className="w-full bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700 hover:border-blue-500 hover:bg-slate-800/70 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">/{org.slug}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getRoleBadge(org.userRole)}
                        <svg
                          className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Organizations State */}
            {organizations.length === 0 && !showCreateForm && (
              <div className="bg-slate-800/50 backdrop-blur p-8 rounded-lg border border-slate-700 text-center mb-6">
                <div className="text-slate-400 text-5xl mb-4">🏢</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Organizations Yet</h3>
                <p className="text-slate-400 mb-6">Create your first organization to get started</p>
              </div>
            )}

            {/* Create Organization Form */}
            {showCreateForm && (
              <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Create New Organization</h3>
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                      Organization Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={newOrgName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g., Billiards Pro League"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-slate-300 mb-2">
                      URL Slug
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">/</span>
                      <input
                        id="slug"
                        type="text"
                        value={newOrgSlug}
                        onChange={(e) => setNewOrgSlug(e.target.value)}
                        placeholder="billiards-pro-league"
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={creating}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Lowercase letters, numbers, and hyphens only
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? 'Creating...' : 'Create Organization'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      disabled={creating}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Create Button (when not showing form) */}
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors border border-slate-600"
              >
                + Create New Organization
              </button>
            )}
          </>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Need help? Contact support at{' '}
            <a href="mailto:support@example.com" className="text-blue-400 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
