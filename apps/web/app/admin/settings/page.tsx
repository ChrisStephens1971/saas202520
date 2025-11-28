'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SettingsForm, SettingsFormData } from '@/components/admin/SettingsForm';
import { FeatureToggle, FEATURE_FLAGS } from '@/components/admin/FeatureToggle';

type SettingsTab = 'general' | 'email' | 'security' | 'features' | 'performance';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SettingsFormData>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setSettings(data.settings || {});
        setFeatures(data.settings?.features || {});
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Save settings
  const handleSaveSettings = async (data: SettingsFormData) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const result = await response.json();
      setSettings(result.settings);
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving settings:', error);
      return Promise.reject(error);
    }
  };

  // Save feature flags
  const handleFeatureChange = async (featureId: string, enabled: boolean) => {
    try {
      const updatedFeatures = { ...features, [featureId]: enabled };
      setFeatures(updatedFeatures);

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: updatedFeatures }),
      });

      if (!response.ok) throw new Error('Failed to save feature flag');
    } catch (error) {
      console.error('Error saving feature flag:', error);
      setFeatures(features);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'email', label: 'Email' },
    { id: 'security', label: 'Security' },
    { id: 'features', label: 'Features' },
    { id: 'performance', label: 'Performance' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your organization system configuration and preferences
              </p>
            </div>
            <Link
              href="/admin/settings/notifications"
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Notification Settings
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div>
          {activeTab === 'features' ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Feature Flags</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Enable or disable features for your organization.
                </p>
              </div>
              <div className="space-y-0">
                {Object.entries(FEATURE_FLAGS).map(([_key, flag]) => (
                  <FeatureToggle
                    key={flag.id}
                    id={flag.id}
                    name={flag.name}
                    description={flag.description}
                    enabled={features[flag.id] || false}
                    onChange={(enabled) => handleFeatureChange(flag.id, enabled)}
                    impact={flag.impact}
                  />
                ))}
              </div>
            </div>
          ) : (
            <SettingsForm
              initialData={settings}
              onSave={handleSaveSettings}
              category={
                activeTab === 'general'
                  ? 'general'
                  : activeTab === 'email'
                    ? 'email'
                    : activeTab === 'security'
                      ? 'security'
                      : 'performance'
              }
            />
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/logs"
            className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Audit Logs</h3>
                <p className="mt-1 text-sm text-gray-500">View system activity</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
