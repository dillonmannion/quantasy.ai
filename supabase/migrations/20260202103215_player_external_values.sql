-- Create player_external_values table for multi-source player valuations
-- Stores dynasty/redraft values from DynastyProcess, FantasyCalc, and KTC
-- System-managed via server-side upserts (no user write access)

CREATE TABLE public.player_external_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('DynastyProcess', 'FantasyCalc', 'KTC')),
  dynasty_value NUMERIC,
  redraft_value NUMERIC,
  raw_value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one record per player per source
CREATE UNIQUE INDEX idx_player_external_values_unique 
  ON public.player_external_values (sleeper_id, source);

-- Index for fast player lookups
CREATE INDEX idx_player_external_values_sleeper_id 
  ON public.player_external_values (sleeper_id);

-- Index for source-specific queries
CREATE INDEX idx_player_external_values_source 
  ON public.player_external_values (source);

-- Enable Row Level Security
ALTER TABLE public.player_external_values ENABLE ROW LEVEL SECURITY;

-- RLS policy: authenticated users can read all external values
CREATE POLICY "External values readable by authenticated users"
  ON public.player_external_values
  FOR SELECT
  TO authenticated
  USING (true);

-- Add table comments for documentation
COMMENT ON TABLE public.player_external_values IS 'Multi-source player valuations from DynastyProcess, FantasyCalc, and KTC';
COMMENT ON COLUMN public.player_external_values.sleeper_id IS 'Sleeper player ID (primary identifier)';
COMMENT ON COLUMN public.player_external_values.source IS 'Value source: DynastyProcess, FantasyCalc, or KTC';
COMMENT ON COLUMN public.player_external_values.dynasty_value IS 'Dynasty format value (nullable - not all sources provide)';
COMMENT ON COLUMN public.player_external_values.redraft_value IS 'Redraft format value (nullable - not all sources provide)';
COMMENT ON COLUMN public.player_external_values.raw_value IS 'Original source data for debugging and auditing';
COMMENT ON COLUMN public.player_external_values.updated_at IS 'Last update timestamp for cache invalidation';
