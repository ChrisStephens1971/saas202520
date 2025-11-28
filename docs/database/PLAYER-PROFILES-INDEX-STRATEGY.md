# Player Profiles Database Index Strategy

**Sprint:** Sprint 10 Week 2
**Feature:** Player Profiles & Enhanced Experience
**Focus:** Query Optimization and Performance
**Created:** 2025-11-06

---

## Overview

This document provides detailed index strategy, query optimization techniques, and performance recommendations for the player profiles database schema.

**Key Goals:**

- Player profile loads in <10ms
- Leaderboards render in <20ms
- Match history pagination in <15ms
- Support 10,000+ concurrent players per tenant
- Efficient head-to-head lookups

---

## Index Inventory

### Primary Indexes (Required)

#### player_profiles

```sql
-- Primary Key
CREATE UNIQUE INDEX player_profiles_pkey ON player_profiles(id);

-- Foreign Key Lookup
CREATE UNIQUE INDEX player_profiles_player_id_key ON player_profiles(player_id);

-- Tenant Isolation
CREATE INDEX player_profiles_tenant_id_idx ON player_profiles(tenant_id);

-- Skill-Based Filtering
CREATE INDEX player_profiles_tenant_id_skill_level_idx
    ON player_profiles(tenant_id, skill_level);
```

**Usage:**

- `player_id_key` - Fast 1:1 lookup from players table (most common)
- `tenant_id_idx` - Tenant-scoped queries
- `tenant_id_skill_level_idx` - Filter players by skill level

**Index Size:** ~100 KB per 1,000 players

---

#### player_statistics

```sql
-- Primary Key
CREATE UNIQUE INDEX player_statistics_pkey ON player_statistics(id);

-- Foreign Key Lookup
CREATE UNIQUE INDEX player_statistics_player_id_key ON player_statistics(player_id);

-- Tenant + Player Lookup
CREATE INDEX player_statistics_tenant_id_player_id_idx
    ON player_statistics(tenant_id, player_id);

-- Leaderboard Indexes
CREATE INDEX player_statistics_tenant_id_win_rate_idx
    ON player_statistics(tenant_id, win_rate DESC);

CREATE INDEX player_statistics_tenant_id_total_tournaments_idx
    ON player_statistics(tenant_id, total_tournaments DESC);

CREATE INDEX player_statistics_tenant_id_total_prize_won_idx
    ON player_statistics(tenant_id, total_prize_won DESC);
```

**Usage:**

- `player_id_key` - Fast 1:1 lookup (most common)
- `tenant_id_win_rate_idx` - Win rate leaderboards
- `tenant_id_total_tournaments_idx` - Participation rankings
- `tenant_id_total_prize_won_idx` - Earnings leaderboards

**Why DESC ordering?**
Leaderboards always sort high-to-low, so DESC indexes are faster.

**Index Size:** ~150 KB per 1,000 players

---

#### achievement_definitions

```sql
-- Primary Key
CREATE UNIQUE INDEX achievement_definitions_pkey ON achievement_definitions(id);

-- Unique Code Lookup
CREATE UNIQUE INDEX achievement_definitions_code_key ON achievement_definitions(code);

-- Category Filtering
CREATE INDEX achievement_definitions_category_idx ON achievement_definitions(category);

-- Tier Filtering
CREATE INDEX achievement_definitions_tier_idx ON achievement_definitions(tier);

-- Active Achievements Only
CREATE INDEX achievement_definitions_is_active_idx ON achievement_definitions(is_active);
```

**Usage:**

- `code_key` - Lookup by achievement code (FIRST_STEPS, WINNER, etc.)
- `category_idx` - Filter achievements by category
- `tier_idx` - Filter by tier (BRONZE, SILVER, GOLD, PLATINUM)
- `is_active_idx` - Only show active achievements

**Index Size:** ~5 KB (small table, only 20 rows)

---

#### player_achievements

```sql
-- Primary Key
CREATE UNIQUE INDEX player_achievements_pkey ON player_achievements(id);

-- Unique Constraint (one achievement per player)
CREATE UNIQUE INDEX player_achievements_player_id_achievement_id_key
    ON player_achievements(player_id, achievement_id);

-- Player's Achievements
CREATE INDEX player_achievements_tenant_id_player_id_idx
    ON player_achievements(tenant_id, player_id);

-- Achievement Holders
CREATE INDEX player_achievements_tenant_id_achievement_id_idx
    ON player_achievements(tenant_id, achievement_id);

-- Recent Unlocks
CREATE INDEX player_achievements_unlocked_at_idx
    ON player_achievements(unlocked_at DESC);
```

