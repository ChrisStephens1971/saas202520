# Player Profiles Database Schema Documentation

**Sprint:** Sprint 10 Week 2
**Feature:** Player Profiles & Enhanced Experience
**Created:** 2025-11-06
**Status:** Ready for Implementation

---

## Overview

This document describes the database schema additions for Sprint 10 Week 2, which implements comprehensive player profiles, statistics tracking, achievements system, match history, and enhanced player experience features.

**Key Features:**

- Extended player profiles with bio, photos, and social links
- Aggregated player statistics for fast profile loading
- Achievement system with 20 predefined achievements
- Complete match history tracking
- Head-to-head records between players
- Granular player settings and privacy controls

**Architecture:**

- Multi-tenant: All tables include `tenant_id` for row-level isolation
- Performance: Pre-computed aggregates for fast queries
- Scalability: Indexed for common query patterns
- Privacy: Granular controls for player data visibility

---

## Table Definitions

### 1. player_profiles

**Purpose:** Extended player profile information with bio, photos, social links, and custom fields.

**Columns:**

| Column                   | Type         | Nullable | Default    | Description                                                     |
| ------------------------ | ------------ | -------- | ---------- | --------------------------------------------------------------- |
| id                       | TEXT         | NO       | cuid()     | Primary key                                                     |
| player_id                | TEXT         | NO       | -          | Foreign key to players table (unique)                           |
| tenant_id                | TEXT         | NO       | -          | Organization/tenant identifier                                  |
| bio                      | TEXT         | YES      | NULL       | Player biography or description                                 |
| photo_url                | VARCHAR(500) | YES      | NULL       | URL to player profile photo                                     |
| location                 | VARCHAR(255) | YES      | NULL       | Player location (city, state, country)                          |
| skill_level              | VARCHAR(50)  | NO       | 'BEGINNER' | Skill classification (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT) |
| privacy_settings         | JSONB        | NO       | {}         | Privacy controls (profilePublic, showStats, showHistory)        |
| notification_preferences | JSONB        | NO       | {}         | Notification preferences (email, sms, push, categories)         |
| social_links             | JSONB        | YES      | NULL       | Social media links (twitter, facebook, instagram, website)      |
| custom_fields            | JSONB        | YES      | NULL       | Tenant-specific custom fields                                   |
| created_at               | TIMESTAMP    | NO       | now()      | Record creation timestamp                                       |
| updated_at               | TIMESTAMP    | NO       | now()      | Record last update timestamp                                    |

**Indexes:**

- `player_profiles_player_id_key` (UNIQUE) - Fast player lookup
- `player_profiles_tenant_id_idx` - Tenant-scoped queries
- `player_profiles_tenant_id_skill_level_idx` - Filtering by skill level
- `player_profiles_player_id_idx` - Player lookups

**Relationships:**

- `player_id` → `players.id` (one-to-one)

**JSON Structures:**

```typescript
// privacy_settings
{
  profilePublic: boolean,
  showStats: boolean,
  showAchievements: boolean,
  showHistory: boolean
}

// notification_preferences
{
  email: { tournaments: boolean, matches: boolean, achievements: boolean },
  sms: { urgent: boolean, reminders: boolean },
  push: { tournaments: boolean, matches: boolean, achievements: boolean }
}

// social_links
{
  twitter?: string,
  facebook?: string,
  instagram?: string,
  website?: string
}
```

---

### 2. player_statistics

**Purpose:** Aggregated player statistics across all tournaments for fast profile loading.

**Columns:**

| Column            | Type          | Nullable | Default | Description                                                  |
| ----------------- | ------------- | -------- | ------- | ------------------------------------------------------------ |
| id                | TEXT          | NO       | cuid()  | Primary key                                                  |
| player_id         | TEXT          | NO       | -       | Foreign key to players table (unique)                        |
| tenant_id         | TEXT          | NO       | -       | Organization/tenant identifier                               |
| total_tournaments | INTEGER       | NO       | 0       | Total tournaments played                                     |
| total_matches     | INTEGER       | NO       | 0       | Total matches played                                         |
| total_wins        | INTEGER       | NO       | 0       | Total matches won                                            |
| total_losses      | INTEGER       | NO       | 0       | Total matches lost                                           |
| win_rate          | DECIMAL(5,2)  | NO       | 0       | Win percentage (0.00 to 100.00)                              |
| current_streak    | INTEGER       | NO       | 0       | Current win/loss streak (positive = wins, negative = losses) |
| longest_streak    | INTEGER       | NO       | 0       | Longest win streak ever                                      |
| average_finish    | DECIMAL(6,2)  | YES      | NULL    | Average tournament placement                                 |
| favorite_format   | VARCHAR(100)  | YES      | NULL    | Most frequently played format                                |
| total_prize_won   | DECIMAL(10,2) | NO       | 0       | Cumulative prize winnings                                    |
| last_played_at    | TIMESTAMP     | YES      | NULL    | Last tournament participation date                           |
| created_at        | TIMESTAMP     | NO       | now()   | Record creation timestamp                                    |
| updated_at        | TIMESTAMP     | NO       | now()   | Record last update timestamp                                 |

