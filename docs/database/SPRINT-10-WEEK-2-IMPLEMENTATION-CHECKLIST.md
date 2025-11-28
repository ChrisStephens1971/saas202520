# Sprint 10 Week 2 - Implementation Checklist

**Sprint:** Sprint 10 Week 2
**Feature:** Player Profiles & Enhanced Experience
**Date:** 2025-11-06
**Status:** Ready to Start

---

## Pre-Implementation Checklist

### Prerequisites

- [ ] Sprint 10 Week 1 (Analytics) is complete and tested
- [ ] Database backup created (pre-migration backup)
- [ ] All team members aware of deployment window
- [ ] Staging environment ready for testing
- [ ] Monitoring dashboards prepared

### Documentation Review

- [ ] Read `PLAYER-PROFILES-SCHEMA.md` - Complete schema reference
- [ ] Read `PLAYER-PROFILES-INDEX-STRATEGY.md` - Query optimization guide
- [ ] Read `PLAYER-PROFILES-QUICK-REFERENCE.md` - Developer quick reference
- [ ] Read `SPRINT-10-WEEK-2-DATABASE-SUMMARY.md` - Implementation summary

---

## Day 1: Database Migration & Seeding

### Morning (9:00 AM - 12:00 PM)

#### Task 1: Create Database Backup (30 minutes)

```bash
# Create backup before migration
pg_dump -U postgres -d tournament_platform -F c -b -v -f "backups/pre_sprint10_week2_$(date +%Y%m%d).backup"
```

- [ ] Backup created successfully
- [ ] Backup file verified (check file size)
- [ ] Backup stored in safe location
- [ ] Backup restoration tested (if time permits)

---

#### Task 2: Run Migration in Development (1 hour)

```bash
# Navigate to project directory
cd /c/devop/saas202520

# Review migration SQL
cat prisma/migrations/20251106_add_player_profiles/migration.sql

# Apply migration (development)
psql -U postgres -d tournament_platform_dev < prisma/migrations/20251106_add_player_profiles/migration.sql

# Or using Prisma
npx prisma migrate deploy
```

**Verification:**

- [ ] All 7 tables created
- [ ] All indexes created (check count)
- [ ] No errors in migration output
- [ ] Tables visible in database

**Verify Tables:**

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'player_%'
ORDER BY tablename;
```

**Expected Output:**

```
head_to_head_records
match_history
player_achievements
player_profiles
player_settings
player_statistics
```

Plus: `achievement_definitions`

**Verify Indexes:**

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'player_%'
ORDER BY tablename, indexname;
```

- [ ] player_profiles: 4 indexes
- [ ] player_statistics: 5 indexes
- [ ] achievement_definitions: 4 indexes
- [ ] player_achievements: 4 indexes
- [ ] match_history: 4 indexes
- [ ] head_to_head_records: 4 indexes
- [ ] player_settings: 3 indexes

**Total:** ~32 indexes (including primary keys)

---

#### Task 3: Test Sample Queries (30 minutes)

```sql
-- Test 1: Create sample player profile
INSERT INTO player_profiles (id, player_id, tenant_id, bio, skill_level, privacy_settings, notification_preferences)
VALUES ('test_profile_1', 'test_player_1', 'test_tenant_1', 'Test bio', 'INTERMEDIATE', '{}', '{}');

-- Test 2: Create sample player statistics
INSERT INTO player_statistics (id, player_id, tenant_id, total_tournaments, total_wins, total_losses, win_rate)
VALUES ('test_stats_1', 'test_player_1', 'test_tenant_1', 10, 7, 3, 70.00);

-- Test 3: Query player profile with stats
SELECT
  pp.bio, pp.skill_level,
  ps.total_tournaments, ps.win_rate
FROM player_profiles pp
LEFT JOIN player_statistics ps ON pp.player_id = ps.player_id
WHERE pp.player_id = 'test_player_1';
```

- [ ] Insert queries successful
- [ ] Join queries work correctly
- [ ] Indexes being used (EXPLAIN ANALYZE)