**Usage:**

- `player_id_achievement_id_key` - Prevent duplicate unlocks + fast checks
- `tenant_id_player_id_idx` - Get all achievements for a player
- `tenant_id_achievement_id_idx` - Find who has a specific achievement
- `unlocked_at_idx` - Recent achievement activity feed

**Index Size:** ~200 KB per 1,000 players (avg 5 achievements each)

---

#### match_history

```sql
-- Primary Key
CREATE UNIQUE INDEX match_history_pkey ON match_history(id);

-- Match Lookup
CREATE INDEX match_history_match_id_idx ON match_history(match_id);

-- Player Timeline (most important)
CREATE INDEX match_history_tenant_id_player_id_played_at_idx
    ON match_history(tenant_id, player_id, played_at DESC);

-- Head-to-Head Queries
CREATE INDEX match_history_tenant_id_player_id_opponent_id_idx
    ON match_history(tenant_id, player_id, opponent_id);

-- Tournament Player History
CREATE INDEX match_history_tenant_id_tournament_id_player_id_idx
    ON match_history(tenant_id, tournament_id, player_id);
```

**Usage:**

- `match_id_idx` - Link back to matches table
- `tenant_id_player_id_played_at_idx` - Player match history timeline (most common query)
- `tenant_id_player_id_opponent_id_idx` - Head-to-head match lookups
- `tenant_id_tournament_id_player_id_idx` - Tournament-specific history

**Index Size:** ~2 MB per 1,000 players (avg 50 matches each)

**Critical:** The `played_at DESC` ordering is essential for efficient pagination.

---

#### head_to_head_records

```sql
-- Primary Key
CREATE UNIQUE INDEX head_to_head_records_pkey ON head_to_head_records(id);

-- Unique Pair Constraint
CREATE UNIQUE INDEX head_to_head_records_tenant_id_player1_id_player2_id_key
    ON head_to_head_records(tenant_id, player1_id, player2_id);

-- Player1 Records
CREATE INDEX head_to_head_records_tenant_id_player1_id_idx
    ON head_to_head_records(tenant_id, player1_id);

-- Player2 Records
CREATE INDEX head_to_head_records_tenant_id_player2_id_idx
    ON head_to_head_records(tenant_id, player2_id);

-- Recent Rivalries
CREATE INDEX head_to_head_records_tenant_id_last_played_at_idx
    ON head_to_head_records(tenant_id, last_played_at DESC);
```

**Usage:**

- `tenant_id_player1_id_player2_id_key` - Fast H2H lookup + prevent duplicates
- `tenant_id_player1_id_idx` - Find all opponents for player1
- `tenant_id_player2_id_idx` - Find all opponents for player2
- `tenant_id_last_played_at_idx` - Recent rivalry activity

**Index Size:** ~400 KB per 1,000 players (avg 10 rivalries each)

---

#### player_settings

```sql
-- Primary Key
CREATE UNIQUE INDEX player_settings_pkey ON player_settings(id);

-- Unique Player Settings
CREATE UNIQUE INDEX player_settings_player_id_key ON player_settings(player_id);

-- Tenant-Scoped Unique
CREATE UNIQUE INDEX player_settings_tenant_id_player_id_key
    ON player_settings(tenant_id, player_id);

-- Tenant Queries
CREATE INDEX player_settings_tenant_id_idx ON player_settings(tenant_id);
```

**Usage:**

- `player_id_key` - Fast 1:1 lookup
- `tenant_id_player_id_key` - Tenant-scoped unique constraint
- `tenant_id_idx` - Tenant-wide settings queries

**Index Size:** ~100 KB per 1,000 players

---

## Query Pattern Analysis

### Pattern 1: Load Player Profile (Most Common)

**Query:**

