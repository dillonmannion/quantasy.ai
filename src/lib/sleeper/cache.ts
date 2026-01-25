import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import * as SleeperAPI from './client'
import type { SleeperLeague, SleeperRoster, SleeperMatchup } from './types'

type Tables = Database['public']['Tables']
type LeagueRow = Tables['leagues']['Row']
type LeagueInsert = Tables['leagues']['Insert']
type RosterRow = Tables['rosters']['Row']
type RosterInsert = Tables['rosters']['Insert']
type MatchupRow = Tables['matchups']['Row']
type MatchupInsert = Tables['matchups']['Insert']
type PlayerInsert = Tables['players']['Insert']

type CacheStatus = 'fresh' | 'stale' | 'missing'

const TTL = {
  PLAYERS: 24 * 60 * 60 * 1000,
  LEAGUE: 60 * 60 * 1000,
  ROSTERS: 15 * 60 * 1000,
  MATCHUPS: 5 * 60 * 1000,
} as const

function getCacheStatus(cachedAt: string | null, ttl: number): CacheStatus {
  if (!cachedAt) return 'missing'

  const cacheTime = new Date(cachedAt).getTime()
  const age = Date.now() - cacheTime

  return age > ttl ? 'stale' : 'fresh'
}

function leagueRowToSleeper(row: LeagueRow): SleeperLeague {
  return {
    league_id: row.id,
    name: row.name,
    season: row.season,
    status: row.status as SleeperLeague['status'],
    sport: 'nfl',
    settings: (row.settings ?? {}) as SleeperLeague['settings'],
    scoring_settings: (row.scoring_settings ?? {}) as Record<string, number>,
    roster_positions: (row.roster_positions ?? []) as string[],
    total_rosters: row.total_rosters ?? 0,
    previous_league_id: null,
    draft_id: '',
  }
}

function rosterRowToSleeper(row: RosterRow): SleeperRoster {
  const settings = (row.settings ?? {}) as Record<string, number>
  return {
    roster_id: row.roster_id,
    owner_id: row.owner_id,
    league_id: row.league_id,
    players: row.players,
    starters: row.starters,
    reserve: row.reserve,
    taxi: null,
    keepers: null,
    co_owners: null,
    settings: {
      wins: settings.wins ?? 0,
      losses: settings.losses ?? 0,
      ties: settings.ties ?? 0,
      fpts: settings.fpts ?? 0,
      fpts_decimal: settings.fpts_decimal,
      fpts_against: settings.fpts_against ?? 0,
      fpts_against_decimal: settings.fpts_against_decimal,
    },
    metadata: null,
  }
}

function matchupRowToSleeper(row: MatchupRow): SleeperMatchup {
  return {
    roster_id: row.roster_id,
    matchup_id: row.matchup_id,
    points: row.points ?? 0,
    custom_points: null,
    starters: row.starters,
    starters_points: row.starters_points,
    players: row.players,
    players_points: row.players_points as Record<string, number> | null,
  }
}

