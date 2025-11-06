/**
 * Achievement Definitions Seed Data
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * Seeds the database with 20 predefined achievements across 4 categories:
 * - PARTICIPATION: Playing tournaments and showing up
 * - PERFORMANCE: Winning and competitive achievements
 * - ENGAGEMENT: Social and community engagement
 * - FORMAT_MASTERY: Mastering specific tournament formats
 *
 * Tiers: BRONZE, SILVER, GOLD, PLATINUM
 * Points: 10 (Bronze) to 100 (Platinum)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AchievementDefinitionData {
  code: string;
  name: string;
  description: string;
  category: 'PARTICIPATION' | 'PERFORMANCE' | 'ENGAGEMENT' | 'FORMAT_MASTERY';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  requirements: Record<string, any>;
  points: number;
  iconUrl?: string;
  badgeUrl?: string;
  isActive: boolean;
}

const achievementDefinitions: AchievementDefinitionData[] = [
  // ============================================================================
  // PARTICIPATION ACHIEVEMENTS
  // ============================================================================
  {
    code: 'FIRST_STEPS',
    name: 'First Steps',
    description: 'Complete your first tournament',
    category: 'PARTICIPATION',
    tier: 'BRONZE',
    requirements: {
      type: 'tournament_count',
      value: 1,
    },
    points: 10,
    isActive: true,
  },
  {
    code: 'PARTICIPANT',
    name: 'Participant',
    description: 'Play in 5 tournaments',
    category: 'PARTICIPATION',
    tier: 'BRONZE',
    requirements: {
      type: 'tournament_count',
      value: 5,
    },
    points: 20,
    isActive: true,
  },
  {
    code: 'REGULAR',
    name: 'Regular',
    description: 'Play in 25 tournaments',
    category: 'PARTICIPATION',
    tier: 'SILVER',
    requirements: {
      type: 'tournament_count',
      value: 25,
    },
    points: 40,
    isActive: true,
  },
  {
    code: 'VETERAN',
    name: 'Veteran',
    description: 'Play in 100 tournaments',
    category: 'PARTICIPATION',
    tier: 'GOLD',
    requirements: {
      type: 'tournament_count',
      value: 100,
    },
    points: 60,
    isActive: true,
  },
  {
    code: 'EARLY_BIRD',
    name: 'Early Bird',
    description: 'Register 24 hours before tournament start',
    category: 'PARTICIPATION',
    tier: 'BRONZE',
    requirements: {
      type: 'early_registration',
      hours_before: 24,
    },
    points: 15,
    isActive: true,
  },

  // ============================================================================
  // PERFORMANCE ACHIEVEMENTS
  // ============================================================================
  {
    code: 'WINNER',
    name: 'Winner',
    description: 'Win your first tournament',
    category: 'PERFORMANCE',
    tier: 'BRONZE',
    requirements: {
      type: 'tournament_wins',
      value: 1,
    },
    points: 25,
    isActive: true,
  },
  {
    code: 'CHAMPION',
    name: 'Champion',
    description: 'Win 5 tournaments',
    category: 'PERFORMANCE',
    tier: 'SILVER',
    requirements: {
      type: 'tournament_wins',
      value: 5,
    },
    points: 50,
    isActive: true,
  },
  {
    code: 'DYNASTY',
    name: 'Dynasty',
    description: 'Win 20 tournaments',
    category: 'PERFORMANCE',
    tier: 'GOLD',
    requirements: {
      type: 'tournament_wins',
      value: 20,
    },
    points: 75,
    isActive: true,
  },
  {
    code: 'UNDEFEATED',
    name: 'Undefeated',
    description: 'Win a tournament without losing a match',
    category: 'PERFORMANCE',
    tier: 'GOLD',
    requirements: {
      type: 'tournament_perfect',
      win_rate: 100,
    },
    points: 70,
    isActive: true,
  },
  {
    code: 'COMEBACK_KID',
    name: 'Comeback Kid',
    description: 'Win from elimination bracket after losing',
    category: 'PERFORMANCE',
    tier: 'SILVER',
    requirements: {
      type: 'loser_bracket_win',
      bracket: 'losers',
    },
    points: 45,
    isActive: true,
  },
  {
    code: 'PERFECTIONIST',
    name: 'Perfectionist',
    description: 'Win all matches in a tournament',
    category: 'PERFORMANCE',
    tier: 'GOLD',
    requirements: {
      type: 'all_matches_won',
      win_rate: 100,
    },
    points: 65,
    isActive: true,
  },
  {
    code: 'UNDERDOG',
    name: 'Underdog',
    description: 'Win as the lowest seeded player',
    category: 'PERFORMANCE',
    tier: 'PLATINUM',
    requirements: {
      type: 'lowest_seed_win',
      seed_position: 'last',
    },
    points: 100,
    isActive: true,
  },

  // ============================================================================
  // ENGAGEMENT ACHIEVEMENTS
  // ============================================================================
  {
    code: 'SOCIAL_BUTTERFLY',
    name: 'Social Butterfly',
    description: 'Play against 50 unique opponents',
    category: 'ENGAGEMENT',
    tier: 'SILVER',
    requirements: {
      type: 'unique_opponents',
      value: 50,
    },
    points: 40,
    isActive: true,
  },
  {
    code: 'RIVAL',
    name: 'Rival',
    description: 'Play the same opponent 10 or more times',
    category: 'ENGAGEMENT',
    tier: 'BRONZE',
    requirements: {
      type: 'repeated_opponent',
      value: 10,
    },
    points: 30,
    isActive: true,
  },
  {
    code: 'GLOBETROTTER',
    name: 'Globetrotter',
    description: 'Play at 5 different venues',
    category: 'ENGAGEMENT',
    tier: 'SILVER',
    requirements: {
      type: 'unique_venues',
      value: 5,
    },
    points: 35,
    isActive: true,
  },
  {
    code: 'MARATHON',
    name: 'Marathon',
    description: 'Complete a tournament lasting 10+ hours',
    category: 'ENGAGEMENT',
    tier: 'GOLD',
    requirements: {
      type: 'tournament_duration',
      hours: 10,
    },
    points: 55,
    isActive: true,
  },
  {
    code: 'LUCKY_13',
    name: 'Lucky 13',
    description: 'Finish in exactly 13th place',
    category: 'ENGAGEMENT',
    tier: 'BRONZE',
    requirements: {
      type: 'exact_placement',
      placement: 13,
    },
    points: 13,
    isActive: true,
  },

  // ============================================================================
  // FORMAT_MASTERY ACHIEVEMENTS
  // ============================================================================
  {
    code: 'DOMINANT',
    name: 'Dominant',
    description: 'Win 10 tournaments in the same format',
    category: 'FORMAT_MASTERY',
    tier: 'GOLD',
    requirements: {
      type: 'format_wins',
      value: 10,
      same_format: true,
    },
    points: 70,
    isActive: true,
  },
  {
    code: 'SPECIALIST',
    name: 'Specialist',
    description: 'Achieve 80%+ win rate in one format (min 20 matches)',
    category: 'FORMAT_MASTERY',
    tier: 'PLATINUM',
    requirements: {
      type: 'format_win_rate',
      win_rate: 80,
      min_matches: 20,
      same_format: true,
    },
    points: 90,
    isActive: true,
  },
  {
    code: 'ALL_ROUNDER',
    name: 'All-Rounder',
    description: 'Play in 5 different tournament formats',
    category: 'FORMAT_MASTERY',
    tier: 'SILVER',
    requirements: {
      type: 'unique_formats',
      value: 5,
    },
    points: 45,
    isActive: true,
  },
];

async function seedAchievementDefinitions() {
  console.log('🌱 Seeding achievement definitions...');

  try {
    // Delete existing achievements (for clean slate during development)
    // CAUTION: Comment out in production to preserve player achievements
    const deleteResult = await prisma.achievementDefinition.deleteMany({});
    console.log(`   Deleted ${deleteResult.count} existing achievement definitions`);

    // Insert new achievement definitions
    let createdCount = 0;
    for (const achievement of achievementDefinitions) {
      await prisma.achievementDefinition.create({
        data: achievement,
      });
      createdCount++;
      console.log(`   ✓ Created: ${achievement.code} (${achievement.tier})`);
    }

    console.log(`\n✅ Successfully seeded ${createdCount} achievement definitions`);

    // Display summary by category
    const summary = achievementDefinitions.reduce(
      (acc, achievement) => {
        acc[achievement.category] = (acc[achievement.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n📊 Summary by Category:');
    Object.entries(summary).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} achievements`);
    });

    // Display summary by tier
    const tierSummary = achievementDefinitions.reduce(
      (acc, achievement) => {
        acc[achievement.tier] = (acc[achievement.tier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n🏆 Summary by Tier:');
    Object.entries(tierSummary).forEach(([tier, count]) => {
      console.log(`   ${tier}: ${count} achievements`);
    });

    // Calculate total points available
    const totalPoints = achievementDefinitions.reduce(
      (sum, achievement) => sum + achievement.points,
      0
    );
    console.log(`\n💎 Total Points Available: ${totalPoints}`);
  } catch (error) {
    console.error('❌ Error seeding achievement definitions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAchievementDefinitions()
  .catch((error) => {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  });

export { achievementDefinitions, seedAchievementDefinitions };
