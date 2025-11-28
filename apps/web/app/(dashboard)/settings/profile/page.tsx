/**
 * Player Settings Page
 * Sprint 10 Week 2 - Day 4: Search & Settings
 *
 * Player profile settings with privacy controls and notification preferences.
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPlayerProfile } from '@/lib/player-profiles/services/player-profile-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileEditForm } from '@/components/player-profiles/ProfileEditForm';
import { PrivacySettingsForm } from '@/components/player-profiles/PrivacySettingsForm';
import { NotificationSettingsForm } from '@/components/player-profiles/NotificationSettingsForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Bell } from 'lucide-react';

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const tenantId = session.user.orgId;
  const userId = session.user.id;

  // Get player profile
  const profile = await getPlayerProfile(userId, tenantId, userId);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your player profile, privacy, and notifications
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your public player profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileEditForm profile={profile.profile} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control what information is visible to other players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrivacySettingsForm settings={profile.profile.privacySettings} playerId={userId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettingsForm
                preferences={profile.profile.notificationPreferences}
                playerId={userId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
