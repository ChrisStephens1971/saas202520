-- Sprint 9 Phase 2 - Analytics Dashboard
-- Data Aggregation Queries for API Endpoints
--
-- These queries provide the data for the analytics dashboard.
-- Optimize with appropriate indexes and caching strategy.

-- =================================================================
-- OVERVIEW ANALYTICS (/api/admin/analytics/overview)
-- =================================================================

-- Total users (current and previous period)
SELECT
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM users WHERE created_at < :previous_period_start) as previous_total_users
FROM users
WHERE created_at <= :end_date;

-- Active users (logged in within date range)
SELECT
  COUNT(DISTINCT user_id) as active_users,
  (SELECT COUNT(DISTINCT user_id)
   FROM sessions
   WHERE last_active BETWEEN :previous_period_start AND :previous_period_end) as previous_active_users
FROM sessions
WHERE last_active BETWEEN :start_date AND :end_date;

-- Tournament counts by status
SELECT
  COUNT(*) as total_tournaments,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tournaments,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tournaments,
  (SELECT COUNT(*) FROM tournaments WHERE created_at BETWEEN :previous_period_start AND :previous_period_end) as previous_total_tournaments
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date;

-- Matches played
SELECT
  COUNT(*) as total_matches,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_matches,
  (SELECT COUNT(*) FROM matches WHERE created_at BETWEEN :previous_period_start AND :previous_period_end) as previous_matches
FROM matches
WHERE created_at BETWEEN :start_date AND :end_date;

-- Revenue (if payment system exists)
SELECT
  COALESCE(SUM(amount), 0) as revenue,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at BETWEEN :previous_period_start AND :previous_period_end AND status = 'completed') as previous_revenue
FROM payments
WHERE created_at BETWEEN :start_date AND :end_date
  AND status = 'completed';

-- User growth chart data
SELECT
  DATE(created_at) as date,
  COUNT(*) as users,
  (SELECT COUNT(DISTINCT user_id)
   FROM sessions
   WHERE DATE(last_active) = DATE(u.created_at)) as active_users
FROM users u
WHERE created_at BETWEEN :start_date AND :end_date
GROUP BY DATE(created_at)
ORDER BY date;

-- Tournament activity chart
SELECT
  DATE(created_at) as date,
  COUNT(*) as created,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date
GROUP BY DATE(created_at)
ORDER BY date;

-- Match status distribution
SELECT
  status as name,
  COUNT(*) as value
FROM matches
WHERE created_at BETWEEN :start_date AND :end_date
GROUP BY status;

-- =================================================================
-- USER ANALYTICS (/api/admin/analytics/users)
-- =================================================================

-- New users by day
SELECT
  DATE(created_at) as date,
  COUNT(*) as users
FROM users
WHERE created_at BETWEEN :start_date AND :end_date
GROUP BY DATE(created_at)
ORDER BY date;

-- Daily/Weekly/Monthly Active Users
SELECT
  DATE(last_active) as date,
  COUNT(DISTINCT user_id) as dau
FROM sessions
WHERE last_active BETWEEN :start_date AND :end_date
GROUP BY DATE(last_active)
ORDER BY date;

-- Weekly Active Users (last 7 days)
SELECT COUNT(DISTINCT user_id) as wau
FROM sessions
WHERE last_active >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Monthly Active Users (last 30 days)
SELECT COUNT(DISTINCT user_id) as mau
FROM sessions
WHERE last_active >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Role distribution
SELECT
  role,
  COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;

