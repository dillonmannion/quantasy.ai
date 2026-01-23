-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sleeper_user_id TEXT UNIQUE,
  sleeper_username TEXT,
  sleeper_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create leagues table
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

-- Create user_leagues junction table
CREATE TABLE public.user_leagues (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER,
  is_owner BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, league_id)
);

-- Create rosters table
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

-- Create players table
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

-- Create matchups table
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

-- Create algorithm_outputs table
CREATE TABLE public.algorithm_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  algorithm_type TEXT NOT NULL,
  input_params JSONB NOT NULL,
  output_data JSONB NOT NULL,
  explanation JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_rosters_league ON public.rosters(league_id);
CREATE INDEX idx_matchups_league_week ON public.matchups(league_id, week);
CREATE INDEX idx_players_team ON public.players(team);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_algorithm_outputs_user ON public.algorithm_outputs(user_id, algorithm_type);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_outputs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view their leagues" 
  ON public.user_leagues FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own algorithm outputs" 
  ON public.algorithm_outputs FOR SELECT 
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
