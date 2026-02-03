-- =============================================================================
-- Migration: 005_missing_rls_policies.sql
-- Purpose: Enable RLS on tables that are currently public (security fix)
-- 
-- SECURITY CONTEXT:
-- This migration fixes 4 RLS errors identified by Supabase Security Advisors:
-- - leagues, rosters, players, matchups tables were public without RLS
--
-- RLS STRATEGY:
-- - authenticated users: Can SELECT data from their leagues (via user_leagues)
-- - service_role: Full access for caching operations (bypasses RLS)
-- - players table: Read-only for all authenticated users (shared reference data)
--
-- FUTURE MIGRATION PATH:
-- Currently using service_role for all writes (caching from Sleeper API).
-- When user-initiated writes are needed, add granular INSERT/UPDATE policies.
-- =============================================================================

-- Enable RLS on tables missing it
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PLAYERS TABLE POLICIES
-- Players are shared reference data - readable by any authenticated user
-- =============================================================================

CREATE POLICY "Players are readable by authenticated users"
ON public.players FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages players"
ON public.players FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- LEAGUES TABLE POLICIES
-- Users can only read leagues they're members of (via user_leagues junction)
-- =============================================================================

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

-- =============================================================================
-- ROSTERS TABLE POLICIES
-- Users can only read rosters from leagues they're members of
-- =============================================================================

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

-- =============================================================================
-- MATCHUPS TABLE POLICIES
-- Users can only read matchups from leagues they're members of
-- =============================================================================

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

-- =============================================================================
-- FIX FUNCTION SEARCH_PATH WARNING
-- handle_updated_at() had mutable search_path (security warning)
-- =============================================================================

ALTER FUNCTION public.handle_updated_at() SET search_path = public;
