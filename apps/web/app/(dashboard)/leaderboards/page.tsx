/**
 * Leaderboards Page
 * Sprint 10 Week 2 - Day 3: UI Components
 *
 * Display player leaderboards across multiple categories.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPlayerLeaderboard } from '@/lib/player-profiles/services/player-profile-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Target, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function LeaderboardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const tenantId = session.user.organizationId;

  // Fetch all leaderboards
  const [winRateLeaderboard, tournamentsLeaderboard, prizesLeaderboard, achievementsLeaderboard] = await Promise.all([
    getPlayerLeaderboard(tenantId, 'winRate', 50),
    getPlayerLeaderboard(tenantId, 'tournaments', 50),
    getPlayerLeaderboard(tenantId, 'prizes', 50),
    getPlayerLeaderboard(tenantId, 'achievements', 50),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Leaderboards</h1>
        <p className="text-muted-foreground">Top players across different categories</p>
      </div>

      <Tabs defaultValue="winRate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="winRate" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Win Rate
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="prizes" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        {/* Win Rate Leaderboard */}
        <TabsContent value="winRate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Top Win Rate
              </CardTitle>
              <CardDescription>Players with the highest win percentages (min. 10 matches)</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable entries={winRateLeaderboard.entries} currentUserId={session.user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tournaments Leaderboard */}
        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Most Tournaments
              </CardTitle>
              <CardDescription>Players with the most tournament participation</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable entries={tournamentsLeaderboard.entries} currentUserId={session.user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prizes Leaderboard */}
        <TabsContent value="prizes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Highest Earnings
              </CardTitle>
              <CardDescription>Players with the most prize money won</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable entries={prizesLeaderboard.entries} currentUserId={session.user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Leaderboard */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                Most Achievements
              </CardTitle>
              <CardDescription>Players with the most unlocked achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable entries={achievementsLeaderboard.entries} currentUserId={session.user.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Leaderboard Table Component
interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  rank: number;
  photoUrl: string | null;
  skillLevel: string;
  formattedValue: string;
  change?: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No players on this leaderboard yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isCurrentUser = entry.playerId === currentUserId;
        const isTopThree = entry.rank <= 3;

        return (
          <div
            key={entry.playerId}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg transition-all hover:shadow-md',
              isCurrentUser ? 'bg-primary/10 border-2 border-primary' : 'bg-secondary hover:bg-secondary/80',
              isTopThree && !isCurrentUser && 'border-2 border-yellow-500/30'
            )}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-12">
              {entry.rank === 1 ? (
                <Trophy className="h-8 w-8 text-yellow-500" />
              ) : entry.rank === 2 ? (
                <Trophy className="h-7 w-7 text-gray-400" />
              ) : entry.rank === 3 ? (
                <Trophy className="h-6 w-6 text-amber-700" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">#{entry.rank}</span>
              )}
            </div>

            {/* Player Info */}
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={entry.photoUrl || undefined} alt={entry.playerName} />
                <AvatarFallback>{entry.playerName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{entry.playerName}</h3>
                  {isCurrentUser && (
                    <Badge variant="default" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{entry.skillLevel}</p>
              </div>
            </div>

            {/* Value */}
            <div className="text-right">
              <div className="text-2xl font-bold">{entry.formattedValue}</div>
              {entry.change !== undefined && entry.change !== 0 && (
                <div
                  className={cn('text-sm flex items-center gap-1', entry.change > 0 ? 'text-green-600' : 'text-red-600')}
                >
                  {entry.change > 0 ? '↑' : '↓'} {Math.abs(entry.change)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
