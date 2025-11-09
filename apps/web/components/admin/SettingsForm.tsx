'use client';

import React, { useState, useEffect } from 'react';

export interface SettingsFormData {
  // General Settings
  siteName?: string;
  siteDescription?: string;
  timezone?: string;
  language?: string;

  // Email Settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;

  // Security Settings
  sessionTimeout?: number;
  require2FA?: boolean;
  passwordMinLength?: number;
  passwordRequireSpecialChar?: boolean;
  maxLoginAttempts?: number;
  lockoutDuration?: number;

  // Performance Settings
  cacheTTL?: number;
  rateLimit?: number;

  // Notification Settings
  enableEmailNotifications?: boolean;
  enableSmsNotifications?: boolean;
  enablePushNotifications?: boolean;
}

interface SettingsFormProps {
  initialData?: SettingsFormData;
  onSave: (data: SettingsFormData) => Promise<void>;
  onReset?: () => void;
  category?: 'general' | 'email' | 'security' | 'performance' | 'notifications';
}

export function SettingsForm({
  initialData = {},
  onSave,
  onReset,
  category = 'general',
}: SettingsFormProps) {
  const [formData, setFormData] = useState<SettingsFormData>(initialData);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasChanges(changed);
  }, [formData, initialData]);

  const handleChange = (field: keyof SettingsFormData, value: SettingsFormData[typeof field]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(formData);
      setSaveStatus('success');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(initialData);
    setHasChanges(false);
    setSaveStatus('idle');
    onReset?.();
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Site Name
        </label>
        <input
          type="text"
          value={formData.siteName || ''}
          onChange={(e) => handleChange('siteName', e.target.value)}
          placeholder="My Tournament Platform"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Site Description
        </label>
        <textarea
          value={formData.siteDescription || ''}
          onChange={(e) => handleChange('siteDescription', e.target.value)}
          placeholder="A brief description of your tournament platform"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
        </label>
        <select
          value={formData.timezone || 'America/New_York'}
          onChange={(e) => handleChange('timezone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="Europe/London">London (GMT)</option>
          <option value="Europe/Paris">Paris (CET)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Language
        </label>
        <select
          value={formData.language || 'en'}
          onChange={(e) => handleChange('language', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SMTP Host
        </label>
        <input
          type="text"
          value={formData.smtpHost || ''}
          onChange={(e) => handleChange('smtpHost', e.target.value)}
          placeholder="smtp.gmail.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SMTP Port
        </label>
        <input
          type="number"
          value={formData.smtpPort || ''}
          onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
          placeholder="587"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SMTP Username
        </label>
        <input
          type="text"
          value={formData.smtpUser || ''}
          onChange={(e) => handleChange('smtpUser', e.target.value)}
          placeholder="your-email@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SMTP Password
        </label>
        <input
          type="password"
          value={formData.smtpPassword || ''}
          onChange={(e) => handleChange('smtpPassword', e.target.value)}
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">Password will be encrypted</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          From Email
        </label>
        <input
          type="email"
          value={formData.smtpFromEmail || ''}
          onChange={(e) => handleChange('smtpFromEmail', e.target.value)}
          placeholder="noreply@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          From Name
        </label>
        <input
          type="text"
          value={formData.smtpFromName || ''}
          onChange={(e) => handleChange('smtpFromName', e.target.value)}
          placeholder="Tournament Platform"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Session Timeout (minutes)
        </label>
        <input
          type="number"
          value={formData.sessionTimeout || ''}
          onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
          placeholder="60"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="require2FA"
          checked={formData.require2FA || false}
          onChange={(e) => handleChange('require2FA', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="require2FA" className="ml-2 block text-sm text-gray-700">
          Require Two-Factor Authentication
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password Minimum Length
        </label>
        <input
          type="number"
          value={formData.passwordMinLength || 8}
          onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value))}
          min={6}
          max={32}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="passwordRequireSpecialChar"
          checked={formData.passwordRequireSpecialChar !== false}
          onChange={(e) => handleChange('passwordRequireSpecialChar', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="passwordRequireSpecialChar" className="ml-2 block text-sm text-gray-700">
          Require Special Characters in Password
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Login Attempts
        </label>
        <input
          type="number"
          value={formData.maxLoginAttempts || 5}
          onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
          min={3}
          max={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lockout Duration (minutes)
        </label>
        <input
          type="number"
          value={formData.lockoutDuration || ''}
          onChange={(e) => handleChange('lockoutDuration', parseInt(e.target.value))}
          placeholder="15"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );

  const renderPerformanceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cache TTL (seconds)
        </label>
        <input
          type="number"
          value={formData.cacheTTL || ''}
          onChange={(e) => handleChange('cacheTTL', parseInt(e.target.value))}
          placeholder="3600"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">How long to cache data (default: 3600s / 1 hour)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rate Limit (requests per minute)
        </label>
        <input
          type="number"
          value={formData.rateLimit || ''}
          onChange={(e) => handleChange('rateLimit', parseInt(e.target.value))}
          placeholder="60"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">Max API requests per minute per user</p>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <input
          type="checkbox"
          id="enableEmailNotifications"
          checked={formData.enableEmailNotifications !== false}
          onChange={(e) => handleChange('enableEmailNotifications', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="enableEmailNotifications" className="ml-2 block text-sm text-gray-700">
          Enable Email Notifications
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="enableSmsNotifications"
          checked={formData.enableSmsNotifications !== false}
          onChange={(e) => handleChange('enableSmsNotifications', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="enableSmsNotifications" className="ml-2 block text-sm text-gray-700">
          Enable SMS Notifications
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="enablePushNotifications"
          checked={formData.enablePushNotifications || false}
          onChange={(e) => handleChange('enablePushNotifications', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="enablePushNotifications" className="ml-2 block text-sm text-gray-700">
          Enable Push Notifications
        </label>
      </div>
    </div>
  );

  const renderCategory = () => {
    switch (category) {
      case 'general':
        return renderGeneralSettings();
      case 'email':
        return renderEmailSettings();
      case 'security':
        return renderSecuritySettings();
      case 'performance':
        return renderPerformanceSettings();
      case 'notifications':
        return renderNotificationSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {renderCategory()}

      {/* Action Buttons */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
        <div>
          {saveStatus === 'success' && (
            <span className="text-sm text-green-600 font-medium">
              Settings saved successfully!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-600 font-medium">
              Failed to save settings. Please try again.
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