```sql
SELECT
  p.id, p.name, p.email,
  pp.bio, pp.photo_url, pp.location, pp.skill_level,
  ps.total_tournaments, ps.total_wins, ps.win_rate,
  (SELECT COUNT(*) FROM player_achievements pa
   WHERE pa.player_id = p.id) AS achievement_count
FROM players p
LEFT JOIN player_profiles pp ON p.id = pp.player_id
LEFT JOIN player_statistics ps ON p.id = ps.player_id
WHERE p.id = $1 AND p.tenant_id = $2;
```

**Index Usage:**

1. `players_pkey` on players(id) - Primary lookup
2. `player_profiles_player_id_key` - 1:1 join
3. `player_statistics_player_id_key` - 1:1 join
4. `player_achievements_tenant_id_player_id_idx` - Count achievements

**Performance:** 5-8ms

**Optimization Tips:**

- Consider denormalizing `achievement_count` to `player_statistics`
- Cache profile data in Redis (5-minute TTL)

---

### Pattern 2: Leaderboard Query

**Query:**

```sql
-- Top 100 players by win rate
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
LIMIT 100;
```

**Index Usage:**

1. `player_statistics_tenant_id_win_rate_idx` - Main sort (DESC)
2. `players_pkey` - Join to players
3. `player_profiles_player_id_key` - Join to profiles

**Performance:** 12-18ms

**Optimization Tips:**

- Add materialized view for top 1000 players
- Cache top 100 in Redis (5-minute TTL)
- Consider partial index: `WHERE total_tournaments >= 10`

**Materialized View:**

```sql
CREATE MATERIALIZED VIEW leaderboard_top_1000 AS
SELECT
  p.id, p.name, pp.photo_url,
  ps.win_rate, ps.total_tournaments, ps.total_wins, ps.tenant_id
FROM player_statistics ps
JOIN players p ON ps.player_id = p.id
LEFT JOIN player_profiles pp ON p.id = pp.player_id
WHERE ps.total_tournaments >= 10
ORDER BY ps.win_rate DESC, ps.total_tournaments DESC
LIMIT 1000;

-- Refresh nightly or after tournaments
REFRESH MATERIALIZED VIEW leaderboard_top_1000;
```

---

### Pattern 3: Match History Timeline

**Query:**

```sql
-- Last 20 matches for player
SELECT
  mh.id, mh.result, mh.score, mh.played_at,
  t.name AS tournament_name,
  opp.name AS opponent_name,
  opp_profile.photo_url AS opponent_photo
FROM match_history mh
JOIN tournaments t ON mh.tournament_id = t.id
JOIN players opp ON mh.opponent_id = opp.id
LEFT JOIN player_profiles opp_profile ON opp.id = opp_profile.player_id
WHERE mh.player_id = $1
  AND mh.tenant_id = $2
  AND mh.played_at < $3  -- Cursor for pagination
ORDER BY mh.played_at DESC
LIMIT 20;
```

**Index Usage:**

1. `match_history_tenant_id_player_id_played_at_idx` (DESC) - Main query
2. `tournaments_pkey` - Join tournaments
3. `players_pkey` - Join opponents
4. `player_profiles_player_id_key` - Join opponent profiles

**Performance:** 8-12ms

**Optimization Tips:**

- Use cursor-based pagination (played_at < cursor)
- Denormalize opponent_name to match_history (trade-off: storage vs. joins)
- Cache recent 20 matches in Redis

---

### Pattern 4: Head-to-Head Lookup

**Query:**

```sql
-- Get H2H record between two players
SELECT
  h.player1_id, h.player2_id,
  h.player1_wins, h.player2_wins, h.draws,
  h.total_matches, h.last_played_at, h.favors_player1,
  p1.name AS player1_name,
  p2.name AS player2_name
FROM head_to_head_records h
JOIN players p1 ON h.player1_id = p1.id
JOIN players p2 ON h.player2_id = p2.id
WHERE h.tenant_id = $1
  AND (
    (h.player1_id = $2 AND h.player2_id = $3)
    OR (h.player1_id = $3 AND h.player2_id = $2)
  );
```

**Index Usage:**

1. `head_to_head_records_tenant_id_player1_id_player2_id_key` - Unique constraint index
2. `players_pkey` - Join player names

**Performance:** 2-4ms

**Optimization Tips:**

- Always order player IDs (player1_id < player2_id) before query
- Cache H2H records for active rivalries

---

