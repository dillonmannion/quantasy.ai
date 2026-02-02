-- Create waiver_bid_history table for tracking recommended vs actual bids
-- Supports FAAB bid recommendation improvements and user bid history analysis

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

-- Add indexes for common query patterns
CREATE INDEX idx_waiver_bid_history_user ON public.waiver_bid_history(user_id);
CREATE INDEX idx_waiver_bid_history_league ON public.waiver_bid_history(league_id);
CREATE INDEX idx_waiver_bid_history_created_at ON public.waiver_bid_history(created_at DESC);
CREATE INDEX idx_waiver_bid_history_composite ON public.waiver_bid_history(user_id, league_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.waiver_bid_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only access their own bid history
CREATE POLICY "Users can manage their own bid history"
  ON public.waiver_bid_history
  FOR ALL
  USING (auth.uid() = user_id);

-- Add table comment for documentation
COMMENT ON TABLE public.waiver_bid_history IS 'Tracks waiver bid recommendations vs actual bids for algorithm improvement';
COMMENT ON COLUMN public.waiver_bid_history.recommended_bid IS 'Algorithm-suggested FAAB bid amount';
COMMENT ON COLUMN public.waiver_bid_history.actual_bid IS 'User-placed FAAB bid amount';
COMMENT ON COLUMN public.waiver_bid_history.won IS 'Whether the user won the waiver claim';