**Indexes:**

- `player_statistics_player_id_key` (UNIQUE) - Fast player lookup
- `player_statistics_tenant_id_player_id_idx` - Tenant-scoped player queries
- `player_statistics_tenant_id_win_rate_idx` (DESC) - Leaderboards by win rate
- `player_statistics_tenant_id_total_tournaments_idx` (DESC) - Participation rankings
- `player_statistics_tenant_id_total_prize_won_idx` (DESC) - Earnings leaderboards

**Relationships:**

- `player_id` → `players.id` (one-to-one)

**Update Triggers:**

- After match completion → Recalculate statistics
- After tournament completion → Update averages
- Background job: Nightly statistics recalculation

---

### 3. achievement_definitions

**Purpose:** System-wide achievement definitions with unlock requirements.

**Columns:**

| Column       | Type         | Nullable | Default | Description                                                       |
| ------------ | ------------ | -------- | ------- | ----------------------------------------------------------------- |
| id           | TEXT         | NO       | cuid()  | Primary key                                                       |
| code         | VARCHAR(100) | NO       | -       | Unique achievement code (e.g., FIRST_STEPS)                       |
| name         | VARCHAR(255) | NO       | -       | Display name                                                      |
| description  | TEXT         | NO       | -       | Achievement description                                           |
| icon_url     | VARCHAR(500) | YES      | NULL    | Icon image URL                                                    |
| badge_url    | VARCHAR(500) | YES      | NULL    | Badge image URL                                                   |
| category     | VARCHAR(50)  | NO       | -       | Category (PARTICIPATION, PERFORMANCE, ENGAGEMENT, FORMAT_MASTERY) |
| tier         | VARCHAR(50)  | NO       | -       | Tier (BRONZE, SILVER, GOLD, PLATINUM)                             |
| requirements | JSONB        | NO       | -       | Unlock requirements (see below)                                   |
| points       | INTEGER      | NO       | 0       | Achievement point value                                           |
| is_active    | BOOLEAN      | NO       | true    | Active status                                                     |
| created_at   | TIMESTAMP    | NO       | now()   | Record creation timestamp                                         |
| updated_at   | TIMESTAMP    | NO       | now()   | Record last update timestamp                                      |

**Indexes:**

- `achievement_definitions_code_key` (UNIQUE) - Fast code lookup
- `achievement_definitions_category_idx` - Filter by category
- `achievement_definitions_tier_idx` - Filter by tier
- `achievement_definitions_is_active_idx` - Active achievements only

**Requirements JSON Structures:**

```typescript
// Tournament count achievement
{
  type: "tournament_count",
  value: 10
}

// Tournament wins achievement
{
  type: "tournament_wins",
  value: 5
}

// Format-specific achievement
{
  type: "format_wins",
  value: 10,
  same_format: true
}

// Win rate achievement
{
  type: "format_win_rate",
  win_rate: 80,
  min_matches: 20,
  same_format: true
}

// Unique opponents achievement
{
  type: "unique_opponents",
  value: 50
}
```

**Categories:**

- `PARTICIPATION` - Playing and showing up (10-60 points)
- `PERFORMANCE` - Winning and competitive achievements (25-100 points)
- `ENGAGEMENT` - Social and community engagement (13-55 points)
- `FORMAT_MASTERY` - Mastering specific formats (45-90 points)

**Tiers:**

- `BRONZE` - Entry-level achievements (10-30 points)
- `SILVER` - Intermediate achievements (35-50 points)
- `GOLD` - Advanced achievements (55-75 points)
- `PLATINUM` - Elite achievements (90-100 points)

