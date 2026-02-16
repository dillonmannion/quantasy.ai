-- Seed data for E2E testing
-- This file runs after migrations during `supabase db reset`
-- DO NOT include schema changes here - only data insertions

-- =============================================================================
-- TEST LEAGUE DATA
-- =============================================================================

-- Insert test league (matches global-setup.ts league ID)
INSERT INTO public.leagues (id, name, season, status, total_rosters, settings, scoring_settings, roster_positions, cached_at)
VALUES (
  '987654321',
  'Test Fantasy League',
  '2025',
  'in_season',
  12,
  '{"type": 0, "playoff_week_start": 15, "num_teams": 12, "playoff_teams": 6, "leg": 1}',
  '{"rec": 1, "pass_yd": 0.04, "pass_td": 4, "rush_yd": 0.1, "rush_td": 6, "rec_yd": 0.1, "rec_td": 6}',
  '["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN", "BN", "BN", "BN", "BN"]',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  season = EXCLUDED.season,
  status = EXCLUDED.status,
  cached_at = NOW();

-- =============================================================================
-- TEST PLAYER DATA
-- =============================================================================

-- Insert test players with realistic fantasy data
INSERT INTO public.players (id, full_name, first_name, last_name, position, team, age, years_exp, status, projected_points, sleeper_data)
VALUES
  -- Quarterbacks
  ('4046', 'Patrick Mahomes', 'Patrick', 'Mahomes', 'QB', 'KC', 29, 8, 'Active', 380.00, '{"player_id": "4046", "sport": "nfl", "fantasy_positions": ["QB"]}'),
  ('5850', 'Josh Allen', 'Josh', 'Allen', 'QB', 'BUF', 28, 7, 'Active', 370.00, '{"player_id": "5850", "sport": "nfl", "fantasy_positions": ["QB"]}'),
  ('6794', 'Justin Herbert', 'Justin', 'Herbert', 'QB', 'LAC', 26, 5, 'Active', 340.00, '{"player_id": "6794", "sport": "nfl", "fantasy_positions": ["QB"]}'),
  ('4881', 'Lamar Jackson', 'Lamar', 'Jackson', 'QB', 'BAL', 28, 7, 'Active', 360.00, '{"player_id": "4881", "sport": "nfl", "fantasy_positions": ["QB"]}'),
  
  -- Running Backs
  ('4866', 'Saquon Barkley', 'Saquon', 'Barkley', 'RB', 'PHI', 27, 7, 'Active', 310.00, '{"player_id": "4866", "sport": "nfl", "fantasy_positions": ["RB"]}'),
  ('6797', 'Jonathan Taylor', 'Jonathan', 'Taylor', 'RB', 'IND', 25, 5, 'Active', 290.00, '{"player_id": "6797", "sport": "nfl", "fantasy_positions": ["RB"]}'),
  ('7564', 'Breece Hall', 'Breece', 'Hall', 'RB', 'NYJ', 23, 3, 'Active', 270.00, '{"player_id": "7564", "sport": "nfl", "fantasy_positions": ["RB"]}'),
  ('5892', 'Derrick Henry', 'Derrick', 'Henry', 'RB', 'BAL', 30, 9, 'Active', 260.00, '{"player_id": "5892", "sport": "nfl", "fantasy_positions": ["RB"]}'),
  
  -- Wide Receivers  
  ('6786', 'CeeDee Lamb', 'CeeDee', 'Lamb', 'WR', 'DAL', 25, 5, 'Active', 280.00, '{"player_id": "6786", "sport": "nfl", "fantasy_positions": ["WR"]}'),
  ('4035', 'Ja''Marr Chase', 'Ja''Marr', 'Chase', 'WR', 'CIN', 24, 4, 'Active', 275.00, '{"player_id": "4035", "sport": "nfl", "fantasy_positions": ["WR"]}'),
  ('4199', 'Tyreek Hill', 'Tyreek', 'Hill', 'WR', 'MIA', 30, 9, 'Active', 265.00, '{"player_id": "4199", "sport": "nfl", "fantasy_positions": ["WR"]}'),
  ('7553', 'Garrett Wilson', 'Garrett', 'Wilson', 'WR', 'NYJ', 24, 3, 'Active', 250.00, '{"player_id": "7553", "sport": "nfl", "fantasy_positions": ["WR"]}'),
  
  -- Tight Ends
  ('4034', 'Travis Kelce', 'Travis', 'Kelce', 'TE', 'KC', 35, 12, 'Active', 250.00, '{"player_id": "4034", "sport": "nfl", "fantasy_positions": ["TE"]}'),
  ('6801', 'Sam LaPorta', 'Sam', 'LaPorta', 'TE', 'DET', 23, 2, 'Active', 200.00, '{"player_id": "6801", "sport": "nfl", "fantasy_positions": ["TE"]}'),
  
  -- Kickers
  ('4029', 'Justin Tucker', 'Justin', 'Tucker', 'K', 'BAL', 34, 13, 'Active', 150.00, '{"player_id": "4029", "sport": "nfl", "fantasy_positions": ["K"]}'),
  
  -- Defense
  ('SF', 'San Francisco 49ers', 'San Francisco', '49ers', 'DEF', 'SF', NULL, NULL, 'Active', 130.00, '{"player_id": "SF", "sport": "nfl", "fantasy_positions": ["DEF"]}')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  position = EXCLUDED.position,
  team = EXCLUDED.team,
  projected_points = EXCLUDED.projected_points,
  sleeper_data = EXCLUDED.sleeper_data;

-- =============================================================================
-- TEST ROSTER DATA
-- =============================================================================

-- Insert test roster for the test league
INSERT INTO public.rosters (league_id, roster_id, owner_id, players, starters, reserve, settings, cached_at)
VALUES (
  '987654321',
  1,
  'test-sleeper-user-123',
  ARRAY['4046', '5850', '4866', '6797', '6786', '4035', '4034', '4029', 'SF'],
  ARRAY['4046', '4866', '6797', '6786', '4035', '4034', '4866', '4029', 'SF'],
  ARRAY[]::TEXT[],
  '{"wins": 5, "losses": 3, "ties": 0, "fpts": 850.5}',
  NOW()
)
ON CONFLICT (league_id, roster_id) DO UPDATE SET
  players = EXCLUDED.players,
  starters = EXCLUDED.starters,
  settings = EXCLUDED.settings,
  cached_at = NOW();

-- =============================================================================
-- TEST MATCHUP DATA
-- =============================================================================

-- Insert test matchups for week 1
INSERT INTO public.matchups (league_id, week, matchup_id, roster_id, points, starters, starters_points, cached_at)
VALUES 
  ('987654321', 1, 1, 1, 125.50, ARRAY['4046', '4866', '6797', '6786', '4035', '4034', '4866', '4029', 'SF'], ARRAY[28.5, 22.0, 18.5, 15.0, 14.5, 12.0, 8.0, 5.0, 2.0], NOW()),
  ('987654321', 1, 1, 2, 118.25, ARRAY['5850', '7564', '5892', '4199', '7553', '6801', '7564', '4029', 'SF'], ARRAY[26.0, 20.0, 19.0, 16.5, 13.0, 10.0, 7.75, 4.0, 2.0], NOW())
ON CONFLICT (league_id, week, roster_id) DO UPDATE SET
  points = EXCLUDED.points,
  starters = EXCLUDED.starters,
  starters_points = EXCLUDED.starters_points,
  cached_at = NOW();
