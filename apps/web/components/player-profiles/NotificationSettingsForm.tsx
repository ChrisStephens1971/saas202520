/**
 * Notification Settings Form Component
 * Sprint 10 Week 2 - Day 4: Search & Settings
 */

'use client';

import { useState } from 'react';
import { NotificationPreferences } from '@/lib/player-profiles/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface NotificationSettingsFormProps {
  preferences: NotificationPreferences;
  playerId: string;
}

export function NotificationSettingsForm({ preferences, playerId: _playerId }: NotificationSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NotificationPreferences>(preferences);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/players/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationPreferences: formData,
        }),
      });

      if (response.ok) {
        toast.success('Notification preferences updated');
        router.refresh();
      } else {
        toast.error('Failed to update preferences');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notification Channels */}
      <div className="space-y-4">
        <h3 className="font-semibold">Notification Channels</h3>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="email">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
          </div>
          <Switch id="email" checked={formData.email} onCheckedChange={(checked: boolean) => setFormData({ ...formData, email: checked })} />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="sms">SMS Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive text message notifications</p>
          </div>
          <Switch id="sms" checked={formData.sms} onCheckedChange={(checked: boolean) => setFormData({ ...formData, sms: checked })} />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="push">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
          </div>
          <Switch id="push" checked={formData.push} onCheckedChange={(checked: boolean) => setFormData({ ...formData, push: checked })} />
        </div>
      </div>

      {/* Notification Categories */}
      <div className="space-y-4">
        <h3 className="font-semibold">Notification Categories</h3>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="tournaments">Tournament Notifications</Label>
            <p className="text-sm text-muted-foreground">Registration confirmations, tournament updates</p>
          </div>
          <Switch
            id="tournaments"
            checked={formData.categories.tournaments}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                categories: { ...formData.categories, tournaments: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="matches">Match Notifications</Label>
            <p className="text-sm text-muted-foreground">Match assignments, results, table calls</p>
          </div>
          <Switch
            id="matches"
            checked={formData.categories.matches}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                categories: { ...formData.categories, matches: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="achievements">Achievement Notifications</Label>
            <p className="text-sm text-muted-foreground">New achievements unlocked</p>
          </div>
          <Switch
            id="achievements"
            checked={formData.categories.achievements}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                categories: { ...formData.categories, achievements: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="social">Social Notifications</Label>
            <p className="text-sm text-muted-foreground">Comments, messages, and interactions</p>
          </div>
          <Switch
            id="social"
            checked={formData.categories.social}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                categories: { ...formData.categories, social: checked },
              })
            }
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Notification Preferences'}
      </Button>
    </form>
  );
}