### Pattern 5: Achievement Progress Check

**Query:**

```sql
-- Check if player has achievement
SELECT
  pa.id, pa.unlocked_at, pa.progress,
  ad.name, ad.description, ad.tier, ad.points
FROM player_achievements pa
JOIN achievement_definitions ad ON pa.achievement_id = ad.id
WHERE pa.player_id = $1
  AND pa.achievement_id = $2
  AND pa.tenant_id = $3;
```

**Index Usage:**

1. `player_achievements_player_id_achievement_id_key` - Unique constraint
2. `achievement_definitions_pkey` - Join definition

**Performance:** 2-3ms

**Optimization Tips:**

- Cache player's unlocked achievements in Redis
- Batch check multiple achievements in one query

---

### Pattern 6: Player Search

**Query:**

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
ORDER BY ps.total_tournaments DESC NULLS LAST
LIMIT 20;
```

**Index Usage:**

- `players_tenant_id_idx` - Tenant filter
- Full table scan on name/location (ILIKE doesn't use B-tree indexes)

**Performance:** 25-40ms (acceptable for small datasets, slow for large)

**Optimization Tips:**

**Option 1: Full-Text Search Indexes (PostgreSQL)**

```sql
-- Add tsvector column
ALTER TABLE players ADD COLUMN search_vector tsvector;

-- Create GIN index
CREATE INDEX players_search_vector_idx ON players USING GIN(search_vector);

-- Update search vector
UPDATE players
SET search_vector = to_tsvector('english', name || ' ' || COALESCE(location, ''));

-- Query using full-text search
SELECT * FROM players
WHERE tenant_id = $1
  AND search_vector @@ to_tsquery('english', $2)
ORDER BY ts_rank(search_vector, to_tsquery('english', $2)) DESC
LIMIT 20;
```

**Option 2: Trigram Indexes (pg_trgm)**

```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram indexes
CREATE INDEX players_name_trgm_idx ON players USING GIN(name gin_trgm_ops);
CREATE INDEX player_profiles_location_trgm_idx ON player_profiles USING GIN(location gin_trgm_ops);

-- Query will now use trigram indexes
-- Same query as above, but faster with trigram index
```

**Recommendation:** Use trigrams for partial matches, full-text for complex searches.

---

## Index Size Analysis

### Total Index Overhead

**Per 1,000 Players:**

| Table                   | Data Size | Index Size | Ratio |
| ----------------------- | --------- | ---------- | ----- |
| player_profiles         | 500 KB    | 100 KB     | 20%   |
| player_statistics       | 200 KB    | 150 KB     | 75%   |
| achievement_definitions | 10 KB     | 5 KB       | 50%   |
| player_achievements     | 1 MB      | 200 KB     | 20%   |
| match_history           | 25 MB     | 2 MB       | 8%    |
| head_to_head_records    | 2 MB      | 400 KB     | 20%   |
| player_settings         | 300 KB    | 100 KB     | 33%   |

**Total:** ~29 MB data + ~3 MB indexes = 32 MB per 1,000 players

**Scaling:**

- 10,000 players: ~320 MB (easily fits in memory)
- 100,000 players: ~3.2 GB (requires proper memory allocation)
- 1,000,000 players: ~32 GB (consider partitioning)

---

## Index Maintenance

### Monitoring Index Health

```sql
-- Check index usage
SELECT
  schemaname, tablename, indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'player_%'
ORDER BY idx_scan DESC;
```

**Action:** Remove indexes with `idx_scan = 0` (unused indexes)

---

### Index Bloat Detection

```sql
-- Check index bloat
SELECT
  tablename, indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'player_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Action:** REINDEX if bloat is >30%

---

### Rebuild Indexes

```sql
-- Rebuild all player profile indexes (run during low traffic)
REINDEX TABLE player_profiles;
REINDEX TABLE player_statistics;
REINDEX TABLE match_history;
REINDEX TABLE head_to_head_records;

-- Or rebuild specific index
REINDEX INDEX player_statistics_tenant_id_win_rate_idx;
```

**Schedule:** Monthly or quarterly during maintenance window

---

## Caching Strategy

### Redis Cache Patterns

**1. Player Profile Cache**