---

### Afternoon (1:00 PM - 5:00 PM)

#### Task 4: Seed Achievement Definitions (30 minutes)

```bash
# Run achievement seed script
cd /c/devop/saas202520
npx ts-node prisma/seeds/achievement-definitions.ts
```

**Expected Output:**

```
🌱 Seeding achievement definitions...
   Deleted 0 existing achievement definitions
   ✓ Created: FIRST_STEPS (BRONZE)
   ✓ Created: PARTICIPANT (BRONZE)
   ...
✅ Successfully seeded 20 achievement definitions

📊 Summary by Category:
   PARTICIPATION: 5 achievements
   PERFORMANCE: 7 achievements
   ENGAGEMENT: 5 achievements
   FORMAT_MASTERY: 3 achievements

🏆 Summary by Tier:
   BRONZE: 5 achievements
   SILVER: 6 achievements
   GOLD: 7 achievements
   PLATINUM: 2 achievements

💎 Total Points Available: 990
```

**Verification:**

```sql
-- Verify all achievements seeded
SELECT
  category,
  tier,
  COUNT(*) as count
FROM achievement_definitions
GROUP BY category, tier
ORDER BY category, tier;
```

- [ ] 20 achievements created
- [ ] All categories present (4)
- [ ] All tiers present (4)
- [ ] Total points = 990
- [ ] All codes unique

**Test Achievement Lookup:**

```sql
SELECT code, name, tier, points, requirements
FROM achievement_definitions
WHERE code = 'FIRST_STEPS';
```

- [ ] Achievement found
- [ ] Requirements JSON valid
- [ ] Points correct (10)

---

#### Task 5: Create Backfill Script (2 hours)

