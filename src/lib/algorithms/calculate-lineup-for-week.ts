import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getCachedLeague, getCachedRosters } from '@/lib/sleeper/cache'
import { optimizeLineup } from './lineup'
import type {
  AlgorithmPlayer,
  LineupOutput,
  Position,
  RosterSlot,
  LineupInput,
} from './types'
import type { SleeperPlayer } from '@/lib/sleeper/types'

type PlayerRow = {
  id: string
  full_name: string
  team: string | null
  position: string
  sleeper_data: Record<string, unknown>
  projected_points: number | null
}

export interface LineupForWeekOptions {
  leagueId: string
  rosterId: number
  week: number
}

function sleeperPlayerToAlgorithmPlayer(
  player: SleeperPlayer,
  projectedPoints: number
): AlgorithmPlayer {
  const eligiblePositions = Array.isArray(player.fantasy_positions)
    ? (player.fantasy_positions.filter(Boolean) as Position[])
    : []

  return {
    playerId: player.player_id,
    fullName: player.full_name,
    team: player.team || null,
    position: player.position as Position,
    eligiblePositions:
      eligiblePositions.length > 0 ? eligiblePositions : [player.position as Position],
    projectedPoints,
    injuryStatus: player.injury_status || null,
    status: player.status || null,
    byeWeek: null,
  }
}

function buildRosterSlots(rosterPositions: string[]): RosterSlot[] {
  const slots: RosterSlot[] = []
  const positionCounts = new Map<string, number>()

  rosterPositions.forEach((position) => {
    const count = positionCounts.get(position) || 0
    positionCounts.set(position, count + 1)

    const slotId = `${position}_${count + 1}`
    const slotType = position === 'BN' ? 'bench' : 'starter'

    if (position === 'BN') {
      slots.push({
        slotId,
        slotType,
        allowedPositions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'],
      })
    } else {
      slots.push({
        slotId,
        slotType,
        allowedPositions: [position as Position],
      })
    }
  })

  return slots
}

export async function calculateLineupForWeek(
  options: LineupForWeekOptions
): Promise<{ data: LineupOutput | null; error: string | null }> {
  const { leagueId, rosterId, week } = options

  if (!leagueId || typeof rosterId !== 'number' || !week) {
    return { data: null, error: 'Invalid parameters: leagueId, rosterId, and week are required' }
  }

  if (week < 1 || week > 18) {
    return { data: null, error: 'Week must be between 1 and 18' }
  }

  try {
    const supabase = await createClient()

    let league
    try {
      league = await getCachedLeague(leagueId)
    } catch {
      return { data: null, error: 'League not found' }
    }

    if (!league) {
      return { data: null, error: 'League not found' }
    }

    const rosters = await getCachedRosters(leagueId)
    const roster = rosters.find((r) => r.roster_id === rosterId)

    if (!roster) {
      return { data: null, error: 'Roster not found' }
    }

    const playerIds = roster.players || []
    if (playerIds.length === 0) {
      return { data: null, error: 'Roster has no players' }
    }

    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('id, full_name, team, position, sleeper_data, projected_points')
      .in('id', playerIds)

     if (dbError) {
       logger.error('Lineup', 'Error fetching players', { dbError })
       return { data: null, error: 'Failed to fetch player data' }
     }

    if (!dbPlayers || dbPlayers.length === 0) {
      return { data: null, error: 'No player data available' }
    }

    const typedPlayers = dbPlayers as PlayerRow[]
    const algorithmPlayers: AlgorithmPlayer[] = []

    typedPlayers.forEach((dbPlayer) => {
      const sleeperData = dbPlayer.sleeper_data as SleeperPlayer
      const projectedPoints = dbPlayer.projected_points || 0

      const algorithmPlayer = sleeperPlayerToAlgorithmPlayer(sleeperData, projectedPoints)
      algorithmPlayers.push(algorithmPlayer)
    })

    const rosterPositions = (league.roster_positions || []) as string[]
    const slots = buildRosterSlots(rosterPositions)

    const lineupInput: LineupInput = {
      roster: algorithmPlayers,
      slots,
      week,
    }

    const result = optimizeLineup(lineupInput)

    return { data: result, error: null }
   } catch (error) {
     logger.error('Lineup', 'Unexpected error', { error })
     const errorMessage = error instanceof Error ? error.message : 'Unknown error'
     return { data: null, error: `Lineup calculation failed: ${errorMessage}` }
   }
}
