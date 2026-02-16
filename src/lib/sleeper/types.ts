export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string | null
}

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: 'pre_draft' | 'drafting' | 'in_season' | 'complete'
  sport: 'nfl'
  settings: SleeperLeagueSettings
  scoring_settings: Record<string, number>
  roster_positions: string[]
  total_rosters: number
  previous_league_id: string | null
  draft_id: string
}

export interface SleeperLeagueSettings {
  playoff_week_start: number
  num_teams: number
  playoff_teams: number
  leg: number
  [key: string]: unknown
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string | null
  league_id: string
  players: string[] | null
  starters: string[] | null
  reserve: string[] | null
  taxi: string[] | null
  keepers: string[] | null
  co_owners: string[] | null
  settings: SleeperRosterSettings
  metadata: Record<string, unknown> | null
}

export interface SleeperRosterSettings {
  wins: number
  losses: number
  ties: number
  fpts: number
  fpts_decimal?: number
  fpts_against?: number
  fpts_against_decimal?: number
  ppts?: number
  ppts_decimal?: number
  [key: string]: number | undefined
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number
  points: number
  custom_points: number | null
  starters: string[] | null
  starters_points: number[] | null
  players: string[] | null
  players_points: Record<string, number> | null
}

export interface SleeperPlayer {
  player_id: string
  full_name: string
  first_name: string
  last_name: string
  team: string | null
  position: string
  age: number | null
  years_exp: number | null
  status: 'Active' | 'Inactive' | 'Injured Reserve' | string
  injury_status: 'Out' | 'Doubtful' | 'Questionable' | 'IR' | null
  number: number | null
  height: string | null
  weight: string | null
  college: string | null
  fantasy_positions: string[] | null
  [key: string]: unknown
}

export interface SleeperNFLState {
  season: string
  season_type: 'pre' | 'regular' | 'post' | 'off'
  week: number
  leg: number
  display_week: number
  season_start_date: string
  previous_season: string
}

export interface SleeperDraft {
  draft_id: string
  league_id: string
  type: 'snake' | 'auction' | 'linear'
  status: 'pre_draft' | 'drafting' | 'complete'
  start_time: number | null
  settings: {
    teams: number
    rounds: number
    player_type?: number
  }
  draft_order: Record<string, number> | null
  slot_to_roster_id: Record<string, number> | null
}

export interface SleeperDraftPick {
  pick_no: number
  player_id: string
  picked_by: string
  roster_id: number
  round: number
  draft_slot: number
  pick_id: string
  metadata: {
    team: string
    status: string
    sport: string
    position: string
    player_id: string
    number: string
    news_updated: string | null
    last_name: string
    injury_status: string | null
    first_name: string
  }
}

export interface SleeperTransaction {
  type: 'trade' | 'free_agent' | 'waiver'
  transaction_id: string
  status: 'complete' | 'pending' | 'failed'
  status_updated: number
  roster_ids: number[]
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draft_picks: Array<{
    season: string
    round: number
    roster_id: number
    previous_owner_id: number
    owner_id: number
  }>
  waiver_budget: Array<{
    sender: number
    receiver: number
    amount: number
  }>
  settings: { waiver_bid?: number } | null
  leg: number
  creator: string
  created: number
  consenter_ids: number[]
  metadata: Record<string, unknown> | null
}

export interface SleeperAPIError {
  error: string
  message: string
  statusCode: number
}

export function isSleeperAPIError(obj: unknown): obj is SleeperAPIError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'statusCode' in obj &&
    typeof (obj as SleeperAPIError).statusCode === 'number'
  )
}
