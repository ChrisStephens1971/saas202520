-- ============================================================================
-- Sprint 10 Week 2: Player Profiles & Enhanced Experience
-- Migration: Add player profile extensions, statistics, achievements, and history
-- Created: 2025-11-06
-- ============================================================================

-- ============================================================================
-- PLAYER PROFILES
-- ============================================================================

CREATE TABLE "player_profiles" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bio" TEXT,
    "photo_url" VARCHAR(500),
    "location" VARCHAR(255),
    "skill_level" VARCHAR(50) NOT NULL DEFAULT 'BEGINNER',
    "privacy_settings" JSONB NOT NULL DEFAULT '{}',
    "notification_preferences" JSONB NOT NULL DEFAULT '{}',
    "social_links" JSONB,
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id")
);

-- Indexes for player_profiles
CREATE UNIQUE INDEX "player_profiles_player_id_key" ON "player_profiles"("player_id");
CREATE INDEX "player_profiles_tenant_id_idx" ON "player_profiles"("tenant_id");
CREATE INDEX "player_profiles_tenant_id_skill_level_idx" ON "player_profiles"("tenant_id", "skill_level");
CREATE INDEX "player_profiles_player_id_idx" ON "player_profiles"("player_id");

-- ============================================================================
-- PLAYER STATISTICS
-- ============================================================================

CREATE TABLE "player_statistics" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "total_tournaments" INTEGER NOT NULL DEFAULT 0,
    "total_matches" INTEGER NOT NULL DEFAULT 0,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_losses" INTEGER NOT NULL DEFAULT 0,
    "win_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "average_finish" DECIMAL(6,2),
    "favorite_format" VARCHAR(100),
    "total_prize_won" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_played_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_statistics_pkey" PRIMARY KEY ("id")
);

-- Indexes for player_statistics
CREATE UNIQUE INDEX "player_statistics_player_id_key" ON "player_statistics"("player_id");
CREATE INDEX "player_statistics_tenant_id_player_id_idx" ON "player_statistics"("tenant_id", "player_id");
CREATE INDEX "player_statistics_tenant_id_win_rate_idx" ON "player_statistics"("tenant_id", "win_rate" DESC);
CREATE INDEX "player_statistics_tenant_id_total_tournaments_idx" ON "player_statistics"("tenant_id", "total_tournaments" DESC);
CREATE INDEX "player_statistics_tenant_id_total_prize_won_idx" ON "player_statistics"("tenant_id", "total_prize_won" DESC);

-- ============================================================================
-- ACHIEVEMENT DEFINITIONS
-- ============================================================================

CREATE TABLE "achievement_definitions" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" VARCHAR(500),
    "badge_url" VARCHAR(500),
    "category" VARCHAR(50) NOT NULL,
    "tier" VARCHAR(50) NOT NULL,
    "requirements" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("id")
);

-- Indexes for achievement_definitions
CREATE UNIQUE INDEX "achievement_definitions_code_key" ON "achievement_definitions"("code");
CREATE INDEX "achievement_definitions_category_idx" ON "achievement_definitions"("category");
CREATE INDEX "achievement_definitions_tier_idx" ON "achievement_definitions"("tier");
CREATE INDEX "achievement_definitions_is_active_idx" ON "achievement_definitions"("is_active");

-- ============================================================================
-- PLAYER ACHIEVEMENTS
-- ============================================================================

CREATE TABLE "player_achievements" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 100,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_achievements_pkey" PRIMARY KEY ("id")
);

-- Indexes for player_achievements
CREATE UNIQUE INDEX "player_achievements_player_id_achievement_id_key" ON "player_achievements"("player_id", "achievement_id");
CREATE INDEX "player_achievements_tenant_id_player_id_idx" ON "player_achievements"("tenant_id", "player_id");
CREATE INDEX "player_achievements_tenant_id_achievement_id_idx" ON "player_achievements"("tenant_id", "achievement_id");
CREATE INDEX "player_achievements_unlocked_at_idx" ON "player_achievements"("unlocked_at" DESC);

-- ============================================================================
-- MATCH HISTORY
-- ============================================================================

CREATE TABLE "match_history" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "opponent_id" TEXT NOT NULL,
    "result" VARCHAR(20) NOT NULL,
    "score" JSONB NOT NULL,
    "match_number" INTEGER NOT NULL,
    "round_number" INTEGER NOT NULL,
    "duration_minutes" INTEGER,
    "skill_rating_before" DECIMAL(10,2),
    "skill_rating_after" DECIMAL(10,2),
    "played_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_history_pkey" PRIMARY KEY ("id")
);

