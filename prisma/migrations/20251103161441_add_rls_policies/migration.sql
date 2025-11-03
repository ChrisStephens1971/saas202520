-- Enable Row-Level Security (RLS) for Multi-Tenant Isolation
-- This migration adds RLS policies to ensure tenant data isolation at the database level

-- ============================================================================
-- Create authenticated role if it doesn't exist (must be FIRST)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Create function to get current tenant from session variable
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_org_id', TRUE);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TOURNAMENTS TABLE RLS
-- ============================================================================

CREATE POLICY "tenant_isolation_tournaments"
ON tournaments
FOR ALL
TO authenticated
USING (org_id = current_tenant_id());

-- ============================================================================
-- TOURNAMENT_EVENTS TABLE RLS (Read-only for audit log)
-- ============================================================================

CREATE POLICY "tenant_isolation_tournament_events"
ON tournament_events
FOR SELECT
TO authenticated
USING (tournament_id IN (
  SELECT id FROM tournaments WHERE org_id = current_tenant_id()
));

-- Allow INSERT for event sourcing (but still tenant-scoped)
CREATE POLICY "tenant_insert_tournament_events"
ON tournament_events
FOR INSERT
TO authenticated
WITH CHECK (tournament_id IN (
  SELECT id FROM tournaments WHERE org_id = current_tenant_id()
));

-- ============================================================================
-- PLAYERS TABLE RLS
-- ============================================================================

CREATE POLICY "tenant_isolation_players"
ON players
FOR ALL
TO authenticated
USING (tournament_id IN (
  SELECT id FROM tournaments WHERE org_id = current_tenant_id()
));

-- ============================================================================
-- MATCHES TABLE RLS
-- ============================================================================

CREATE POLICY "tenant_isolation_matches"
ON matches
FOR ALL
TO authenticated
USING (tournament_id IN (
  SELECT id FROM tournaments WHERE org_id = current_tenant_id()
));

-- ============================================================================
-- TABLES TABLE RLS
-- ============================================================================

CREATE POLICY "tenant_isolation_tables"
ON tables
FOR ALL
TO authenticated
USING (tournament_id IN (
  SELECT id FROM tournaments WHERE org_id = current_tenant_id()
));

