-- =============================================================================
-- Quantasy — Consolidated Initial Schema
-- 
-- Merged from 13 incremental migrations into a single setup file.
-- Creates the complete database schema for the Quantasy fantasy football app.
--
-- Sections:
--   1. Extensions
--   2. Utility Functions
--   3. Core Tables (profiles, leagues, user_leagues, rosters, players, matchups, algorithm_outputs)
--   4. Feature Tables (app_settings, user_streaks, achievements, waiver_bid_history, player_external_values, feedback)
--   5. Indexes
--   6. Row Level Security (RLS)
--   7. Triggers
--   8. Seed Data
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 2. UTILITY FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-create profile row when a user signs up via Supabase Auth
-- SECURITY DEFINER allows trigger to insert into public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- =============================================================================
-- 3. CORE TABLES
-- =============================================================================

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sleeper_user_id TEXT UNIQUE,
  sleeper_username TEXT,
  sleeper_avatar TEXT,
  gamification_counters JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cached Sleeper league data
CREATE TABLE public.leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  status TEXT,
  settings JSONB,
  scoring_settings JSONB,
  roster_positions JSONB,
  total_rosters INTEGER,
  cached_at TIMESTAMPTZ DEFAULT now()
);

-- User ↔ League associations
CREATE TABLE public.user_leagues (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER,
  is_owner BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, league_id)
);

-- Cached roster data per league
CREATE TABLE public.rosters (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER NOT NULL,
  owner_id TEXT,
  players TEXT[],
  starters TEXT[],
  reserve TEXT[],
  settings JSONB,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, roster_id)
);

-- Player reference data with projections
CREATE TABLE public.players (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  team TEXT,
  position TEXT,
  age INTEGER,
  years_exp INTEGER,
  status TEXT,
  injury_status TEXT,
  projected_points DECIMAL(6,2),
  projection_source TEXT,
  projection_updated_at TIMESTAMPTZ,
  sleeper_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly matchup data per league
CREATE TABLE public.matchups (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  matchup_id INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  points DECIMAL(8,2),
  starters TEXT[],
  starters_points DECIMAL(6,2)[],
  players TEXT[],
  players_points JSONB,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, week, roster_id)
);

-- Algorithm results with TTL-based caching
-- user_id is nullable: NULL = shared league cache (written by service_role)
CREATE TABLE public.algorithm_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  algorithm_type TEXT NOT NULL,
  input_params JSONB NOT NULL,
  output_data JSONB NOT NULL,
  explanation JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  cache_key TEXT NULL
);


-- =============================================================================
-- 4. FEATURE TABLES
-- =============================================================================

-- Global app settings (projection version tracking, etc.)
-- Only service_role can write (bypasses RLS)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gamification: user activity streaks
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN (
    'DAILY_LOGIN',
    'WEEKLY_LINEUP_REVIEW',
    'DRAFT_RESEARCH',
    'WAIVER_WIRE_WEDNESDAY'
  )),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_at TIMESTAMPTZ,
  streak_start_date DATE,
  UNIQUE (user_id, streak_type)
);

-- Gamification: unlockable achievements (immutable once earned)
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN (
    'READ_10_EXPLANATIONS',
    'MADE_FIRST_DRAFT_PICK',
    'VERIFIED_5_VBD',
    'COMPLETED_DRAFT',
    'MADE_FIRST_TRADE',
    'APPLIED_OPTIMAL_LINEUP',
    'WEEK_1_REVIEW',
    'SEVEN_DAY_STREAK'
  )),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE (user_id, achievement_type)
);

-- Waiver bid tracking: recommended vs actual bids for algorithm improvement
CREATE TABLE public.waiver_bid_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id TEXT NOT NULL,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 18),
  player_id TEXT NOT NULL,
  recommended_bid INTEGER NOT NULL CHECK (recommended_bid >= 0),
  actual_bid INTEGER NOT NULL CHECK (actual_bid >= 0),
  won BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Multi-source player valuations (DynastyProcess, FantasyCalc, KTC)
-- System-managed via service_role upserts (no user write access)
CREATE TABLE public.player_external_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('DynastyProcess', 'FantasyCalc', 'KTC')),
  dynasty_value NUMERIC,
  redraft_value NUMERIC,
  raw_value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alpha tester feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('draft', 'roster', 'trade', 'waivers', 'other')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);


-- Atomically increment a gamification counter for the authenticated user
-- Defined after tables because LANGUAGE sql validates references at creation time
CREATE OR REPLACE FUNCTION public.increment_gamification_counter(
  target_user_id uuid,
  counter_key text,
  increment_by int DEFAULT 1
)
RETURNS jsonb
LANGUAGE sql
AS $$
  UPDATE public.profiles
  SET gamification_counters = jsonb_set(
    gamification_counters,
    ARRAY[counter_key],
    to_jsonb(COALESCE((gamification_counters ->> counter_key)::int, 0) + increment_by),
    true
  )
  WHERE id = auth.uid() AND id = target_user_id
  RETURNING gamification_counters;
$$;


-- =============================================================================
-- 5. INDEXES
-- =============================================================================

-- Core table indexes
CREATE INDEX idx_rosters_league ON public.rosters(league_id);
CREATE INDEX idx_matchups_league_week ON public.matchups(league_id, week);
CREATE INDEX idx_players_team ON public.players(team);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_algorithm_outputs_user ON public.algorithm_outputs(user_id, algorithm_type);

-- Algorithm cache indexes
CREATE UNIQUE INDEX idx_algorithm_outputs_cache_key
  ON public.algorithm_outputs(cache_key)
  WHERE cache_key IS NOT NULL;