---

### 4. player_achievements

**Purpose:** Tracks unlocked achievements for each player.

**Columns:**

| Column         | Type      | Nullable | Default | Description                                          |
| -------------- | --------- | -------- | ------- | ---------------------------------------------------- |
| id             | TEXT      | NO       | cuid()  | Primary key                                          |
| player_id      | TEXT      | NO       | -       | Foreign key to players table                         |
| tenant_id      | TEXT      | NO       | -       | Organization/tenant identifier                       |
| achievement_id | TEXT      | NO       | -       | Foreign key to achievement_definitions               |
| unlocked_at    | TIMESTAMP | NO       | now()   | Achievement unlock timestamp                         |
| progress       | INTEGER   | NO       | 100     | Progress percentage (0-100)                          |
| metadata       | JSONB     | YES      | NULL    | Additional unlock data (tournamentId, matchId, etc.) |
| created_at     | TIMESTAMP | NO       | now()   | Record creation timestamp                            |

**Indexes:**

- `player_achievements_player_id_achievement_id_key` (UNIQUE) - One achievement per player
- `player_achievements_tenant_id_player_id_idx` - Player's achievements
- `player_achievements_tenant_id_achievement_id_idx` - Achievement holders
- `player_achievements_unlocked_at_idx` (DESC) - Recent unlocks

**Relationships:**

- `player_id` → `players.id` (many-to-one)
- `achievement_id` → `achievement_definitions.id` (many-to-one)

**Metadata JSON Structure:**

```typescript
{
  tournamentId?: string,
  matchId?: string,
  context?: string,
  value?: number
}
```

---

### 5. match_history

**Purpose:** Complete match history for every player with detailed statistics.

**Columns:**

| Column              | Type          | Nullable | Default | Description                      |
| ------------------- | ------------- | -------- | ------- | -------------------------------- |
| id                  | TEXT          | NO       | cuid()  | Primary key                      |
| match_id            | TEXT          | NO       | -       | Foreign key to matches table     |
| player_id           | TEXT          | NO       | -       | Foreign key to players table     |
| tenant_id           | TEXT          | NO       | -       | Organization/tenant identifier   |
| tournament_id       | TEXT          | NO       | -       | Foreign key to tournaments table |
| opponent_id         | TEXT          | NO       | -       | Opponent player ID               |
| result              | VARCHAR(20)   | NO       | -       | Match result (WIN, LOSS, DRAW)   |
| score               | JSONB         | NO       | -       | Detailed score data              |
| match_number        | INTEGER       | NO       | -       | Match number in tournament       |
| round_number        | INTEGER       | NO       | -       | Round number                     |
| duration_minutes    | INTEGER       | YES      | NULL    | Match duration in minutes        |
| skill_rating_before | DECIMAL(10,2) | YES      | NULL    | Player rating before match       |
| skill_rating_after  | DECIMAL(10,2) | YES      | NULL    | Player rating after match        |
| played_at           | TIMESTAMP     | NO       | -       | Match play timestamp             |
| created_at          | TIMESTAMP     | NO       | now()   | Record creation timestamp        |

**Indexes:**

- `match_history_tenant_id_player_id_played_at_idx` (DESC) - Player history timeline
- `match_history_tenant_id_player_id_opponent_id_idx` - Head-to-head queries
- `match_history_tenant_id_tournament_id_player_id_idx` - Tournament player history
- `match_history_match_id_idx` - Match lookup

**Relationships:**

- `match_id` → `matches.id` (many-to-one)
- `player_id` → `players.id` (many-to-one)
- `tournament_id` → `tournaments.id` (many-to-one)

**Score JSON Structure:**

```typescript
{
  playerScore: number,
  opponentScore: number,
  raceTo?: number,
  games?: Array<{
    winner: string,
    playerScore: number,
    opponentScore: number
  }>
}
```

---

### 6. head_to_head_records

**Purpose:** Pre-computed head-to-head records between two players for fast rivalry tracking.

**Columns:**

