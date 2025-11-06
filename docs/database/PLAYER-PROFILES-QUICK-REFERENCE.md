# Player Profiles - Developer Quick Reference

**Sprint:** Sprint 10 Week 2
**Quick Access:** Common queries, patterns, and gotchas

---

## Table Quick Reference

| Table | Purpose | Key Columns | Common Queries |
|-------|---------|-------------|----------------|
| **player_profiles** | Bio, photo, social | player_id, bio, photo_url, skill_level | Profile display |
| **player_statistics** | Win/loss stats | player_id, win_rate, total_tournaments | Leaderboards |
| **achievement_definitions** | Achievement catalog | code, name, requirements | Unlock checks |
| **player_achievements** | Unlocked achievements | player_id, achievement_id, unlocked_at | Trophy case |
| **match_history** | All matches played | player_id, opponent_id, result, played_at | History timeline |
| **head_to_head_records** | Rivalry stats | player1_id, player2_id, wins | H2H records |
| **player_settings** | Privacy & preferences | player_id, is_profile_public, theme | Settings page |

---

## Common Query Snippets

### 1. Load Player Profile

```typescript
const profile = await prisma.player.findUnique({
  where: { id: playerId },
  include: {
    profile: true,
    statistics: true,
    settings: true,
    achievements: {
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 10
    }
  }
});
```

---

### 2. Top 10 Leaderboard

```typescript
const leaderboard = await prisma.playerStatistics.findMany({
  where: {
    tenantId,
    totalTournaments: { gte: 10 }
  },
  include: {
    player: {
      include: { profile: { select: { photoUrl: true } } }
    }
  },
  orderBy: [
    { winRate: 'desc' },
    { totalTournaments: 'desc' }
  ],
  take: 10
});
```

---

### 3. Match History (Paginated)

```typescript
const history = await prisma.matchHistory.findMany({
  where: {
    playerId,
    tenantId,
    ...(cursor && { playedAt: { lt: cursor } })
  },
  include: {
    tournament: { select: { name: true } },
    opponent: { select: { name: true } }
  },
  orderBy: { playedAt: 'desc' },
  take: 20
});
```

---

### 4. Head-to-Head Lookup

```typescript
// IMPORTANT: Always sort player IDs
const [p1, p2] = [playerA, playerB].sort();

const h2h = await prisma.headToHeadRecord.findUnique({
  where: {
    tenantId_player1Id_player2Id: {
      tenantId,
      player1Id: p1,
      player2Id: p2
    }
  }
});
```

---

### 5. Check Achievement Unlock

```typescript
const hasAchievement = await prisma.playerAchievement.findUnique({
  where: {
    playerId_achievementId: {
      playerId,
      achievementId
    }
  }
});

return hasAchievement !== null;
```

---

### 6. Unlock Achievement

```typescript
async function unlockAchievement(
  playerId: string,
  achievementCode: string,
  metadata?: any
) {
  try {
    const achievement = await prisma.achievementDefinition.findUnique({
      where: { code: achievementCode }
    });

    if (!achievement) throw new Error('Achievement not found');

    await prisma.playerAchievement.create({
      data: {
        playerId,
        tenantId,
        achievementId: achievement.id,
        metadata
      }
    });

    return true; // Newly unlocked
  } catch (error) {
    if (error.code === 'P2002') {
      return false; // Already unlocked
    }
    throw error;
  }
}
```

---

### 7. Update Player Statistics

```typescript
async function updatePlayerStats(playerId: string, matchResult: 'WIN' | 'LOSS') {
  const stats = await prisma.playerStatistics.findUnique({
    where: { playerId }
  });

  const isWin = matchResult === 'WIN';
  const newTotalMatches = stats.totalMatches + 1;
  const newTotalWins = stats.totalWins + (isWin ? 1 : 0);
  const newTotalLosses = stats.totalLosses + (isWin ? 0 : 1);
  const newWinRate = (newTotalWins / newTotalMatches) * 100;

  // Update current streak
  let newCurrentStreak = stats.currentStreak;
  if (isWin) {
    newCurrentStreak = stats.currentStreak >= 0 ? stats.currentStreak + 1 : 1;
  } else {
    newCurrentStreak = stats.currentStreak <= 0 ? stats.currentStreak - 1 : -1;
  }

  // Update longest streak
  const newLongestStreak = Math.max(stats.longestStreak, newCurrentStreak);

  await prisma.playerStatistics.update({
    where: { playerId },
    data: {
      totalMatches: newTotalMatches,
      totalWins: newTotalWins,
      totalLosses: newTotalLosses,
      winRate: newWinRate,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastPlayedAt: new Date()
    }
  });
}
```

