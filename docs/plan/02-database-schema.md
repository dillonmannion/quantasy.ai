# Supabase Database Schema

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete database schema reference for implementation

---

## Implementation Note

> **Re-evaluate When Implementing:** This schema is a starting point. 
> Adjust based on actual Sleeper API response shapes and feature needs.

---

## Core Tables

### profiles
Extends Supabase auth.users for Sleeper-specific data.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sleeper_user_id TEXT UNIQUE,
  sleeper_username TEXT,
  sleeper_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### leagues
Cached league data from Sleeper.

```sql
CREATE TABLE public.leagues (
  id TEXT PRIMARY KEY, -- Sleeper league_id
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  status TEXT, -- 'pre_draft', 'drafting', 'in_season', 'complete'
  settings JSONB, -- scoring settings, roster positions, etc.
  scoring_settings JSONB,
  roster_positions JSONB,
  total_rosters INTEGER,
  cached_at TIMESTAMPTZ DEFAULT now()
);
```

### user_leagues
Junction table for user-league associations.

```sql
CREATE TABLE public.user_leagues (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER, -- user's roster number in this league
  is_owner BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, league_id)
);
```

### rosters
Cached roster data from Sleeper.

```sql
CREATE TABLE public.rosters (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER NOT NULL,
  owner_id TEXT, -- Sleeper user_id
  players TEXT[], -- array of player_ids
  starters TEXT[], -- array of player_ids in starting lineup
  reserve TEXT[], -- IR slots
  settings JSONB, -- wins, losses, points, etc.
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, roster_id)
);
```

### players
Master player list, synced from nflverse/Sleeper.

```sql
CREATE TABLE public.players (
  id TEXT PRIMARY KEY, -- Sleeper player_id
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  team TEXT, -- NFL team abbreviation
  position TEXT, -- QB, RB, WR, TE, K, DEF
  age INTEGER,
  years_exp INTEGER,
  status TEXT, -- Active, Inactive, IR, etc.
  injury_status TEXT,
  -- Projection data (updated weekly during season)
  projected_points DECIMAL(6,2),
  projection_source TEXT,
  projection_updated_at TIMESTAMPTZ,
  -- Metadata
  sleeper_data JSONB, -- raw Sleeper player object
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### matchups
Cached matchup data from Sleeper, per week.

```sql
CREATE TABLE public.matchups (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  matchup_id INTEGER NOT NULL, -- Sleeper's matchup pairing ID
  roster_id INTEGER NOT NULL,
  points DECIMAL(8,2),
  starters TEXT[],
  starters_points DECIMAL(6,2)[],
  players TEXT[],
  players_points JSONB, -- {player_id: points}
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, week, roster_id)
);
```

### algorithm_outputs
Stores algorithm results for "Show Your Work" transparency.

```sql
CREATE TABLE public.algorithm_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  algorithm_type TEXT NOT NULL, -- 'vbd', 'trade_value', 'waiver_priority', 'lineup_optimizer'
  input_params JSONB NOT NULL, -- what was fed into the algorithm
  output_data JSONB NOT NULL, -- recommendations, scores, etc.
  explanation JSONB NOT NULL, -- step-by-step breakdown for transparency
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Indexes

```sql
-- Indexes for common queries
CREATE INDEX idx_rosters_league ON public.rosters(league_id);
CREATE INDEX idx_matchups_league_week ON public.matchups(league_id, week);
CREATE INDEX idx_players_team ON public.players(team);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_algorithm_outputs_user ON public.algorithm_outputs(user_id, algorithm_type);
```

---

## Row-Level Security (RLS) Policies

### Enable RLS

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_outputs ENABLE ROW LEVEL SECURITY;
```

### Policy Definitions

```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see leagues they're in
CREATE POLICY "Users can view their leagues" ON public.user_leagues
  FOR SELECT USING (auth.uid() = user_id);

-- Algorithm outputs are private to user
CREATE POLICY "Users can view own algorithm outputs" ON public.algorithm_outputs
  FOR SELECT USING (auth.uid() = user_id);
```

### Public Read Tables
Leagues, rosters, players, matchups are public read (cached data).
No RLS needed for read-only cached data.

---

## Supabase Edge Functions

```
supabase/functions/
├── sync-league/        # Fetch league data from Sleeper, update cache
├── sync-players/       # Bulk update players table (weekly cron)
├── calculate-vbd/      # VBD algorithm with transparency output
├── optimize-lineup/    # Greedy lineup optimizer
└── evaluate-trade/     # Trade value comparison
```

---

## Related Documents

- [phase-0-foundation.md](./phase-0-foundation.md) - Schema deployment in Phase 0
- [phase-1-data-layer.md](./phase-1-data-layer.md) - Caching strategy implementation