| Column         | Type      | Nullable | Default | Description                         |
| -------------- | --------- | -------- | ------- | ----------------------------------- |
| id             | TEXT      | NO       | cuid()  | Primary key                         |
| tenant_id      | TEXT      | NO       | -       | Organization/tenant identifier      |
| player1_id     | TEXT      | NO       | -       | First player ID (always lower ID)   |
| player2_id     | TEXT      | NO       | -       | Second player ID (always higher ID) |
| player1_wins   | INTEGER   | NO       | 0       | Number of wins for player1          |
| player2_wins   | INTEGER   | NO       | 0       | Number of wins for player2          |
| draws          | INTEGER   | NO       | 0       | Number of draws                     |
| total_matches  | INTEGER   | NO       | 0       | Total matches played                |
| last_played_at | TIMESTAMP | NO       | -       | Last match date                     |
| favors_player1 | BOOLEAN   | NO       | true    | True if player1 has more wins       |
| created_at     | TIMESTAMP | NO       | now()   | Record creation timestamp           |
| updated_at     | TIMESTAMP | NO       | now()   | Record last update timestamp        |

**Indexes:**

- `head_to_head_records_tenant_id_player1_id_player2_id_key` (UNIQUE) - One record per pair
- `head_to_head_records_tenant_id_player1_id_idx` - Player1 records
- `head_to_head_records_tenant_id_player2_id_idx` - Player2 records
- `head_to_head_records_tenant_id_last_played_at_idx` (DESC) - Recent rivalries

**Important:** Player IDs are always ordered (player1_id < player2_id) to ensure single record per pair.

**Update Logic:**

```sql
-- Ensure player1_id < player2_id
CASE
  WHEN playerA_id < playerB_id THEN (player1_id = playerA_id, player2_id = playerB_id)
  ELSE (player1_id = playerB_id, player2_id = playerA_id)
END
```

---

### 7. player_settings

**Purpose:** Player-specific settings for privacy, notifications, and display preferences.

**Columns:**

| Column              | Type         | Nullable | Default | Description                           |
| ------------------- | ------------ | -------- | ------- | ------------------------------------- |
| id                  | TEXT         | NO       | cuid()  | Primary key                           |
| player_id           | TEXT         | NO       | -       | Foreign key to players table (unique) |
| tenant_id           | TEXT         | NO       | -       | Organization/tenant identifier        |
| is_profile_public   | BOOLEAN      | NO       | true    | Profile visibility                    |
| show_statistics     | BOOLEAN      | NO       | true    | Statistics visibility                 |
| show_achievements   | BOOLEAN      | NO       | true    | Achievements visibility               |
| show_history        | BOOLEAN      | NO       | true    | History visibility                    |
| email_notifications | JSONB        | NO       | {}      | Email notification preferences        |
| push_notifications  | JSONB        | NO       | {}      | Push notification preferences         |
| sms_notifications   | JSONB        | NO       | {}      | SMS notification preferences          |
| theme               | VARCHAR(20)  | NO       | 'LIGHT' | UI theme (LIGHT, DARK, AUTO)          |
| language            | VARCHAR(10)  | NO       | 'en'    | Language preference                   |
| timezone            | VARCHAR(100) | YES      | NULL    | Timezone (e.g., America/New_York)     |
| created_at          | TIMESTAMP    | NO       | now()   | Record creation timestamp             |
| updated_at          | TIMESTAMP    | NO       | now()   | Record last update timestamp          |

**Indexes:**

- `player_settings_player_id_key` (UNIQUE) - One settings record per player
- `player_settings_tenant_id_player_id_key` (UNIQUE) - Tenant-scoped unique
- `player_settings_tenant_id_idx` - Tenant queries

**Relationships:**

- `player_id` → `players.id` (one-to-one)

**Notification JSON Structures:**

```typescript
// email_notifications
{
  tournaments: boolean,
  matches: boolean,
  achievements: boolean,
  announcements: boolean
}

// push_notifications
{
  tournaments: boolean,
  matches: boolean,
  achievements: boolean,
  reminders: boolean
}

// sms_notifications
{
  urgent: boolean,
  reminders: boolean
}
```

---

## Relationships Diagram (Textual)

```
players (existing)
  ├─→ player_profiles (1:1)
  ├─→ player_statistics (1:1)
  ├─→ player_achievements (1:many)
  ├─→ match_history (1:many)
  ├─→ player_settings (1:1)
  └─→ head_to_head_records (many:many via player1/player2)

tournaments (existing)
  └─→ match_history (1:many)

matches (existing)
  └─→ match_history (1:many)

achievement_definitions
  └─→ player_achievements (1:many)

head_to_head_records
  ├─→ players (player1_id)
  └─→ players (player2_id)
```

