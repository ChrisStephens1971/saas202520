/**
 * Player Profile Page
 * Sprint 10 Week 2 - Day 3: UI Components
 *
 * Complete player profile with statistics, achievements, match history, and rivalries.
 * Multi-tenant with privacy controls.
 */

import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getPlayerProfile } from '@/lib/player-profiles/services/player-profile-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, TrendingUp, Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { AchievementGrid } from '@/components/player-profiles/AchievementGrid';
import { MatchHistoryTimeline } from '@/components/player-profiles/MatchHistoryTimeline';
import { StatCard } from '@/components/player-profiles/StatCard';

interface PlayerProfilePageProps {
  params: {
    id: string;
  };
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  const tenantId = session.user.orgId;
  const viewerId = session.user.id;

  // Fetch profile and handle errors before rendering
  let profile;
  try {
    profile = await getPlayerProfile(params.id, tenantId, viewerId);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'PROFILE_NOT_FOUND') {
      notFound();
    }
    if (err.code === 'PROFILE_PRIVATE') {
      return (
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Private Profile</h2>
              <p className="text-muted-foreground">This player&apos;s profile is set to private.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    throw error;
  }

  const isOwner = viewerId === params.id;
  const privacySettings = profile.profile.privacySettings;

  // Format dates
  const memberSince = new Date(profile.profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  // Calculate display values
  const winRate = parseFloat(profile.statistics.winRate.toString());
  const totalPrize = parseFloat(profile.statistics.totalPrizeWon.toString());

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={profile.profile.photoUrl || undefined} alt="Player photo" />
                <AvatarFallback className="text-3xl">
                  {params.id.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Badge variant="outline" className="mb-2">
                {profile.profile.skillLevel}
              </Badge>
            </div>

            {/* Profile Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Player Profile</h1>
                  <p className="text-muted-foreground flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    Member since {memberSince}
                  </p>
                  {profile.profile.location && (privacySettings.showLocation || isOwner) && (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {profile.profile.location}
                    </p>
                  )}
                </div>
                {isOwner && (
                  <a
                    href="/settings/profile"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Edit Profile
                  </a>
                )}
              </div>

              {/* Bio */}
              {profile.profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">{profile.profile.bio}</p>
              )}

              {/* Social Links */}
              {profile.profile.socialLinks && (
                <div className="flex gap-4 mt-4">
                  {profile.profile.socialLinks.twitter && (
                    <a
                      href={profile.profile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Twitter
                    </a>
                  )}
                  {profile.profile.socialLinks.website && (
                    <a
                      href={profile.profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {(privacySettings.showStats || isOwner) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Tournaments"
            value={profile.statistics.totalTournaments}
            icon={<Trophy className="h-5 w-5 text-yellow-500" />}
            description="Total played"
          />
          <StatCard
            title="Matches"
            value={profile.statistics.totalMatches}
            icon={<Target className="h-5 w-5 text-blue-500" />}
            description={`${profile.statistics.totalWins}W - ${profile.statistics.totalLosses}L`}
          />
          <StatCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            description={
              profile.statistics.currentStreak > 0
                ? `${profile.statistics.currentStreak} win streak`
                : profile.statistics.currentStreak < 0
                  ? `${Math.abs(profile.statistics.currentStreak)} loss streak`
                  : 'No streak'
            }
          />
          <StatCard
            title="Prize Money"
            value={`$${totalPrize.toFixed(2)}`}
            icon={<Trophy className="h-5 w-5 text-purple-500" />}
            description="Total winnings"
          />
        </div>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="matches">Match History</TabsTrigger>
          <TabsTrigger value="rivalries">Rivalries</TabsTrigger>
          <TabsTrigger value="stats">Detailed Stats</TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Trophy Case</CardTitle>
            </CardHeader>
            <CardContent>
              {(privacySettings.showAchievements || isOwner) && profile.achievements.length > 0 ? (
                <AchievementGrid achievements={profile.achievements} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {isOwner
                    ? 'No achievements yet. Keep playing to unlock them!'
                    : 'This player has no public achievements.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Match History Tab */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Match History</CardTitle>
            </CardHeader>
            <CardContent>
              {(privacySettings.showHistory || isOwner) && profile.recentMatches.length > 0 ? (
                <MatchHistoryTimeline matches={profile.recentMatches} playerId={params.id} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {isOwner ? 'No matches played yet.' : 'Match history is private.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rivalries Tab */}
        <TabsContent value="rivalries">
          <Card>
            <CardHeader>
              <CardTitle>Top Rivalries</CardTitle>
            </CardHeader>
            <CardContent>
              {(privacySettings.showHistory || isOwner) && profile.rivalries.length > 0 ? (
                <div className="space-y-4">
                  {profile.rivalries.map((rivalry, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Opponent</h3>
                        <Badge variant="outline">{rivalry.totalMatches} matches</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">{rivalry.wins}W</span>
                        <span className="text-red-600">{rivalry.losses}L</span>
                        {rivalry.draws > 0 && (
                          <span className="text-gray-600">{rivalry.draws}D</span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Win Rate: {rivalry.winRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Last played: {new Date(rivalry.lastPlayed).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {isOwner ? 'No rivalries yet.' : 'Rivalries are private.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Stats Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {privacySettings.showStats || isOwner ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Performance</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Win Rate</dt>
                        <dd className="font-medium">{winRate.toFixed(1)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Current Streak</dt>
                        <dd className="font-medium">
                          {profile.statistics.currentStreak > 0
                            ? `+${profile.statistics.currentStreak}`
                            : profile.statistics.currentStreak}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Longest Win Streak</dt>
                        <dd className="font-medium">{profile.statistics.longestStreak}</dd>
                      </div>
                      {profile.statistics.averageFinish && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Average Finish</dt>
                          <dd className="font-medium">
                            {parseFloat(profile.statistics.averageFinish.toString()).toFixed(1)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Activity</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Total Tournaments</dt>
                        <dd className="font-medium">{profile.statistics.totalTournaments}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Total Matches</dt>
                        <dd className="font-medium">{profile.statistics.totalMatches}</dd>
                      </div>
                      {profile.statistics.favoriteFormat && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Favorite Format</dt>
                          <dd className="font-medium">{profile.statistics.favoriteFormat}</dd>
                        </div>
                      )}
                      {profile.statistics.lastPlayedAt && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Last Played</dt>
                          <dd className="font-medium">
                            {new Date(profile.statistics.lastPlayedAt).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Statistics are private.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