export async function getCachedLeague(leagueId: string): Promise<SleeperLeague> {
  const supabase = await createClient()

  const { data: cached, error: cacheError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single()

  if (cacheError && cacheError.code !== 'PGRST116') {
    console.error('[Cache] Error reading league cache:', cacheError)
  }

  const typedCached = cached as LeagueRow | null
  const status = getCacheStatus(typedCached?.cached_at ?? null, TTL.LEAGUE)

  if (status === 'fresh' && typedCached) {
    return leagueRowToSleeper(typedCached)
  }

  const fresh = await SleeperAPI.getLeague(leagueId)

  const leagueInsert: LeagueInsert = {
    id: fresh.league_id,
    name: fresh.name,
    season: fresh.season,
    status: fresh.status,
    settings: fresh.settings as Record<string, unknown>,
    scoring_settings: fresh.scoring_settings,
    roster_positions: fresh.roster_positions as unknown as Record<string, unknown>,
    total_rosters: fresh.total_rosters,
    cached_at: new Date().toISOString(),
  }

  const { error: upsertError } = await supabase
    .from('leagues')
    .upsert(leagueInsert as never)

  if (upsertError) {
    console.error('[Cache] Error updating league cache:', upsertError)
  }

  return fresh
}

export async function getCachedRosters(
  leagueId: string
): Promise<SleeperRoster[]> {
  const supabase = await createClient()

  const { data: cached, error: cacheError } = await supabase
    .from('rosters')
    .select('*')
    .eq('league_id', leagueId)
    .order('roster_id')

  if (cacheError) {
    console.error('[Cache] Error reading rosters cache:', cacheError)
  }

  const typedCached = cached as RosterRow[] | null
  const status = getCacheStatus(typedCached?.[0]?.cached_at ?? null, TTL.ROSTERS)

  if (status === 'fresh' && typedCached && typedCached.length > 0) {
    return typedCached.map(rosterRowToSleeper)
  }

  const fresh = await SleeperAPI.getLeagueRosters(leagueId)

  const { error: deleteError } = await supabase
    .from('rosters')
    .delete()
    .eq('league_id', leagueId)

  if (deleteError) {
    console.error('[Cache] Error deleting old rosters:', deleteError)
  }

  if (fresh.length > 0) {
    const rostersInsert: RosterInsert[] = fresh.map((r) => ({
      league_id: leagueId,
      roster_id: r.roster_id,
      owner_id: r.owner_id,
      players: r.players,
      starters: r.starters,
      reserve: r.reserve,
      settings: r.settings as Record<string, unknown>,
      cached_at: new Date().toISOString(),
    }))

    const { error: insertError } = await supabase
      .from('rosters')
      .insert(rostersInsert as never)

    if (insertError) {
      console.error('[Cache] Error inserting rosters:', insertError)
    }
  }

  return fresh
}

export async function getCachedMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  const supabase = await createClient()

  const { data: cached, error: cacheError } = await supabase
    .from('matchups')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week', week)
    .order('matchup_id')

  if (cacheError) {
    console.error('[Cache] Error reading matchups cache:', cacheError)
  }

  const typedCached = cached as MatchupRow[] | null
  const status = getCacheStatus(typedCached?.[0]?.cached_at ?? null, TTL.MATCHUPS)

  if (status === 'fresh' && typedCached && typedCached.length > 0) {
    return typedCached.map(matchupRowToSleeper)
  }

  const fresh = await SleeperAPI.getMatchups(leagueId, week)

  const { error: deleteError } = await supabase
    .from('matchups')
    .delete()
    .eq('league_id', leagueId)
    .eq('week', week)

  if (deleteError) {
    console.error('[Cache] Error deleting old matchups:', deleteError)
  }

  if (fresh.length > 0) {
    const matchupsInsert: MatchupInsert[] = fresh.map((m) => ({
      league_id: leagueId,
      week,
      matchup_id: m.matchup_id,
      roster_id: m.roster_id,
      points: m.points,
      starters: m.starters,
      starters_points: m.starters_points,
      players: m.players,
      players_points: m.players_points,
      cached_at: new Date().toISOString(),
    }))

    const { error: insertError } = await supabase
      .from('matchups')
      .insert(matchupsInsert as never)

    if (insertError) {
      console.error('[Cache] Error inserting matchups:', insertError)
    }
  }

  return fresh
}

export async function syncAllPlayers(): Promise<number> {
  const supabase = await createClient()

  const playersObj = await SleeperAPI.getAllPlayers()
  const players = Object.values(playersObj)

  const relevantPlayers = players.filter(
    (p) => p.team || p.status === 'Active' || (p.years_exp !== null && p.years_exp < 15)
  )

  const playersInsert: PlayerInsert[] = relevantPlayers.map((p) => ({
    id: p.player_id,
    full_name: p.full_name || `${p.first_name} ${p.last_name}`,
    first_name: p.first_name,
    last_name: p.last_name,
    team: p.team,
    position: p.position,
    age: p.age,
    years_exp: p.years_exp,
    status: p.status,
    injury_status: p.injury_status,
    sleeper_data: p as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('players')
    .upsert(playersInsert as never, { onConflict: 'id' })

  if (error) {
    console.error('[Cache] Error syncing players:', error)
    throw error
  }

  return relevantPlayers.length
}

export async function shouldSyncPlayers(): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('players')
    .select('updated_at')
    .limit(1)
    .order('updated_at', { ascending: false })
    .single()

  if (error || !data) {
    return true
  }

  const typedData = data as { updated_at: string }
  const age = Date.now() - new Date(typedData.updated_at).getTime()
  return age > TTL.PLAYERS
}

export async function invalidateLeagueCache(leagueId: string): Promise<void> {
  const supabase = await createClient()
  const staleTime = new Date(0).toISOString()

  await supabase
    .from('leagues')
    .update({ cached_at: staleTime } as never)
    .eq('id', leagueId)

  await supabase
    .from('rosters')
    .update({ cached_at: staleTime } as never)
    .eq('league_id', leagueId)

  await supabase
    .from('matchups')
    .update({ cached_at: staleTime } as never)
    .eq('league_id', leagueId)
}

export async function purgeLeagueCache(leagueId: string): Promise<void> {
  const supabase = await createClient()

  await supabase.from('matchups').delete().eq('league_id', leagueId)
  await supabase.from('rosters').delete().eq('league_id', leagueId)
  await supabase.from('user_leagues').delete().eq('league_id', leagueId)
  await supabase.from('leagues').delete().eq('id', leagueId)
}