CREATE INDEX idx_algorithm_outputs_cache_lookup
  ON public.algorithm_outputs(cache_key, expires_at)
  WHERE cache_key IS NOT NULL;

-- Performance indexes
CREATE INDEX idx_players_position_projection
  ON public.players(position, projected_points DESC)
  WHERE position IS NOT NULL;

CREATE INDEX idx_algorithm_outputs_expires
  ON public.algorithm_outputs(expires_at)
  WHERE expires_at IS NOT NULL;

-- User streaks indexes
CREATE INDEX idx_user_streaks_user ON public.user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON public.user_streaks(streak_type);

-- Achievements indexes
CREATE INDEX idx_achievements_user ON public.achievements(user_id);
CREATE INDEX idx_achievements_type ON public.achievements(achievement_type);

-- Waiver bid history indexes
CREATE INDEX idx_waiver_bid_history_user ON public.waiver_bid_history(user_id);
CREATE INDEX idx_waiver_bid_history_league ON public.waiver_bid_history(league_id);
CREATE INDEX idx_waiver_bid_history_created_at ON public.waiver_bid_history(created_at DESC);
CREATE INDEX idx_waiver_bid_history_composite ON public.waiver_bid_history(user_id, league_id, created_at DESC);

-- Player external values indexes
CREATE UNIQUE INDEX idx_player_external_values_unique
  ON public.player_external_values(sleeper_id, source);

CREATE INDEX idx_player_external_values_sleeper_id
  ON public.player_external_values(sleeper_id);

CREATE INDEX idx_player_external_values_source
  ON public.player_external_values(source);

-- Feedback indexes
CREATE INDEX idx_feedback_user ON public.feedback(user_id);
CREATE INDEX idx_feedback_feature ON public.feedback(feature);


-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_bid_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_external_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---- leagues ----
CREATE POLICY "Users can read their leagues"
  ON public.leagues FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT league_id FROM public.user_leagues
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages leagues"
  ON public.leagues FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- user_leagues ----
CREATE POLICY "Users can view their leagues"
  ON public.user_leagues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leagues"
  ON public.user_leagues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leagues"
  ON public.user_leagues FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own leagues"
  ON public.user_leagues FOR DELETE
  USING (auth.uid() = user_id);

-- ---- rosters ----
CREATE POLICY "Users can read rosters from their leagues"
  ON public.rosters FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM public.user_leagues
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages rosters"
  ON public.rosters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- players ----
CREATE POLICY "Players are readable by authenticated users"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages players"
  ON public.players FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- matchups ----
CREATE POLICY "Users can read matchups from their leagues"
  ON public.matchups FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM public.user_leagues
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages matchups"
  ON public.matchups FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- algorithm_outputs ----
-- Users can read their own outputs OR shared league caches (user_id IS NULL)
CREATE POLICY "Users can read own or shared league outputs"
  ON public.algorithm_outputs FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND league_id IN (
        SELECT league_id FROM public.user_leagues WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own outputs"
  ON public.algorithm_outputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outputs"
  ON public.algorithm_outputs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own outputs"
  ON public.algorithm_outputs FOR DELETE
  USING (auth.uid() = user_id);

-- ---- app_settings ----
-- Readable by all; writable only by service_role (bypasses RLS)
CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- ---- user_streaks ----
CREATE POLICY "Users can read own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON public.user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON public.user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- ---- achievements ----
-- Immutable once unlocked: no UPDATE or DELETE policies
CREATE POLICY "Users can read own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---- waiver_bid_history ----
CREATE POLICY "Users can manage their own bid history"
  ON public.waiver_bid_history FOR ALL
  USING (auth.uid() = user_id);

-- ---- player_external_values ----
-- Read-only for users; written by service_role
CREATE POLICY "External values readable by authenticated users"
  ON public.player_external_values FOR SELECT
  TO authenticated
  USING (true);

-- ---- feedback ----
CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================

-- Auto-update updated_at on profiles
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update updated_at on app_settings
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 8. SEED DATA
-- =============================================================================

-- Initial projection version for cache invalidation
INSERT INTO public.app_settings (key, value)
VALUES ('projection_version', '{"version": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Backfill profiles for any existing auth users without one
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE public.waiver_bid_history IS 'Tracks waiver bid recommendations vs actual bids for algorithm improvement';
COMMENT ON COLUMN public.waiver_bid_history.recommended_bid IS 'Algorithm-suggested FAAB bid amount';
COMMENT ON COLUMN public.waiver_bid_history.actual_bid IS 'User-placed FAAB bid amount';
COMMENT ON COLUMN public.waiver_bid_history.won IS 'Whether the user won the waiver claim';

COMMENT ON TABLE public.player_external_values IS 'Multi-source player valuations from DynastyProcess, FantasyCalc, and KTC';
COMMENT ON COLUMN public.player_external_values.sleeper_id IS 'Sleeper player ID (primary identifier)';
COMMENT ON COLUMN public.player_external_values.source IS 'Value source: DynastyProcess, FantasyCalc, or KTC';
COMMENT ON COLUMN public.player_external_values.dynasty_value IS 'Dynasty format value (nullable - not all sources provide)';
COMMENT ON COLUMN public.player_external_values.redraft_value IS 'Redraft format value (nullable - not all sources provide)';
COMMENT ON COLUMN public.player_external_values.raw_value IS 'Original source data for debugging and auditing';
COMMENT ON COLUMN public.player_external_values.updated_at IS 'Last update timestamp for cache invalidation';