---

## Index Strategy

### Performance Optimization

**1. Tenant Isolation**

- All tables indexed on `tenant_id` for multi-tenant queries
- Composite indexes include `tenant_id` first for RLS performance

**2. Player Lookups**

- `player_id` indexed on all tables for fast player data retrieval
- Unique indexes on one-to-one relationships

**3. Leaderboards**

- `player_statistics.win_rate` (DESC) - Win rate leaderboard
- `player_statistics.total_tournaments` (DESC) - Participation rankings
- `player_statistics.total_prize_won` (DESC) - Earnings leaderboard

**4. Timeline Queries**

- `match_history.played_at` (DESC) - Recent match history
- `player_achievements.unlocked_at` (DESC) - Recent achievement unlocks
- `head_to_head_records.last_played_at` (DESC) - Recent rivalries

**5. Head-to-Head Queries**

- Composite index on (tenant_id, player_id, opponent_id) for fast H2H lookups
- Unique constraint on (tenant_id, player1_id, player2_id) prevents duplicates

---

## Common Query Patterns

### 1. Load Player Profile

```sql
-- Get complete player profile data
SELECT
  p.id, p.name, p.email,
  pp.bio, pp.photo_url, pp.location, pp.skill_level,
  ps.total_tournaments, ps.total_wins, ps.total_losses, ps.win_rate,
  ps.current_streak, ps.total_prize_won
FROM players p
LEFT JOIN player_profiles pp ON p.id = pp.player_id
LEFT JOIN player_statistics ps ON p.id = ps.player_id
WHERE p.id = $1 AND p.tenant_id = $2;
```

**Performance:** <10ms with proper indexes

---

### 2. Leaderboard Query

```sql
-- Top 10 players by win rate (minimum 10 tournaments)
SELECT
  p.id, p.name,
  pp.photo_url,
  ps.win_rate, ps.total_tournaments, ps.total_wins
FROM player_statistics ps
JOIN players p ON ps.player_id = p.id
LEFT JOIN player_profiles pp ON p.id = pp.player_id
WHERE ps.tenant_id = $1
  AND ps.total_tournaments >= 10
ORDER BY ps.win_rate DESC, ps.total_tournaments DESC
LIMIT 10;
```

**Performance:** <20ms with composite index on (tenant_id, win_rate DESC)

---

### 3. Match History Timeline

```sql
-- Player's recent match history (last 20 matches)
SELECT
  mh.id, mh.result, mh.score, mh.played_at,
  t.name AS tournament_name,
  opp.name AS opponent_name
FROM match_history mh
JOIN tournaments t ON mh.tournament_id = t.id
JOIN players opp ON mh.opponent_id = opp.id
WHERE mh.player_id = $1
  AND mh.tenant_id = $2
ORDER BY mh.played_at DESC
LIMIT 20;
```

**Performance:** <15ms with index on (tenant_id, player_id, played_at DESC)

---

### 4. Head-to-Head Lookup

```sql
-- Get head-to-head record between two players
SELECT
  h.player1_wins, h.player2_wins, h.draws,
  h.total_matches, h.last_played_at, h.favors_player1
FROM head_to_head_records h
WHERE h.tenant_id = $1
  AND ((h.player1_id = $2 AND h.player2_id = $3)
    OR (h.player1_id = $3 AND h.player2_id = $2));
```

**Performance:** <5ms with unique constraint index

---

### 5. Achievement Progress Check

```sql
-- Check if player has unlocked achievement
SELECT COUNT(*) > 0 AS has_achievement
FROM player_achievements
WHERE player_id = $1
  AND achievement_id = $2
  AND tenant_id = $3;
```

**Performance:** <5ms with unique index on (player_id, achievement_id)

---

### 6. Player Search

```sql
-- Search players by name or location
SELECT
  p.id, p.name,
  pp.photo_url, pp.location, pp.skill_level,
  ps.win_rate, ps.total_tournaments
FROM players p
LEFT JOIN player_profiles pp ON p.id = pp.player_id
LEFT JOIN player_statistics ps ON p.id = ps.player_id
WHERE p.tenant_id = $1
  AND (
    p.name ILIKE '%' || $2 || '%'
    OR pp.location ILIKE '%' || $2 || '%'
  )
ORDER BY ps.total_tournaments DESC
LIMIT 20;
```