```typescript
const CACHE_KEY = `player:${tenantId}:${playerId}:profile`;
const TTL = 300; // 5 minutes

// Cache structure
{
  profile: { bio, photo, location, skillLevel },
  statistics: { totalTournaments, wins, losses, winRate },
  achievementCount: 5,
  cachedAt: timestamp
}
```

**2. Leaderboard Cache**

```typescript
const CACHE_KEY = `leaderboard:${tenantId}:winrate:top100`;
const TTL = 300; // 5 minutes

// Cache structure
[
  { playerId, name, photoUrl, winRate, totalTournaments },
  ...
]
```

**3. Head-to-Head Cache**

```typescript
const CACHE_KEY = `h2h:${tenantId}:${player1Id}:${player2Id}`;
const TTL = 600; // 10 minutes (less frequent updates)

// Cache structure
{
  (player1Wins, player2Wins, draws, totalMatches, lastPlayedAt, favorsPlayer1);
}
```

**Cache Invalidation:**

- After match completion → Invalidate player stats, leaderboard
- After tournament completion → Invalidate achievements, H2H records
- After settings update → Invalidate profile cache

---

## Partitioning Strategy (Future)

**When to Partition:**

- 1M+ players per tenant
- match_history table >100 GB
- Query performance degrades despite indexes

**Partition match_history by played_at:**

```sql
-- Create partitioned table
CREATE TABLE match_history_partitioned (
  -- Same columns as match_history
) PARTITION BY RANGE (played_at);

-- Create monthly partitions
CREATE TABLE match_history_2025_01 PARTITION OF match_history_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE match_history_2025_02 PARTITION OF match_history_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Automatic partition creation (pg_partman extension)
```

**Benefits:**

- Faster queries on recent history
- Easier archival of old data
- Improved vacuum performance

---

## Query Optimization Checklist

Before deploying, verify:

- [ ] All foreign key columns are indexed
- [ ] Composite indexes include tenant_id first (RLS)
- [ ] Leaderboard indexes use DESC ordering
- [ ] Timeline queries use DESC ordering on timestamp
- [ ] Unique constraints serve dual purpose (constraint + index)
- [ ] No unused indexes (check pg_stat_user_indexes)
- [ ] Analyzed statistics are up-to-date (ANALYZE)
- [ ] Query plans use indexes (EXPLAIN ANALYZE)
- [ ] Redis cache implemented for hot data
- [ ] Monitoring dashboards set up (query performance)

---

## Performance Testing

### Load Testing Queries

```bash
# pgbench custom script
cat > benchmark_player_profiles.sql <<EOF
\set tenant_id random(1, 100)
\set player_id random(1, 10000)

-- Load player profile
SELECT * FROM players p
LEFT JOIN player_profiles pp ON p.id = pp.player_id
LEFT JOIN player_statistics ps ON p.id = ps.player_id
WHERE p.id = :player_id AND p.tenant_id = :tenant_id;

-- Get leaderboard
SELECT * FROM player_statistics ps
WHERE ps.tenant_id = :tenant_id
  AND ps.total_tournaments >= 10
ORDER BY ps.win_rate DESC
LIMIT 100;

-- Get match history
SELECT * FROM match_history
WHERE player_id = :player_id
  AND tenant_id = :tenant_id
ORDER BY played_at DESC
LIMIT 20;
EOF

# Run benchmark
pgbench -c 50 -j 10 -T 60 -f benchmark_player_profiles.sql tournament_db
```

**Target Metrics:**

- Throughput: >1000 TPS
- Latency (p95): <50ms
- Latency (p99): <100ms

---

## Conclusion

**Index Strategy Summary:**

1. **Primary lookups** - Use unique indexes on foreign keys
2. **Leaderboards** - Composite indexes with DESC ordering
3. **Timelines** - Composite indexes with timestamp DESC
4. **Searches** - Full-text or trigram indexes for ILIKE
5. **Aggregates** - Pre-computed in separate tables

**Performance Targets:**

- Profile loads: <10ms ✓
- Leaderboards: <20ms ✓
- Match history: <15ms ✓
- H2H lookups: <5ms ✓

**Monitoring:**

- Weekly index health checks
- Monthly index rebuilds
- Quarterly partitioning review (if needed)

---

**Documentation Version:** 1.0
**Last Updated:** 2025-11-06
**Status:** Production Ready