Create `scripts/backfill-player-data.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillPlayerData() {
  console.log('Starting player data backfill...');

  // 1. Backfill player_statistics
  await backfillPlayerStatistics();

  // 2. Backfill match_history
  await backfillMatchHistory();

  // 3. Calculate head_to_head_records
  await calculateHeadToHead();

  // 4. Check and award achievements
  await checkAchievements();

  console.log('Backfill complete!');
}

async function backfillPlayerStatistics() {
  console.log('Backfilling player statistics...');

  const players = await prisma.player.findMany({
    include: {
      matchesAsPlayerA: { where: { state: 'completed' } },
      matchesAsPlayerB: { where: { state: 'completed' } },
    },
  });

  for (const player of players) {
    const allMatches = [...player.matchesAsPlayerA, ...player.matchesAsPlayerB];

    const wins = allMatches.filter((m) => m.winnerId === player.id).length;
    const losses = allMatches.length - wins;
    const winRate = allMatches.length > 0 ? (wins / allMatches.length) * 100 : 0;

    await prisma.playerStatistics.create({
      data: {
        playerId: player.id,
        tenantId: player.tournamentId, // Get from player's tournament
        totalTournaments: 0, // Calculate from tournament participation
        totalMatches: allMatches.length,
        totalWins: wins,
        totalLosses: losses,
        winRate: winRate,
        currentStreak: 0, // Calculate from recent matches
        longestStreak: 0, // Calculate from match history
        lastPlayedAt: new Date(),
      },
    });

    console.log(`  ✓ Created stats for ${player.name}`);
  }

  console.log(`Backfilled statistics for ${players.length} players`);
}

async function backfillMatchHistory() {
  console.log('Backfilling match history...');

  // Get all completed matches
  const matches = await prisma.match.findMany({
    where: { state: 'completed' },
    include: {
      tournament: true,
    },
  });

  for (const match of matches) {
    if (!match.playerAId || !match.playerBId) continue;

    // Create history record for player A
    await prisma.matchHistory.create({
      data: {
        matchId: match.id,
        playerId: match.playerAId,
        opponentId: match.playerBId,
        result: match.winnerId === match.playerAId ? 'WIN' : 'LOSS',
        score: match.score,
        tournamentId: match.tournamentId,
        tenantId: match.tournament.orgId,
        matchNumber: match.position,
        roundNumber: match.round,
        playedAt: match.completedAt || new Date(),
      },
    });

    // Create history record for player B
    await prisma.matchHistory.create({
      data: {
        matchId: match.id,
        playerId: match.playerBId,
        opponentId: match.playerAId,
        result: match.winnerId === match.playerBId ? 'WIN' : 'LOSS',
        score: match.score,
        tournamentId: match.tournamentId,
        tenantId: match.tournament.orgId,
        matchNumber: match.position,
        roundNumber: match.round,
        playedAt: match.completedAt || new Date(),
      },
    });
  }

  console.log(`Backfilled match history: ${matches.length * 2} records`);
}

async function calculateHeadToHead() {
  console.log('Calculating head-to-head records...');

  // Group matches by player pairs
  const matchHistory = await prisma.matchHistory.findMany({
    orderBy: { playedAt: 'asc' },
  });

  const h2hMap = new Map<string, any>();

  for (const match of matchHistory) {
    const [p1, p2] = [match.playerId, match.opponentId].sort();
    const key = `${match.tenantId}:${p1}:${p2}`;

    if (!h2hMap.has(key)) {
      h2hMap.set(key, {
        tenantId: match.tenantId,
        player1Id: p1,
        player2Id: p2,
        player1Wins: 0,
        player2Wins: 0,
        draws: 0,
        totalMatches: 0,
        lastPlayedAt: match.playedAt,
      });
    }

    const record = h2hMap.get(key);
    record.totalMatches++;
    record.lastPlayedAt = match.playedAt;

    if (match.result === 'WIN') {
      if (match.playerId === p1) {
        record.player1Wins++;
      } else {
        record.player2Wins++;
      }
    } else if (match.result === 'DRAW') {
      record.draws++;
    }
  }

  // Create H2H records
  for (const [key, record] of h2hMap.entries()) {
    record.favorsPlayer1 = record.player1Wins > record.player2Wins;

    await prisma.headToHeadRecord.create({
      data: record,
    });
  }

  console.log(`Created ${h2hMap.size} head-to-head records`);
}

async function checkAchievements() {
  console.log('Checking achievements...');

  // Get all achievements
  const achievements = await prisma.achievementDefinition.findMany();

  // Get all players with stats
  const players = await prisma.player.findMany({
    include: {
      statistics: true,
    },
  });

  for (const player of players) {
    if (!player.statistics) continue;

    for (const achievement of achievements) {
      const req = achievement.requirements as any;

      let shouldUnlock = false;

      // Check based on requirement type
      switch (req.type) {
        case 'tournament_count':
          shouldUnlock = player.statistics.totalTournaments >= req.value;
          break;

        case 'tournament_wins':
          // Count tournament wins (not just match wins)
          // This requires tournament winner tracking
          break;

        // Add more achievement checks...
      }

      if (shouldUnlock) {
        try {
          await prisma.playerAchievement.create({
            data: {
              playerId: player.id,
              tenantId: player.tournamentId,
              achievementId: achievement.id,
              metadata: { backfilled: true },
            },
          });
          console.log(`  ✓ Unlocked ${achievement.code} for ${player.name}`);
        } catch (error) {
          // Ignore duplicates
        }
      }
    }
  }

  console.log('Achievement check complete');
}

backfillPlayerData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] Backfill script created
- [ ] Script tested with sample data
- [ ] Error handling added
- [ ] Progress logging added

---

#### Task 6: Run Backfill Script (1 hour)

```bash
# Run backfill in development
npx ts-node scripts/backfill-player-data.ts
```

**Verification:**

```sql
-- Check player_statistics populated
SELECT COUNT(*) FROM player_statistics;

-- Check match_history populated
SELECT COUNT(*) FROM match_history;

-- Check head_to_head_records created
SELECT COUNT(*) FROM head_to_head_records;

