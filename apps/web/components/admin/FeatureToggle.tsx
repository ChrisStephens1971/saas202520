'use client';

import React from 'react';

interface FeatureToggleProps {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  impact?: 'low' | 'medium' | 'high';
  disabled?: boolean;
}

export function FeatureToggle({
  id,
  name,
  description,
  enabled,
  onChange,
  impact = 'medium',
  disabled = false,
}: FeatureToggleProps) {
  const impactColors = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-red-600 bg-red-50',
  };

  const impactLabels = {
    low: 'Low Impact',
    medium: 'Medium Impact',
    high: 'High Impact',
  };

  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex-1 pr-4">
        <div className="flex items-center space-x-2">
          <label htmlFor={id} className="text-sm font-medium text-gray-900 cursor-pointer">
            {name}
          </label>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${impactColors[impact]}`}
          >
            {impactLabels[impact]}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={disabled}
          onClick={() => onChange(!enabled)}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${enabled ? 'bg-blue-600' : 'bg-gray-200'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span className="sr-only">Toggle {name}</span>
          <span
            aria-hidden="true"
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
    </div>
  );
}

// Preset feature toggles for common features
export const FEATURE_FLAGS = {
  LIVE_SCORING: {
    id: 'liveScoring',
    name: 'Live Scoring',
    description: 'Enable real-time score updates and live match tracking',
    impact: 'medium' as const,
  },
  NOTIFICATIONS: {
    id: 'notifications',
    name: 'Notifications',
    description: 'Enable email and SMS notifications for players and admins',
    impact: 'low' as const,
  },
  PAYMENTS: {
    id: 'payments',
    name: 'Payment Processing',
    description: 'Enable Stripe payment integration for entry fees and payouts',
    impact: 'high' as const,
  },
  ANALYTICS: {
    id: 'analytics',
    name: 'Analytics',
    description: 'Enable advanced analytics and reporting features',
    impact: 'low' as const,
  },
  MULTI_TOURNAMENT: {
    id: 'multiTournament',
    name: 'Multi-Tournament View',
    description: 'Allow users to view and manage multiple tournaments simultaneously',
    impact: 'medium' as const,
  },
  API_ACCESS: {
    id: 'apiAccess',
    name: 'API Access',
    description: 'Enable third-party API access for integrations',
    impact: 'high' as const,
  },
  ADVANCED_FORMATS: {
    id: 'advancedFormats',
    name: 'Advanced Tournament Formats',
    description: 'Enable chip format, modified single elimination, and other advanced formats',
    impact: 'medium' as const,
  },
  KIOSK_MODE: {
    id: 'kioskMode',
    name: 'Kiosk Mode',
    description: 'Enable kiosk mode for self-service check-in and scoring',
    impact: 'low' as const,
  },
  TWO_FACTOR_AUTH: {
    id: 'twoFactorAuth',
    name: 'Two-Factor Authentication',
    description: 'Require 2FA for admin accounts',
    impact: 'high' as const,
  },
  CUSTOM_BRANDING: {
    id: 'customBranding',
    name: 'Custom Branding',
    description: 'Allow organizations to customize colors, logos, and branding',
    impact: 'low' as const,
  },
};
