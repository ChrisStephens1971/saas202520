/**
 * Privacy Settings Form Component
 * Sprint 10 Week 2 - Day 4: Search & Settings
 */

'use client';

import { useState } from 'react';
import { PrivacySettings } from '@/lib/player-profiles/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PrivacySettingsFormProps {
  settings: PrivacySettings;
  playerId: string;
}

export function PrivacySettingsForm({ settings, playerId: _playerId }: PrivacySettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PrivacySettings>(settings);

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
          privacySettings: formData,
        }),
      });

      if (response.ok) {
        toast.success('Privacy settings updated');
        router.refresh();
      } else {
        toast.error('Failed to update settings');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Profile Public */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="profilePublic">Public Profile</Label>
            <p className="text-sm text-muted-foreground">Make your profile visible to all players</p>
          </div>
          <Switch
            id="profilePublic"
            checked={formData.profilePublic}
            onCheckedChange={(checked) => setFormData({ ...formData, profilePublic: checked })}
          />
        </div>

        {/* Show Stats */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="showStats">Show Statistics</Label>
            <p className="text-sm text-muted-foreground">Display your win rate and performance metrics</p>
          </div>
          <Switch
            id="showStats"
            checked={formData.showStats}
            onCheckedChange={(checked) => setFormData({ ...formData, showStats: checked })}
            disabled={!formData.profilePublic}
          />
        </div>

        {/* Show History */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="showHistory">Show Match History</Label>
            <p className="text-sm text-muted-foreground">Allow others to see your past matches</p>
          </div>
          <Switch
            id="showHistory"
            checked={formData.showHistory}
            onCheckedChange={(checked) => setFormData({ ...formData, showHistory: checked })}
            disabled={!formData.profilePublic}
          />
        </div>

        {/* Show Achievements */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="showAchievements">Show Achievements</Label>
            <p className="text-sm text-muted-foreground">Display your unlocked achievements</p>
          </div>
          <Switch
            id="showAchievements"
            checked={formData.showAchievements || false}
            onCheckedChange={(checked) => setFormData({ ...formData, showAchievements: checked })}
            disabled={!formData.profilePublic}
          />
        </div>

        {/* Show Location */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="showLocation">Show Location</Label>
            <p className="text-sm text-muted-foreground">Display your city or region</p>
          </div>
          <Switch
            id="showLocation"
            checked={formData.showLocation || false}
            onCheckedChange={(checked) => setFormData({ ...formData, showLocation: checked })}
            disabled={!formData.profilePublic}
          />
        </div>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> When your profile is private, only you can see your statistics, match history, and achievements.
          Tournament organizers can always see your registration and match information.
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Privacy Settings'}
      </Button>
    </form>
  );
}
