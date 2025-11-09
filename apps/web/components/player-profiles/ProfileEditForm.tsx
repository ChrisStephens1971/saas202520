/**
 * Profile Edit Form Component
 * Sprint 10 Week 2 - Day 4: Search & Settings
 */

'use client';

import { useState } from 'react';
import { PlayerProfile } from '@/lib/player-profiles/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ProfileEditFormProps {
  profile: PlayerProfile;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: profile.bio || '',
    location: profile.location || '',
    skillLevel: profile.skillLevel,
    photoUrl: profile.photoUrl || '',
    socialLinks: {
      twitter: profile.socialLinks?.twitter || '',
      website: profile.socialLinks?.website || '',
      instagram: profile.socialLinks?.instagram || '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/players/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        router.refresh();
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bio */}
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Tell others about yourself..."
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1">{formData.bio.length}/500 characters</p>
      </div>

      {/* Location */}
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="City, State or Country"
        />
      </div>

      {/* Skill Level */}
      <div>
        <Label htmlFor="skillLevel">Skill Level</Label>
        <Select value={formData.skillLevel} onValueChange={(value: string) => setFormData({ ...formData, skillLevel: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BEGINNER">Beginner</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
            <SelectItem value="ADVANCED">Advanced</SelectItem>
            <SelectItem value="EXPERT">Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Photo URL */}
      <div>
        <Label htmlFor="photoUrl">Photo URL</Label>
        <Input
          id="photoUrl"
          value={formData.photoUrl}
          onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
          placeholder="https://example.com/photo.jpg"
        />
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <Label>Social Links</Label>
        <div className="space-y-2">
          <Input
            placeholder="Twitter profile URL"
            value={formData.socialLinks.twitter}
            onChange={(e) =>
              setFormData({
                ...formData,
                socialLinks: { ...formData.socialLinks, twitter: e.target.value },
              })
            }
          />
          <Input
            placeholder="Website URL"
            value={formData.socialLinks.website}
            onChange={(e) =>
              setFormData({
                ...formData,
                socialLinks: { ...formData.socialLinks, website: e.target.value },
              })
            }
          />
          <Input
            placeholder="Instagram profile URL"
            value={formData.socialLinks.instagram}
            onChange={(e) =>
              setFormData({
                ...formData,
                socialLinks: { ...formData.socialLinks, instagram: e.target.value },
              })
            }
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
