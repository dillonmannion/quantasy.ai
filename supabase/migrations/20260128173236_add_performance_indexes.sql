-- Add performance indexes for player and algorithm queries
-- These indexes optimize the most common query patterns in the application

-- ============================================================================
-- Players Table Indexes
-- ============================================================================

-- Composite index: Optimizes /api/players position filter + projection sort
-- Query pattern: SELECT * FROM players WHERE position = 'QB' ORDER BY projected_points DESC LIMIT 50
-- Without index: Full table scan (Seq Scan) on 10k+ players
-- With index: Index Scan using idx_players_position_projection (fast keyset pagination)
-- 
-- Why DESC on projected_points:
-- - API sorts by projected_points DESC (highest first)
-- - DESC index allows efficient reverse iteration without sort step
-- - Keyset pagination uses (projected_points, id) for cursor positioning
CREATE INDEX idx_players_position_projection 
  ON players(position, projected_points DESC)
  WHERE position IS NOT NULL;

-- ============================================================================
-- Algorithm Outputs Table Indexes
-- ============================================================================

-- Index: Optimizes cache cleanup queries for expired entries
-- Query pattern: DELETE FROM algorithm_outputs WHERE expires_at < now()
-- Use case: Background job to clean up expired cache entries (future implementation)
-- Without index: Full table scan on algorithm_outputs
-- With index: Index Scan using idx_algorithm_outputs_expires (fast cleanup)
--
-- Partial index (WHERE expires_at IS NOT NULL):
-- - Only indexes rows with TTL (cached entries)
-- - Excludes NULL rows (AI explanation records without expiration)
-- - Reduces index size and improves write performance
CREATE INDEX idx_algorithm_outputs_expires 
  ON algorithm_outputs(expires_at)
  WHERE expires_at IS NOT NULL;