---

### 8. Update Head-to-Head Record

```typescript
async function updateHeadToHead(
  player1Id: string,
  player2Id: string,
  winnerId: string,
  tenantId: string
) {
  // Ensure player1_id < player2_id
  const [p1, p2] = player1Id < player2Id
    ? [player1Id, player2Id]
    : [player2Id, player1Id];

  const isPlayer1Winner = winnerId === p1;

  await prisma.headToHeadRecord.upsert({
    where: {
      tenantId_player1Id_player2Id: {
        tenantId,
        player1Id: p1,
        player2Id: p2
      }
    },
    update: {
      totalMatches: { increment: 1 },
      player1Wins: { increment: isPlayer1Winner ? 1 : 0 },
      player2Wins: { increment: isPlayer1Winner ? 0 : 1 },
      lastPlayedAt: new Date()
    },
    create: {
      tenantId,
      player1Id: p1,
      player2Id: p2,
      totalMatches: 1,
      player1Wins: isPlayer1Winner ? 1 : 0,
      player2Wins: isPlayer1Winner ? 0 : 1,
      lastPlayedAt: new Date(),
      favorsPlayer1: isPlayer1Winner
    }
  });
}
```

---

### 9. Record Match History

```typescript
async function recordMatchHistory(
  matchId: string,
  playerId: string,
  opponentId: string,
  result: 'WIN' | 'LOSS' | 'DRAW',
  score: any,
  tournamentId: string,
  tenantId: string
) {
  await prisma.matchHistory.create({
    data: {
      matchId,
      playerId,
      opponentId,
      result,
      score,
      tournamentId,
      tenantId,
      matchNumber: 1, // From match data
      roundNumber: 1, // From match data
      playedAt: new Date()
    }
  });
}
```

---

### 10. Check Privacy Settings

```typescript
async function canViewPlayerData(
  viewerId: string,
  playerId: string,
  dataType: 'statistics' | 'achievements' | 'history'
): Promise<boolean> {
  // Owner can always view
  if (viewerId === playerId) return true;

  // Check if viewer is admin
  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { role: true }
  });
  if (viewer?.role === 'admin') return true;

  // Check privacy settings
  const settings = await prisma.playerSettings.findUnique({
    where: { playerId }
  });

  if (!settings?.isProfilePublic) return false;

  switch (dataType) {
    case 'statistics':
      return settings.showStatistics;
    case 'achievements':
      return settings.showAchievements;
    case 'history':
      return settings.showHistory;
    default:
      return false;
  }
}
```

---

## Common Gotchas

### 1. Head-to-Head Player Order

**WRONG:**
```typescript
// ❌ This creates duplicate records!
const h2h = await prisma.headToHeadRecord.findUnique({
  where: {
    tenantId_player1Id_player2Id: {
      tenantId,
      player1Id: playerA,
      player2Id: playerB
    }
  }
});
```

**RIGHT:**
```typescript
// ✅ Always sort player IDs first
const [p1, p2] = [playerA, playerB].sort();
const h2h = await prisma.headToHeadRecord.findUnique({
  where: {
    tenantId_player1Id_player2Id: {
      tenantId,
      player1Id: p1,
      player2Id: p2
    }
  }
});
```

---

### 2. Tenant Isolation

**WRONG:**
```typescript
// ❌ Missing tenant check - SECURITY RISK!
const profile = await prisma.playerProfile.findUnique({
  where: { playerId }
});
```

**RIGHT:**
```typescript
// ✅ Always include tenant_id
const profile = await prisma.playerProfile.findFirst({
  where: {
    playerId,
    tenantId
  }
});
```

---

### 3. Win Rate Calculation

