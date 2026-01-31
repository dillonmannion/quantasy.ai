-- Create achievements table for gamification system
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

-- Create index for efficient queries
CREATE INDEX idx_achievements_user ON public.achievements(user_id);
CREATE INDEX idx_achievements_type ON public.achievements(achievement_type);

-- Enable Row Level Security
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read and insert their own achievements
CREATE POLICY "Users can read own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievements are immutable once unlocked - no UPDATE or DELETE policies