-- User retention (users who returned after signup)
-- Week 1: Users who returned within 7 days of signup
-- Week 2: Users who returned between 7-14 days
-- etc.
SELECT
  DATE_FORMAT(created_at, '%Y-%m') as cohort,
  COUNT(DISTINCT CASE
    WHEN DATEDIFF(session_date, created_at) <= 7
    THEN user_id
  END) * 100.0 / COUNT(DISTINCT user_id) as week1,
  COUNT(DISTINCT CASE
    WHEN DATEDIFF(session_date, created_at) BETWEEN 8 AND 14
    THEN user_id
  END) * 100.0 / COUNT(DISTINCT user_id) as week2,
  COUNT(DISTINCT CASE
    WHEN DATEDIFF(session_date, created_at) BETWEEN 15 AND 21
    THEN user_id
  END) * 100.0 / COUNT(DISTINCT user_id) as week3,
  COUNT(DISTINCT CASE
    WHEN DATEDIFF(session_date, created_at) BETWEEN 22 AND 28
    THEN user_id
  END) * 100.0 / COUNT(DISTINCT user_id) as week4
FROM (
  SELECT
    u.id as user_id,
    u.created_at,
    DATE(s.last_active) as session_date
  FROM users u
  LEFT JOIN sessions s ON u.id = s.user_id
  WHERE u.created_at BETWEEN :start_date AND :end_date
) cohort_data
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY cohort DESC;

-- Average session duration
SELECT
  AVG(TIMESTAMPDIFF(MINUTE, created_at, ended_at)) as avg_session_duration
FROM sessions
WHERE ended_at IS NOT NULL
  AND created_at BETWEEN :start_date AND :end_date;

-- Churn rate (users who haven't logged in for 30+ days)
SELECT
  (COUNT(CASE WHEN last_active < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) * 100.0 / COUNT(*)) as churn_rate
FROM users
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- =================================================================
-- TOURNAMENT ANALYTICS (/api/admin/analytics/tournaments)
-- =================================================================

-- Tournament activity by day
SELECT
  DATE(created_at) as date,
  COUNT(*) as created,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date
GROUP BY DATE(created_at)
ORDER BY date;

-- Format distribution
SELECT
  format,
  COUNT(*) as count
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date
GROUP BY format
ORDER BY count DESC;

-- Matches per day
SELECT
  DATE(m.created_at) as date,
  COUNT(*) as matches,
  SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) as completed
FROM matches m
WHERE m.created_at BETWEEN :start_date AND :end_date
GROUP BY DATE(m.created_at)
ORDER BY date;

-- Tournament status distribution
SELECT
  status as name,
  COUNT(*) as value
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date
GROUP BY status;

-- Average tournament duration (in minutes)
SELECT
  AVG(TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW()))) as avg_duration
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date
  AND start_time IS NOT NULL;

-- Average players per tournament
SELECT
  AVG(player_count) as avg_players
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date;

-- Completion rate
SELECT
  (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)) as completion_rate
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date;

-- Top tournaments by various metrics
SELECT
  id,
  name,
  format,
  player_count as players,
  match_count as matches,
  (status = 'completed') as completed,
  TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW())) as duration
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date
ORDER BY player_count DESC
LIMIT 10;

-- Average matches per tournament
SELECT
  AVG(match_count) as avg_matches_per_tournament
FROM tournaments
WHERE created_at BETWEEN :start_date AND :end_date;

-- =================================================================
-- PERFORMANCE ANALYTICS (/api/admin/analytics/performance)
-- =================================================================

-- Note: These queries assume you have a performance_logs table
-- that captures API request/response data. Structure:
-- CREATE TABLE performance_logs (
--   id BIGINT PRIMARY KEY AUTO_INCREMENT,
--   timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   endpoint VARCHAR(255),
--   method VARCHAR(10),
--   response_time INT,
--   status_code INT,
--   error_message TEXT,
--   user_id INT
-- );

-- Average response time
SELECT
  AVG(response_time) as avg_response_time,
  (SELECT AVG(response_time)
   FROM performance_logs
   WHERE timestamp BETWEEN :previous_period_start AND :previous_period_end) as previous_avg_response_time
FROM performance_logs
WHERE timestamp BETWEEN :start_date AND :end_date;

-- P95 response time (95th percentile)
SELECT
  response_time as p95_response_time