**WRONG:**
```typescript
// ❌ Division by zero error!
const winRate = (wins / matches) * 100;
```

**RIGHT:**
```typescript
// ✅ Handle zero matches
const winRate = matches > 0 ? (wins / matches) * 100 : 0;
```

---

### 4. Achievement Duplication

**WRONG:**
```typescript
// ❌ Can fail if already unlocked
await prisma.playerAchievement.create({
  data: { playerId, achievementId }
});
```

**RIGHT:**
```typescript
// ✅ Handle duplicates gracefully
try {
  await prisma.playerAchievement.create({
    data: { playerId, achievementId }
  });
} catch (error) {
  if (error.code === 'P2002') {
    // Already unlocked, ignore
    return;
  }
  throw error;
}
```

---

### 5. Privacy Checks

**WRONG:**
```typescript
// ❌ No privacy check!
const stats = await prisma.playerStatistics.findUnique({
  where: { playerId }
});
return res.json(stats);
```

**RIGHT:**
```typescript
// ✅ Check privacy settings first
const canView = await canViewPlayerData(viewerId, playerId, 'statistics');
if (!canView) {
  return res.status(403).json({ error: 'Access denied' });
}

const stats = await prisma.playerStatistics.findUnique({
  where: { playerId }
});
return res.json(stats);
```

---

## Performance Tips

### 1. Use Includes Wisely

**Slow:**
```typescript
// ❌ Loading all achievements (could be 20+)
const player = await prisma.player.findUnique({
  where: { id: playerId },
  include: {
    achievements: {
      include: { achievement: true }
    }
  }
});
```

**Fast:**
```typescript
// ✅ Limit to recent achievements
const player = await prisma.player.findUnique({
  where: { id: playerId },
  include: {
    achievements: {
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 5
    }
  }
});
```

---

### 2. Use Cursor Pagination

**Slow:**
```typescript
// ❌ Offset pagination gets slower with large offsets
const history = await prisma.matchHistory.findMany({
  where: { playerId },
  orderBy: { playedAt: 'desc' },
  skip: page * 20,
  take: 20
});
```

**Fast:**
```typescript
// ✅ Cursor pagination (consistent performance)
const history = await prisma.matchHistory.findMany({
  where: {
    playerId,
    ...(cursor && { playedAt: { lt: cursor } })
  },
  orderBy: { playedAt: 'desc' },
  take: 20
});
```

---

### 3. Cache Frequently Accessed Data

```typescript
// Cache player profiles
const CACHE_KEY = `player:${playerId}:profile`;
const cached = await redis.get(CACHE_KEY);
if (cached) return JSON.parse(cached);

const profile = await loadProfileFromDB(playerId);
await redis.set(CACHE_KEY, JSON.stringify(profile), 'EX', 300); // 5 min TTL
return profile;
```

---

### 4. Batch Achievement Checks

**Slow:**
```typescript
// ❌ N+1 queries
for (const achievementCode of achievementCodes) {
  await checkAndUnlock(playerId, achievementCode);
}
```

**Fast:**
```typescript
// ✅ Batch check
const achievements = await prisma.achievementDefinition.findMany({
  where: { code: { in: achievementCodes } }
});

const unlocked = await prisma.playerAchievement.findMany({
  where: {
    playerId,
    achievementId: { in: achievements.map(a => a.id) }
  }
});

const toUnlock = achievements.filter(a =>
  !unlocked.find(u => u.achievementId === a.id)
);

await prisma.playerAchievement.createMany({
  data: toUnlock.map(a => ({
    playerId,
    tenantId,
    achievementId: a.id
  })),
  skipDuplicates: true
});
```

---

## Achievement Codes Reference

### Quick Lookup

