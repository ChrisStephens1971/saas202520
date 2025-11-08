'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'email' | 'sms';
}

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'match_ready',
    name: 'Match Ready',
    subject: 'Your match is ready',
    body: 'Hi {{playerName}}, your match at {{tableName}} is ready to start.',
    type: 'sms',
  },
  {
    id: 'tournament_start',
    name: 'Tournament Starting',
    subject: 'Tournament {{tournamentName}} is starting',
    body: 'Hi {{playerName}}, the tournament {{tournamentName}} is about to start. Please check in.',
    type: 'email',
  },
  {
    id: 'match_result',
    name: 'Match Result',
    subject: 'Match result: {{outcome}}',
    body: 'Your match has ended. Result: {{outcome}}. Next match: {{nextMatch}}',
    type: 'sms',
  },
];

export default function NotificationSettingsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);

  // Notification preferences
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Test notification
  const [testRecipient, setTestRecipient] = useState('');
  const [testType, _setTestType] = useState<'email' | 'sms'>('email');
  const [isSendingTest, setSendingTest] = useState(false);

  // Fetch notification settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setEmailEnabled(data.settings?.enableEmailNotifications !== false);
        setSmsEnabled(data.settings?.enableSmsNotifications !== false);
        setPushEnabled(data.settings?.enablePushNotifications || false);
      } catch (error) {
        console.error('Error fetching notification settings:', error);
      }
    }

    fetchSettings();
  }, []);

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setSaving(true);
      // Update template in state
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedTemplate.id ? selectedTemplate : t))
      );
      setIsEditing(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testRecipient) return;

    try {
      setSendingTest(true);
      const response = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: testRecipient,
          type: testType,
          templateId: selectedTemplate?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to send test notification');
      alert('Test notification sent successfully!');
      setTestRecipient('');
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification');
    } finally {
      setSendingTest(false);
    }
  };

  const handleToggleNotification = async (
    type: 'email' | 'sms' | 'push',
    enabled: boolean
  ) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [`enable${type.charAt(0).toUpperCase() + type.slice(1)}Notifications`]: enabled,
        }),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      if (type === 'email') setEmailEnabled(enabled);
      if (type === 'sms') setSmsEnabled(enabled);
      if (type === 'push') setPushEnabled(enabled);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/settings"
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
              >
                ← Back to Settings
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
              <p className="mt-2 text-sm text-gray-600">
                Configure notification preferences and templates
              </p>
            </div>
          </div>
        </div>

        {/* Notification Toggles */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Channels
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-500">
                  Send notifications via email
                </p>
              </div>
              <button
                onClick={() => handleToggleNotification('email', !emailEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${emailEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">SMS Notifications</h3>
                <p className="text-sm text-gray-500">
                  Send notifications via SMS (Twilio)
                </p>
              </div>
              <button
                onClick={() => handleToggleNotification('sms', !smsEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${smsEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${smsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Push Notifications
                </h3>
                <p className="text-sm text-gray-500">
                  Send browser push notifications
                </p>
              </div>
              <button
                onClick={() => handleToggleNotification('push', !pushEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${pushEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template List */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notification Templates
            </h2>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.type.toUpperCase()}
                      </p>
                    </div>
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Editor */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isEditing ? 'Edit Template' : 'Template Preview'}
                  </h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate.name}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    {selectedTemplate.type === 'email' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={selectedTemplate.subject}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              subject: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Body
                      </label>
                      <textarea
                        value={selectedTemplate.body}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            body: e.target.value,
                          })
                        }
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Available variables: {'{'}playerName{'}'}, {'{'}tournamentName
                        {'}'}, {'{'}tableName{'}'}, {'{'}outcome{'}'}, {'{'}nextMatch{'}'}
                      </p>
                    </div>

                    <button
                      onClick={handleSaveTemplate}
                      disabled={isSaving}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <div className="text-sm text-gray-900">
                        {selectedTemplate.type.toUpperCase()}
                      </div>
                    </div>

                    {selectedTemplate.type === 'email' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <div className="text-sm text-gray-900">
                          {selectedTemplate.subject}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Body
                      </label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap font-mono">
                        {selectedTemplate.body}
                      </div>
                    </div>

                    {/* Send Test */}
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        Send Test Notification
                      </h3>
                      <div className="space-y-3">
                        <input
                          type={testType === 'email' ? 'email' : 'tel'}
                          value={testRecipient}
                          onChange={(e) => setTestRecipient(e.target.value)}
                          placeholder={
                            testType === 'email'
                              ? 'email@example.com'
                              : '+1234567890'
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button
                          onClick={handleSendTest}
                          disabled={!testRecipient || isSendingTest}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          {isSendingTest ? 'Sending...' : 'Send Test'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Select a template to view or edit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