-- Check achievements unlocked
SELECT COUNT(*) FROM player_achievements;
```

- [ ] Statistics created for all players
- [ ] Match history records created
- [ ] H2H records calculated
- [ ] Achievements awarded (if applicable)
- [ ] Data accuracy spot-checked

---

## Day 2: Integration & API Implementation

### Morning (9:00 AM - 12:00 PM)

#### Task 7: Update Prisma Schema (1 hour)

Copy models from `prisma/schema-additions/player-profiles.prisma` to main `prisma/schema.prisma`:

```bash
# Add models to main schema
# Then generate Prisma client
npx prisma generate
```

- [ ] Models added to schema.prisma
- [ ] Relations defined correctly
- [ ] Foreign keys added
- [ ] Prisma client generated
- [ ] TypeScript types available

---

#### Task 8: Create API Endpoints (3 hours)

Create the following API routes:

**1. Player Profile Endpoints**

- [ ] `GET /api/players/:id` - Get player profile
- [ ] `GET /api/players/:id/statistics` - Get player statistics
- [ ] `PATCH /api/players/:id/profile` - Update profile
- [ ] `PATCH /api/players/:id/settings` - Update settings

**2. Achievement Endpoints**

- [ ] `GET /api/players/:id/achievements` - Get player achievements
- [ ] `GET /api/achievements` - List all achievements
- [ ] `GET /api/achievements/:code` - Get achievement details

**3. Match History Endpoints**

- [ ] `GET /api/players/:id/history` - Get match history (paginated)
- [ ] `GET /api/players/:id/head-to-head/:opponentId` - Get H2H record

**4. Leaderboard Endpoints**

- [ ] `GET /api/leaderboards/win-rate` - Win rate leaderboard
- [ ] `GET /api/leaderboards/participation` - Participation leaderboard
- [ ] `GET /api/leaderboards/earnings` - Earnings leaderboard

---

### Afternoon (1:00 PM - 5:00 PM)

#### Task 9: Implement Privacy Checks (1 hour)

Create middleware for privacy enforcement:

```typescript
// lib/privacy.ts
export async function checkPlayerDataAccess(
  viewerId: string,
  playerId: string,
  dataType: 'profile' | 'statistics' | 'achievements' | 'history'
): Promise<boolean> {
  // Implementation from quick reference guide
}
```

- [ ] Privacy middleware created
- [ ] Applied to all player endpoints
- [ ] Tested with public/private profiles
- [ ] Admin override working

---

#### Task 10: Add Redis Caching (2 hours)

Implement caching for:

- [ ] Player profiles (5-minute TTL)
- [ ] Leaderboards (5-minute TTL)
- [ ] H2H records (10-minute TTL)
- [ ] Achievement definitions (1-hour TTL)

Cache invalidation on:

- [ ] Match completion
- [ ] Profile update
- [ ] Settings update
- [ ] Achievement unlock

---

#### Task 11: Write API Tests (2 hours)

Create tests:

- [ ] Player profile CRUD tests
- [ ] Leaderboard query tests
- [ ] Match history pagination tests
- [ ] Achievement unlock tests
- [ ] Privacy enforcement tests
- [ ] Multi-tenant isolation tests

---

## Day 3: Frontend Integration

### Morning (9:00 AM - 12:00 PM)

#### Task 12: Create UI Components (3 hours)

- [ ] PlayerProfileCard component
- [ ] StatsOverview component
- [ ] AchievementBadge component
- [ ] MatchHistoryTable component
- [ ] HeadToHeadRecord component
- [ ] LeaderboardTable component

---

### Afternoon (1:00 PM - 5:00 PM)

#### Task 13: Build Pages (4 hours)

- [ ] `/players/:id` - Player profile page
- [ ] `/players/:id/history` - Match history page
- [ ] `/players/:id/achievements` - Achievements page
- [ ] `/leaderboards` - Leaderboards page
- [ ] `/players/:id/settings` - Settings page

---

## Day 4-5: Testing & Optimization

### Day 4: Testing

- [ ] Unit tests for all API endpoints
- [ ] Integration tests for workflows
- [ ] E2E tests for user flows
- [ ] Performance testing (load tests)
- [ ] Multi-tenant isolation testing
- [ ] Privacy settings testing

### Day 5: Optimization & Deployment

- [ ] Query performance optimization
- [ ] Index usage verification
- [ ] Cache hit rate monitoring
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring dashboard setup

---

## Post-Deployment Checklist

### Immediate (Day 1 After Deployment)

- [ ] Monitor error rates
- [ ] Check query performance
- [ ] Verify cache hit rates
- [ ] Check disk space usage
- [ ] Monitor API response times

### Week 1 After Deployment

- [ ] Review slow query logs
- [ ] Analyze user engagement
- [ ] Check achievement unlock rates
- [ ] Monitor leaderboard usage
- [ ] Gather user feedback

### Week 2 After Deployment

- [ ] Performance tuning based on metrics
- [ ] Add missing achievements (if needed)
- [ ] Optimize cache strategy
- [ ] Review and update documentation
- [ ] Plan future enhancements

---

## Rollback Procedures

### If Critical Issues Arise

**1. Immediate Actions**

```bash
# Disable new features via feature flag
export PLAYER_PROFILES_ENABLED=false