FROM performance_logs
WHERE timestamp BETWEEN :start_date AND :end_date
ORDER BY response_time
LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.95 AS UNSIGNED) FROM performance_logs WHERE timestamp BETWEEN :start_date AND :end_date);

-- Error rate
SELECT
  (COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*)) as error_rate,
  (SELECT COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*)
   FROM performance_logs
   WHERE timestamp BETWEEN :previous_period_start AND :previous_period_end) as previous_error_rate
FROM performance_logs
WHERE timestamp BETWEEN :start_date AND :end_date;

-- Response time over time
SELECT
  DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as timestamp,
  AVG(response_time) as response_time,
  (COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*)) as error_rate,
  COUNT(*) as throughput
FROM performance_logs
WHERE timestamp BETWEEN :start_date AND :end_date
GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')
ORDER BY timestamp;

-- Recent errors (last 100)
SELECT
  timestamp,
  endpoint,
  method,
  status_code,
  error_message as message,
  COUNT(*) as count
FROM performance_logs
WHERE status_code >= 400
  AND timestamp BETWEEN :start_date AND :end_date
GROUP BY endpoint, method, status_code, error_message
ORDER BY timestamp DESC
LIMIT 100;

-- Slow queries (if using query performance logging)
-- This assumes you have a slow_query_log table
SELECT
  query_text as query,
  AVG(execution_time) as avg_duration,
  COUNT(*) as count
FROM slow_query_log
WHERE timestamp BETWEEN :start_date AND :end_date
GROUP BY query_text
HAVING AVG(execution_time) > 100  -- Queries taking more than 100ms
ORDER BY avg_duration DESC
LIMIT 20;

-- Active connections (current)
-- This is typically obtained from database status, not a query
-- Example for MySQL:
SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Threads_running');

-- Requests per minute
SELECT
  COUNT(*) / TIMESTAMPDIFF(MINUTE, MIN(timestamp), MAX(timestamp)) as requests_per_minute
FROM performance_logs
WHERE timestamp BETWEEN :start_date AND :end_date;

-- =================================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- =================================================================

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- Tournaments table
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at ON tournaments(created_at);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_format ON tournaments(format);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_time ON tournaments(start_time);

-- Matches table
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Performance logs table
CREATE INDEX IF NOT EXISTS idx_perf_timestamp ON performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_perf_endpoint ON performance_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_perf_status_code ON performance_logs(status_code);

-- Payments table (if exists)
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =================================================================
-- MATERIALIZED VIEWS (Optional - for better performance)
-- =================================================================

-- Daily user activity summary
CREATE TABLE IF NOT EXISTS daily_user_activity (
  activity_date DATE PRIMARY KEY,
  new_users INT,
  active_users INT,
  returning_users INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Daily tournament summary
CREATE TABLE IF NOT EXISTS daily_tournament_summary (
  activity_date DATE PRIMARY KEY,
  tournaments_created INT,
  tournaments_completed INT,
  tournaments_active INT,
  total_matches INT,
  completed_matches INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Refresh materialized views (run daily via cron)
-- INSERT INTO daily_user_activity (activity_date, new_users, active_users)
-- SELECT DATE(created_at), COUNT(*), (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE DATE(last_active) = DATE(created_at))
-- FROM users
-- WHERE DATE(created_at) = CURDATE()
-- ON DUPLICATE KEY UPDATE new_users = VALUES(new_users), active_users = VALUES(active_users);

-- =================================================================
-- CACHING STRATEGY (Redis Keys)
-- =================================================================

-- Cache keys format:
-- analytics:overview:{startDate}:{endDate}  (TTL: 1800s)
-- analytics:users:{startDate}:{endDate}     (TTL: 3600s)
-- analytics:tournaments:{startDate}:{endDate} (TTL: 3600s)
-- analytics:performance:{timestamp}         (TTL: 300s)

-- Invalidate cache on:
-- - User registration
-- - Tournament creation/update
-- - Match completion
-- - Manual refresh
