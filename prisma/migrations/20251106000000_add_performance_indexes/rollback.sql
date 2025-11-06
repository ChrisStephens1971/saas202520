-- Rollback Script for Performance Indexes Migration
-- Date: 2025-11-06
-- Purpose: Remove all performance indexes added in this migration
--
-- IMPORTANT: Only run this if you need to rollback the migration.
-- Removing these indexes will negatively impact query performance.

-- ============================================================================
-- TOURNAMENTS - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_tournaments_status;
DROP INDEX IF EXISTS idx_tournaments_start_date;
DROP INDEX IF EXISTS idx_tournaments_org_status;

-- ============================================================================
-- MATCHES - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_matches_tournament_status;
DROP INDEX IF EXISTS idx_matches_completed_at;
DROP INDEX IF EXISTS idx_matches_table_state;

-- ============================================================================
-- PLAYERS - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_players_tournament_user;
DROP INDEX IF EXISTS idx_players_tournament_status;
DROP INDEX IF EXISTS idx_players_chip_count;

-- ============================================================================
-- USERS - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role_status;

-- ============================================================================
-- AUDIT LOGS - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_audit_logs_org_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_user_timestamp;

-- ============================================================================
-- NOTIFICATIONS - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_notifications_org_status;
DROP INDEX IF EXISTS idx_notifications_tournament_status;

-- ============================================================================
-- PAYMENTS - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_payments_tournament_status;
DROP INDEX IF EXISTS idx_payments_created_at;

-- ============================================================================
-- ORGANIZATION MEMBERS - Remove indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_org_members_org_role;

-- Rollback complete. All performance indexes removed.