-- Indexes for match_history
CREATE INDEX "match_history_tenant_id_player_id_played_at_idx" ON "match_history"("tenant_id", "player_id", "played_at" DESC);
CREATE INDEX "match_history_tenant_id_player_id_opponent_id_idx" ON "match_history"("tenant_id", "player_id", "opponent_id");
CREATE INDEX "match_history_tenant_id_tournament_id_player_id_idx" ON "match_history"("tenant_id", "tournament_id", "player_id");
CREATE INDEX "match_history_match_id_idx" ON "match_history"("match_id");

-- ============================================================================
-- HEAD-TO-HEAD RECORDS
-- ============================================================================

CREATE TABLE "head_to_head_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "player1_id" TEXT NOT NULL,
    "player2_id" TEXT NOT NULL,
    "player1_wins" INTEGER NOT NULL DEFAULT 0,
    "player2_wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "total_matches" INTEGER NOT NULL DEFAULT 0,
    "last_played_at" TIMESTAMP(3) NOT NULL,
    "favors_player1" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "head_to_head_records_pkey" PRIMARY KEY ("id")
);

-- Indexes for head_to_head_records
CREATE UNIQUE INDEX "head_to_head_records_tenant_id_player1_id_player2_id_key" ON "head_to_head_records"("tenant_id", "player1_id", "player2_id");
CREATE INDEX "head_to_head_records_tenant_id_player1_id_idx" ON "head_to_head_records"("tenant_id", "player1_id");
CREATE INDEX "head_to_head_records_tenant_id_player2_id_idx" ON "head_to_head_records"("tenant_id", "player2_id");
CREATE INDEX "head_to_head_records_tenant_id_last_played_at_idx" ON "head_to_head_records"("tenant_id", "last_played_at" DESC);

-- ============================================================================
-- PLAYER SETTINGS
-- ============================================================================

CREATE TABLE "player_settings" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "is_profile_public" BOOLEAN NOT NULL DEFAULT true,
    "show_statistics" BOOLEAN NOT NULL DEFAULT true,
    "show_achievements" BOOLEAN NOT NULL DEFAULT true,
    "show_history" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications" JSONB NOT NULL DEFAULT '{}',
    "push_notifications" JSONB NOT NULL DEFAULT '{}',
    "sms_notifications" JSONB NOT NULL DEFAULT '{}',
    "theme" VARCHAR(20) NOT NULL DEFAULT 'LIGHT',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_settings_pkey" PRIMARY KEY ("id")
);

-- Indexes for player_settings
CREATE UNIQUE INDEX "player_settings_player_id_key" ON "player_settings"("player_id");
CREATE UNIQUE INDEX "player_settings_tenant_id_player_id_key" ON "player_settings"("tenant_id", "player_id");
CREATE INDEX "player_settings_tenant_id_idx" ON "player_settings"("tenant_id");

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Note: Add these foreign key constraints after ensuring referential integrity
-- Uncomment when ready to enforce constraints

-- ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_player_id_fkey"
--     FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_player_id_fkey"
--     FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_player_id_fkey"
--     FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_fkey"
--     FOREIGN KEY ("achievement_id") REFERENCES "achievement_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "match_history" ADD CONSTRAINT "match_history_match_id_fkey"
--     FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "match_history" ADD CONSTRAINT "match_history_player_id_fkey"
--     FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "match_history" ADD CONSTRAINT "match_history_tournament_id_fkey"
--     FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "player_settings" ADD CONSTRAINT "player_settings_player_id_fkey"
--     FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- COMMENTS (PostgreSQL Documentation)
-- ============================================================================

COMMENT ON TABLE "player_profiles" IS 'Extended player profile information with bio, photos, and social links';
COMMENT ON TABLE "player_statistics" IS 'Aggregated player statistics across all tournaments for fast profile loading';
COMMENT ON TABLE "achievement_definitions" IS 'System-wide achievement definitions with unlock requirements';
COMMENT ON TABLE "player_achievements" IS 'Player achievement unlocks with timestamp and progress tracking';
COMMENT ON TABLE "match_history" IS 'Complete match history for every player with detailed statistics';
COMMENT ON TABLE "head_to_head_records" IS 'Pre-computed head-to-head records between two players';
COMMENT ON TABLE "player_settings" IS 'Player-specific settings for privacy, notifications, and display';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next Steps:
-- 1. Run achievement definitions seed (see seeds/achievement-definitions.ts)
-- 2. Backfill player_statistics for existing players
-- 3. Backfill match_history from existing matches
-- 4. Enable foreign key constraints when ready
