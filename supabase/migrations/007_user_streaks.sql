-- Create user_streaks table for gamification system
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

-- Create indexes for efficient queries
CREATE INDEX idx_user_streaks_user ON public.user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON public.user_streaks(streak_type);

-- Enable Row Level Security
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read, insert, and update their own streaks
CREATE POLICY "Users can read own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON public.user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON public.user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Streaks are permanent records - no DELETE policy
