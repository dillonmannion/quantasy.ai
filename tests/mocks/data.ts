// Mock data for E2E tests - matches Sleeper API types

export const TEST_USER = {
  user_id: 'test-sleeper-user-123',
  username: 'testuser',
  display_name: 'Test User',
  avatar: null,
}

export const TEST_LEAGUE = {
  league_id: '987654321',
  name: 'Test Fantasy League',
  season: '2025',
  status: 'in_season' as const,
  sport: 'nfl' as const,
  total_rosters: 12,
  settings: {
    type: 0,
    playoff_week_start: 15,
    num_teams: 12,
    playoff_teams: 6,
    leg: 1,
  },
  scoring_settings: { rec: 1, pass_yd: 0.04, pass_td: 4, rush_yd: 0.1, rush_td: 6, rec_yd: 0.1, rec_td: 6 },
  roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'],
  previous_league_id: null,
  draft_id: 'draft123',
}

export const TEST_DRAFT = {
  draft_id: 'draft123',
  league_id: '987654321',
  type: 'snake' as const,
  status: 'pre_draft' as const,
  start_time: null,
  settings: {
    teams: 12,
    rounds: 15,
    pick_timer: 120,
  },
  draft_order: null,
  slot_to_roster_id: {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
    7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12
  },
}

export const TEST_NFL_STATE = {
  season: '2025',
  season_type: 'regular' as const,
  week: 1,
  leg: 1,
  display_week: 1,
  season_start_date: '2025-09-04',
  previous_season: '2024',
}

export const TEST_ROSTERS = [
  {
    roster_id: 1,
    owner_id: 'test-sleeper-user-123',
    league_id: '987654321',
    players: ['4046', '6794', '4034'], // Mahomes, Herbert, Kelce
    starters: ['4046', '6794'],
    reserve: null,
    taxi: null,
    keepers: null,
    co_owners: null,
    settings: { wins: 0, losses: 0, ties: 0, fpts: 0 },
    metadata: null,
  },
]

// Sample players for VBD calculations
export const TEST_PLAYERS: Record<string, {
  player_id: string
  full_name: string
  first_name: string
  last_name: string
  team: string | null
  position: string
  age: number | null
  years_exp: number | null
  status: string
  injury_status: null
  number: number | null
  height: string | null
  weight: string | null
  college: string | null
  fantasy_positions: string[] | null
}> = {
  '4046': {
    player_id: '4046',
    full_name: 'Patrick Mahomes',
    first_name: 'Patrick',
    last_name: 'Mahomes',
    team: 'KC',
    position: 'QB',
    age: 29,
    years_exp: 8,
    status: 'Active',
    injury_status: null,
    number: 15,
    height: '6\'3"',
    weight: '225',
    college: 'Texas Tech',
    fantasy_positions: ['QB'],
  },
  '6794': {
    player_id: '6794',
    full_name: 'Justin Herbert',
    first_name: 'Justin',
    last_name: 'Herbert',
    team: 'LAC',
    position: 'QB',
    age: 26,
    years_exp: 5,
    status: 'Active',
    injury_status: null,
    number: 10,
    height: '6\'6"',
    weight: '236',
    college: 'Oregon',
    fantasy_positions: ['QB'],
  },
  '4034': {
    player_id: '4034',
    full_name: 'Travis Kelce',
    first_name: 'Travis',
    last_name: 'Kelce',
    team: 'KC',
    position: 'TE',
    age: 35,
    years_exp: 12,
    status: 'Active',
    injury_status: null,
    number: 87,
    height: '6\'5"',
    weight: '250',
    college: 'Cincinnati',
    fantasy_positions: ['TE'],
  },
  '4035': {
    player_id: '4035',
    full_name: "Ja'Marr Chase",
    first_name: "Ja'Marr",
    last_name: 'Chase',
    team: 'CIN',
    position: 'WR',
    age: 24,
    years_exp: 4,
    status: 'Active',
    injury_status: null,
    number: 1,
    height: '6\'0"',
    weight: '201',
    college: 'LSU',
    fantasy_positions: ['WR'],
  },
  '5850': {
    player_id: '5850',
    full_name: 'Josh Allen',
    first_name: 'Josh',
    last_name: 'Allen',
    team: 'BUF',
    position: 'QB',
    age: 28,
    years_exp: 7,
    status: 'Active',
    injury_status: null,
    number: 17,
    height: '6\'5"',
    weight: '237',
    college: 'Wyoming',
    fantasy_positions: ['QB'],
  },
  '6786': {
    player_id: '6786',
    full_name: 'CeeDee Lamb',
    first_name: 'CeeDee',
    last_name: 'Lamb',
    team: 'DAL',
    position: 'WR',
    age: 25,
    years_exp: 5,
    status: 'Active',
    injury_status: null,
    number: 88,
    height: '6\'2"',
    weight: '189',
    college: 'Oklahoma',
    fantasy_positions: ['WR'],
  },
  '4866': {
    player_id: '4866',
    full_name: 'Saquon Barkley',
    first_name: 'Saquon',
    last_name: 'Barkley',
    team: 'PHI',
    position: 'RB',
    age: 27,
    years_exp: 7,
    status: 'Active',
    injury_status: null,
    number: 26,
    height: '6\'0"',
    weight: '233',
    college: 'Penn State',
    fantasy_positions: ['RB'],
  },
  '6797': {
    player_id: '6797',
    full_name: 'Jonathan Taylor',
    first_name: 'Jonathan',
    last_name: 'Taylor',
    team: 'IND',
    position: 'RB',
    age: 25,
    years_exp: 5,
    status: 'Active',
    injury_status: null,
    number: 28,
    height: '5\'10"',
    weight: '226',
    college: 'Wisconsin',
    fantasy_positions: ['RB'],
  },
  '7564': {
    player_id: '7564',
    full_name: 'Breece Hall',
    first_name: 'Breece',
    last_name: 'Hall',
    team: 'NYJ',
    position: 'RB',
    age: 23,
    years_exp: 3,
    status: 'Active',
    injury_status: null,
    number: 20,
    height: '6\'1"',
    weight: '220',
    college: 'Iowa State',
    fantasy_positions: ['RB'],
  },
  '4199': {
    player_id: '4199',
    full_name: 'Tyreek Hill',
    first_name: 'Tyreek',
    last_name: 'Hill',
    team: 'MIA',
    position: 'WR',
    age: 30,
    years_exp: 9,
    status: 'Active',
    injury_status: null,
    number: 10,
    height: '5\'10"',
    weight: '191',
    college: 'West Alabama',
    fantasy_positions: ['WR'],
  },
}

// Generate 50 mock players for VBD rankings
export function generateMockVBDRankings() {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  const teams = ['KC', 'SF', 'DAL', 'PHI', 'MIA', 'BUF', 'CIN', 'LAC', 'DEN', 'NYJ']
  
  return Array.from({ length: 50 }, (_, i) => ({
    playerId: `player-${i + 1}`,
    name: i === 0 ? 'Patrick Mahomes' : `Player ${i + 1}`,
    position: positions[i % positions.length],
    team: teams[i % teams.length],
    vbd: 100 - i * 2,
    projectedPoints: 300 - i * 5,
    adp: i + 1,
    rank: i + 1,
  }))
}
