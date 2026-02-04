-- Create feedback table for alpha tester submissions
-- Tracks user feedback on specific features with ratings and optional text

CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('draft', 'roster', 'trade', 'waivers', 'other')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_feedback_user ON public.feedback(user_id);
CREATE INDEX idx_feedback_feature ON public.feedback(feature);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
