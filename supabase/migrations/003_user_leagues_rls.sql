-- Add INSERT/UPDATE/DELETE policies for user_leagues
-- Required for connectLeague() server action to work
-- The user_leagues table has RLS enabled (001_initial_schema.sql:106)
-- but only has a SELECT policy. This migration adds the missing policies.

-- Allow users to INSERT their own league associations
CREATE POLICY "Users can insert own leagues"
  ON public.user_leagues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own league associations
CREATE POLICY "Users can update own leagues"
  ON public.user_leagues FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own league associations
CREATE POLICY "Users can delete own leagues"
  ON public.user_leagues FOR DELETE
  USING (auth.uid() = user_id);
