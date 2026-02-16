import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/supabase/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

export interface PlayerSearchOptions {
  position?: string | string[]
  team?: string
  limit?: number
  includeInjured?: boolean
}

export async function searchPlayers(
  query: string,
  options: PlayerSearchOptions = {}
): Promise<PlayerRow[]> {
  const supabase = await createClient()
  const { position, team, limit = 20, includeInjured = true } = options

  let queryBuilder = supabase.from('players').select('*')

  if (query.trim()) {
    const searchTerm = `%${query.trim()}%`
    queryBuilder = queryBuilder.or(
      `full_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`
    )
  }

  if (position) {
    if (Array.isArray(position)) {
      queryBuilder = queryBuilder.in('position', position)
    } else {
      queryBuilder = queryBuilder.eq('position', position)
    }
  }

  if (team) {
    queryBuilder = queryBuilder.eq('team', team)
  }

  if (!includeInjured) {
    queryBuilder = queryBuilder.or('injury_status.is.null,injury_status.neq.Out')
  }

  queryBuilder = queryBuilder.not('team', 'is', null)

  const { data, error } = await queryBuilder.limit(limit).order('full_name')

   if (error) {
     logger.error('PlayerSearch', 'Error', { error })
     throw error
   }

  return (data as PlayerRow[]) ?? []
}

export async function getPlayerById(playerId: string): Promise<PlayerRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

   if (error) {
     if (error.code === 'PGRST116') return null
     logger.error('PlayerSearch', 'Error getting player', { error })
     throw error
   }

  return data as PlayerRow
}

export async function getPlayersByIds(
  playerIds: string[]
): Promise<Map<string, PlayerRow>> {
  if (playerIds.length === 0) return new Map()

  const supabase = await createClient()
  const uniqueIds = [...new Set(playerIds)]

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .in('id', uniqueIds)

   if (error) {
     logger.error('PlayerSearch', 'Error getting players', { error })
     throw error
   }

  const playerMap = new Map<string, PlayerRow>()
  for (const player of (data as PlayerRow[]) ?? []) {
    playerMap.set(player.id, player)
  }

  return playerMap
}

export async function getPlayersByTeam(
  team: string,
  position?: string
): Promise<PlayerRow[]> {
  const supabase = await createClient()

  let queryBuilder = supabase.from('players').select('*').eq('team', team)

  if (position) {
    queryBuilder = queryBuilder.eq('position', position)
  }

  const { data, error } = await queryBuilder
    .order('position')
    .order('full_name')

   if (error) {
     logger.error('PlayerSearch', 'Error getting team players', { error })
     throw error
   }

  return (data as PlayerRow[]) ?? []
}

export async function getPlayerCount(): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })

   if (error) {
     logger.error('PlayerSearch', 'Error getting count', { error })
     return 0
   }

  return count ?? 0
}

export const NFL_TEAMS = [
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LAC',
  'LAR',
  'LV',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WAS',
] as const

export const FANTASY_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
