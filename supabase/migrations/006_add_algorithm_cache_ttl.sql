-- Add caching columns to algorithm_outputs table
-- These columns enable TTL-based caching with deterministic cache keys

-- Add expires_at for TTL tracking (NULL for non-cached entries like AI explanations)
ALTER TABLE algorithm_outputs ADD COLUMN expires_at TIMESTAMPTZ NULL;

-- Add cache_key for deterministic cache lookup (NULL for non-cached entries)
ALTER TABLE algorithm_outputs ADD COLUMN cache_key TEXT NULL;

-- Partial unique index: enforces uniqueness only for non-NULL cache_key values
-- This allows unlimited NULL rows (for vbd_explanation records from AI explain route)
-- while still enabling upsert on cache_key for algorithm cache rows
CREATE UNIQUE INDEX idx_algorithm_outputs_cache_key 
  ON algorithm_outputs(cache_key) 
  WHERE cache_key IS NOT NULL;

-- Add index for cache lookups with expiration check
CREATE INDEX idx_algorithm_outputs_cache_lookup
  ON algorithm_outputs(cache_key, expires_at)
  WHERE cache_key IS NOT NULL;

-- ============================================================================
-- RLS Policy Updates for Shared Cache Support
-- ============================================================================

-- Drop BOTH existing policies (they conflict and block NULL reads)
DROP POLICY IF EXISTS "Users can view own algorithm outputs" ON algorithm_outputs;
DROP POLICY IF EXISTS "Users can manage own outputs" ON algorithm_outputs;

-- SELECT: Users can read:
--   a) Their own outputs (user_id = auth.uid())
--   b) Shared outputs (user_id IS NULL) for leagues they're a member of
-- This ensures users can only see shared VBD caches for their own leagues
CREATE POLICY "Users can read own or shared league outputs"
  ON algorithm_outputs FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (
      user_id IS NULL 
      AND league_id IN (
        SELECT league_id FROM user_leagues WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: Users can only insert their own outputs (user-scoped algorithms)
-- VBD uses service role which bypasses RLS
CREATE POLICY "Users can insert own outputs"
  ON algorithm_outputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only modify their own outputs
-- Shared outputs (user_id IS NULL) can only be modified by service role
CREATE POLICY "Users can update own outputs"
  ON algorithm_outputs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own outputs
CREATE POLICY "Users can delete own outputs"
  ON algorithm_outputs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- App Settings Table for Projection Version Tracking
-- ============================================================================

-- Create app_settings table for global version tracking
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Anyone can read, but NO insert/update policy for regular users
-- Service role bypasses RLS entirely (used for writes)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings" 
  ON app_settings FOR SELECT 
  USING (true);

-- NO write policy for anon/authenticated roles - only service role can write
-- Service role bypasses RLS, so no explicit policy needed

-- Insert initial projection_version (if not exists)
INSERT INTO app_settings (key, value) 
VALUES ('projection_version', '{"version": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger for app_settings
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