| Code | Name | Category | Points | Requirement |
|------|------|----------|--------|-------------|
| FIRST_STEPS | First Steps | PARTICIPATION | 10 | Play 1 tournament |
| PARTICIPANT | Participant | PARTICIPATION | 20 | Play 5 tournaments |
| REGULAR | Regular | PARTICIPATION | 40 | Play 25 tournaments |
| VETERAN | Veteran | PARTICIPATION | 60 | Play 100 tournaments |
| EARLY_BIRD | Early Bird | PARTICIPATION | 15 | Register 24h early |
| WINNER | Winner | PERFORMANCE | 25 | Win 1 tournament |
| CHAMPION | Champion | PERFORMANCE | 50 | Win 5 tournaments |
| DYNASTY | Dynasty | PERFORMANCE | 75 | Win 20 tournaments |
| UNDEFEATED | Undefeated | PERFORMANCE | 70 | Win without losses |
| COMEBACK_KID | Comeback Kid | PERFORMANCE | 45 | Win from loser bracket |
| PERFECTIONIST | Perfectionist | PERFORMANCE | 65 | Win all matches |
| UNDERDOG | Underdog | PERFORMANCE | 100 | Win as lowest seed |
| SOCIAL_BUTTERFLY | Social Butterfly | ENGAGEMENT | 40 | Play 50 opponents |
| RIVAL | Rival | ENGAGEMENT | 30 | Play 1 opponent 10x |
| GLOBETROTTER | Globetrotter | ENGAGEMENT | 35 | Play 5 venues |
| MARATHON | Marathon | ENGAGEMENT | 55 | 10+ hour tournament |
| LUCKY_13 | Lucky 13 | ENGAGEMENT | 13 | Finish exactly 13th |
| DOMINANT | Dominant | FORMAT_MASTERY | 70 | Win 10 same format |
| SPECIALIST | Specialist | FORMAT_MASTERY | 90 | 80% win rate |
| ALL_ROUNDER | All-Rounder | FORMAT_MASTERY | 45 | Play 5 formats |

---

## Testing Snippets

### Test Profile Load Performance

```typescript
import { performance } from 'perf_hooks';

async function testProfileLoad(playerId: string) {
  const start = performance.now();

  const profile = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      profile: true,
      statistics: true,
      settings: true
    }
  });

  const duration = performance.now() - start;
  console.log(`Profile load: ${duration.toFixed(2)}ms`);

  return { profile, duration };
}
```

---

### Test Leaderboard Performance

```typescript
async function testLeaderboard(tenantId: string) {
  const start = performance.now();

  const leaderboard = await prisma.playerStatistics.findMany({
    where: {
      tenantId,
      totalTournaments: { gte: 10 }
    },
    orderBy: { winRate: 'desc' },
    take: 100
  });

  const duration = performance.now() - start;
  console.log(`Leaderboard load: ${duration.toFixed(2)}ms`);

  return { leaderboard, duration };
}
```

---

## Environment-Specific Notes

### Development
- Use seed data for testing
- Enable query logging: `DATABASE_LOG=true`
- Use smaller datasets (100-1000 players)

### Staging
- Full dataset size (10,000+ players)
- Performance testing with realistic data
- Load testing tools (k6, artillery)

### Production
- Monitor query performance
- Set up alerts for slow queries (>100ms)
- Enable connection pooling
- Use read replicas for leaderboards

---

## Useful Commands

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
npx prisma migrate deploy

# Seed achievements
npx ts-node prisma/seeds/achievement-definitions.ts

# Open Prisma Studio
npx prisma studio

# Reset database (development only!)
npx prisma migrate reset
```

---

### PostgreSQL Commands

```sql
-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'player_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  tablename, indexname,
  idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'player_%'
ORDER BY idx_scan DESC;

-- Find slow queries
SELECT
  query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%player_%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Support & Resources

**Documentation:**
- Full schema: `PLAYER-PROFILES-SCHEMA.md`
- Index strategy: `PLAYER-PROFILES-INDEX-STRATEGY.md`
- Implementation summary: `SPRINT-10-WEEK-2-DATABASE-SUMMARY.md`

**Migration Files:**
- Schema: `prisma/schema-additions/player-profiles.prisma`
- SQL: `prisma/migrations/20251106_add_player_profiles/migration.sql`
- Seeds: `prisma/seeds/achievement-definitions.ts`

**Need Help?**
- Check Prisma docs: https://www.prisma.io/docs
- Review Sprint 10 plan: `docs/sprints/SPRINT-10-PLAN.md`
- Ask in team Slack: #dev-database

---

**Version:** 1.0
**Last Updated:** 2025-11-06
**Status:** Production Ready
