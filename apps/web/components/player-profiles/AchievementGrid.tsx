/**
 * AchievementGrid Component
 * Sprint 10 Week 2 - Day 3: UI Components
 *
 * Grid display of player achievements organized by category.
 */

'use client';

import { AchievementBadge } from './AchievementBadge';
import { PlayerAchievement } from '@/lib/player-profiles/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AchievementGridProps {
  achievements: PlayerAchievement[];
  className?: string;
}

const categoryLabels = {
  PARTICIPATION: 'Participation',
  PERFORMANCE: 'Performance',
  ENGAGEMENT: 'Engagement',
  FORMAT_MASTERY: 'Format Mastery',
};

export function AchievementGrid({ achievements, className }: AchievementGridProps) {
  // Group achievements by category
  const achievementsByCategory = achievements.reduce(
    (acc, achievement) => {
      const category = achievement.achievement.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    },
    {} as Record<string, PlayerAchievement[]>
  );

  // Get all categories
  const categories = Object.keys(achievementsByCategory);

  if (achievements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No achievements unlocked yet.</p>
        <p className="text-sm mt-2">Keep playing to earn your first achievement!</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-secondary rounded-lg">
          <div className="text-2xl font-bold">{achievements.length}</div>
          <div className="text-sm text-muted-foreground">Total Achievements</div>
        </div>
        {Object.entries(achievementsByCategory).map(([category, items]) => (
          <div key={category} className="text-center p-4 bg-secondary rounded-lg">
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-sm text-muted-foreground">{categoryLabels[category as keyof typeof categoryLabels]}</div>
          </div>
        ))}
      </div>

      {/* Tabbed Grid by Category */}
      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="all">All ({achievements.length})</TabsTrigger>
          {categories.slice(0, 3).map((category) => (
            <TabsTrigger key={category} value={category}>
              {categoryLabels[category as keyof typeof categoryLabels]} ({achievementsByCategory[category].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Achievements */}
        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {achievements
              .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
              .map((achievement) => (
                <div key={achievement.id} className="flex flex-col items-center">
                  <AchievementBadge achievement={achievement} size="md" />
                  <p className="text-sm font-medium text-center mt-2">{achievement.achievement.name}</p>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* Category-specific tabs */}
        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {achievementsByCategory[category]
                .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
                .map((achievement) => (
                  <div key={achievement.id} className="flex flex-col items-center">
                    <AchievementBadge achievement={achievement} size="md" />
                    <p className="text-sm font-medium text-center mt-2">{achievement.achievement.name}</p>
                  </div>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