# Restart application servers
```

**2. Database Rollback**

```bash
# Restore from backup
pg_restore -U postgres -d tournament_platform backups/pre_sprint10_week2_YYYYMMDD.backup

# Or drop tables
psql -U postgres -d tournament_platform < rollback.sql
```

**3. Code Rollback**

```bash
# Revert to previous commit
git revert <commit-hash>
git push origin master

# Redeploy
npm run deploy
```

---

## Success Criteria

### Technical Success

- [ ] All migrations successful (0 errors)
- [ ] All 20 achievements seeded correctly
- [ ] All indexes created and being used
- [ ] Query performance meets targets
- [ ] Multi-tenant isolation verified
- [ ] Privacy settings enforced correctly

### Business Success

- [ ] Players can view profiles
- [ ] Leaderboards display correctly
- [ ] Match history shows complete data
- [ ] Achievements unlock correctly
- [ ] H2H records accurate
- [ ] Settings save and apply

### Performance Success

- [ ] Profile load: <10ms (p95) ✓
- [ ] Leaderboard: <20ms (p95) ✓
- [ ] Match history: <15ms (p95) ✓
- [ ] H2H lookup: <5ms (p95) ✓
- [ ] Achievement check: <5ms (p95) ✓

---

## Contact Information

**Database Issues:**

- DBA: [Contact Info]
- Slack: #dev-database

**API Issues:**

- Backend Lead: [Contact Info]
- Slack: #dev-backend

**Frontend Issues:**

- Frontend Lead: [Contact Info]
- Slack: #dev-frontend

**Emergency:**

- On-Call Engineer: [Contact Info]
- PagerDuty: [Link]

---

## Resources

**Documentation:**

- Schema: `docs/database/PLAYER-PROFILES-SCHEMA.md`
- Index Strategy: `docs/database/PLAYER-PROFILES-INDEX-STRATEGY.md`
- Quick Reference: `docs/database/PLAYER-PROFILES-QUICK-REFERENCE.md`
- Summary: `docs/database/SPRINT-10-WEEK-2-DATABASE-SUMMARY.md`

**Implementation Files:**

- Prisma Schema: `prisma/schema-additions/player-profiles.prisma`
- Migration: `prisma/migrations/20251106_add_player_profiles/migration.sql`
- Seeds: `prisma/seeds/achievement-definitions.ts`

**Monitoring:**

- Query Performance: [Dashboard Link]
- Error Tracking: [Sentry Link]
- Uptime: [Status Page]

---

**Checklist Version:** 1.0
**Created:** 2025-11-06
**Status:** Ready to Execute
**Estimated Duration:** 5 days (40 hours)

---

**Good luck with implementation! 🚀**