**Performance:** <50ms (consider adding full-text search indexes for large datasets)

---

## Migration Instructions

### Step 1: Run Migration

```bash
# Apply migration SQL
psql -U postgres -d tournament_platform < prisma/migrations/20251106_add_player_profiles/migration.sql

# Or using Prisma
npx prisma migrate deploy
```

### Step 2: Seed Achievement Definitions

```bash
# Run seed script
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

### Step 3: Backfill Existing Data

```bash
# Create backfill script (backfill-player-data.ts)
# 1. Create player_statistics for existing players
# 2. Create match_history from existing matches
# 3. Calculate head_to_head_records
# 4. Check and award achievements

npx ts-node scripts/backfill-player-data.ts
```

### Step 4: Enable Foreign Keys (When Ready)

```sql
-- Uncomment and run foreign key constraints from migration.sql
-- ONLY after verifying data integrity

ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ... (add all foreign key constraints)
```

---

## Query Optimization Notes

### 1. Aggregation Strategy

**Problem:** Real-time aggregation is slow on large datasets

**Solution:** Pre-computed aggregates in `player_statistics`

**Update Strategy:**

- Increment counters after each match
- Recalculate win_rate after each match
- Daily batch job for consistency checks

---

### 2. Leaderboard Performance

**Problem:** Sorting large player lists by win_rate

**Solution:** Composite indexes on (tenant_id, win_rate DESC)

**Additional Optimization:**

- Materialized views for global leaderboards
- Redis cache for top 100 players (5-minute TTL)

---

### 3. Head-to-Head Lookups

**Problem:** Counting matches between two players on-the-fly

**Solution:** Pre-computed `head_to_head_records` table

**Update Logic:**

```typescript
async function updateHeadToHead(player1Id, player2Id, winnerId, tenantId) {
  // Ensure player1_id < player2_id
  const [p1, p2] = player1Id < player2Id
    ? [player1Id, player2Id]
    : [player2Id, player1Id];

  await prisma.headToHeadRecord.upsert({
    where: {
      tenantId_player1Id_player2Id: { tenantId, player1Id: p1, player2Id: p2 }
    },
    update: {
      totalMatches: { increment: 1 },
      player1Wins: { increment: winnerId === p1 ? 1 : 0 },
      player2Wins: { increment: winnerId === p2 ? 1 : 0 },
      lastPlayedAt: new Date(),
      favorsPlayer1: // Recalculate based on updated wins
    },
    create: {
      tenantId, player1Id: p1, player2Id: p2,
      totalMatches: 1,
      player1Wins: winnerId === p1 ? 1 : 0,
      player2Wins: winnerId === p2 ? 1 : 0,
      lastPlayedAt: new Date()
    }
  });
}
```

---

### 4. Achievement Checking

**Problem:** Checking 20 achievements after every match is expensive

**Solution:** Event-driven achievement checks

**Strategy:**

- Only check relevant achievements based on event type
- Use Redis cache for achievement progress
- Background worker for batch achievement processing

```typescript
// Achievement check optimization
const achievementChecks = {
  'match.completed': ['WINNER', 'PERFECTIONIST', 'COMEBACK_KID'],
  'tournament.completed': ['FIRST_STEPS', 'PARTICIPANT', 'CHAMPION'],
  'tournament.duration': ['MARATHON'],
};
```

---

### 5. Match History Pagination

**Problem:** Loading all matches is slow for active players

**Solution:** Cursor-based pagination

```typescript
async function getMatchHistory(playerId, cursor?, limit = 20) {
  return await prisma.matchHistory.findMany({
    where: {
      playerId,
      ...(cursor && { playedAt: { lt: cursor } }),
    },
    orderBy: { playedAt: 'desc' },
    take: limit,
    include: {
      tournament: true,
      opponent: { select: { name: true, photoUrl: true } },
    },
  });
}
```

---

## Data Integrity Considerations

### 1. Statistics Consistency

**Challenge:** Ensuring `player_statistics` matches actual match data

**Solution:**

- Transactional updates (match completion + stats update)
- Daily consistency checks
- Audit log for stat changes

---

### 2. Achievement Duplication

**Challenge:** Preventing duplicate achievement unlocks

**Solution:**

- Unique constraint on (player_id, achievement_id)
- Idempotent achievement unlock function

```typescript
async function unlockAchievement(playerId, achievementId, metadata) {
  try {
    await prisma.playerAchievement.create({
      data: { playerId, achievementId, metadata },
    });
    return true; // Newly unlocked
  } catch (error) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      return false; // Already unlocked
    }
    throw error;
  }
}
```

---

### 3. Head-to-Head Accuracy

**Challenge:** Ensuring H2H records match match_history

**Solution:**

- Update H2H atomically with match completion
- Periodic reconciliation job
- Rebuild function for data fixes

---

## Privacy & Security

### 1. Privacy Settings Enforcement

**Application-level checks before displaying data:**

```typescript
function canViewPlayerData(viewer, player, dataType) {
  // Admin can view all
  if (viewer.role === 'admin') return true;

  // Player can view own data
  if (viewer.id === player.id) return true;

  // Check player's privacy settings
  const settings = player.settings;
  if (!settings.isProfilePublic) return false;

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

### 2. Tenant Isolation

**Always include tenant_id in WHERE clauses:**

```sql
-- ✅ CORRECT: Includes tenant_id
SELECT * FROM player_statistics
WHERE player_id = $1 AND tenant_id = $2;

-- ❌ WRONG: Missing tenant_id (security risk)
SELECT * FROM player_statistics
WHERE player_id = $1;
```

---

### 3. Data Export Controls

**Restrict bulk data exports:**

- Rate limit leaderboard queries
- Require authentication for player searches
- Log all data exports for audit

---

## Performance Benchmarks

**Target Performance (with proper indexes):**

| Query Type                 | Target | With Indexes | Without Indexes |
| -------------------------- | ------ | ------------ | --------------- |
| Load player profile        | <10ms  | 5-8ms        | 50-100ms        |
| Leaderboard (top 100)      | <20ms  | 12-18ms      | 200-500ms       |
| Match history (20 items)   | <15ms  | 8-12ms       | 100-300ms       |
| Head-to-head lookup        | <5ms   | 2-4ms        | 50-150ms        |
| Achievement check          | <5ms   | 2-3ms        | 20-50ms         |
| Player search (20 results) | <50ms  | 25-40ms      | 500ms+          |

**Database Size Estimates:**

| Table                   | Rows (per 1000 players)       | Storage (estimate) |
| ----------------------- | ----------------------------- | ------------------ |
| player_profiles         | 1,000                         | ~500 KB            |
| player_statistics       | 1,000                         | ~200 KB            |
| achievement_definitions | 20                            | ~10 KB             |
| player_achievements     | 5,000 (avg 5 per player)      | ~1 MB              |
| match_history           | 50,000 (avg 50 per player)    | ~25 MB             |
| head_to_head_records    | 10,000 (10 rivals per player) | ~2 MB              |
| player_settings         | 1,000                         | ~300 KB            |

**Total:** ~29 MB per 1,000 players

---

## Rollback Plan

### If Issues Arise

**1. Disable Foreign Keys**

```sql
ALTER TABLE player_profiles DROP CONSTRAINT IF EXISTS player_profiles_player_id_fkey;
-- ... (drop all foreign keys)
```

**2. Drop Tables (in reverse order)**

```sql
DROP TABLE IF EXISTS player_settings;
DROP TABLE IF EXISTS head_to_head_records;
DROP TABLE IF EXISTS match_history;
DROP TABLE IF EXISTS player_achievements;
DROP TABLE IF EXISTS player_profiles;
DROP TABLE IF EXISTS player_statistics;
DROP TABLE IF EXISTS achievement_definitions;
```

**3. Restore from Backup**

```bash
# Restore database from pre-migration backup
pg_restore -U postgres -d tournament_platform backup_pre_sprint10.dump
```

---

## Next Steps

1. **Run migration** - Apply schema changes
2. **Seed achievements** - Run achievement definitions seed
3. **Backfill data** - Create stats and history for existing players
4. **Test queries** - Verify performance with realistic data
5. **Implement privacy checks** - Add application-level privacy enforcement
6. **Build achievement engine** - Create background worker for achievement processing
7. **Set up monitoring** - Add query performance monitoring
8. **Document API** - Update API documentation with new endpoints

---

**Documentation Version:** 1.0
**Last Updated:** 2025-11-06
**Status:** Ready for Implementation
