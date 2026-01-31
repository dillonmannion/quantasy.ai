import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getCachedLeague, getCachedRosters } from '@/lib/sleeper/cache'
import { getAllPlayers } from '@/lib/sleeper'
import { evaluateTrade } from './trade'
import { calculateBaseline } from './baselines'
import type {
  AlgorithmPlayer,
  PositionBaseline,
  Position,
  RosterSlot,
  TradeOutput,
} from './types'
import type { SleeperPlayer } from '@/lib/sleeper/types'

type PlayerProjection = {
  id: string
  projected_points: number | null
}

export interface CalculateTradeForLeagueOptions {
  leagueId: string
  rosterId: number
  givingPlayerIds: string[]
  receivingPlayerIds: string[]
  week: number
}

/**
 * Converts a Sleeper player to platform-agnostic AlgorithmPlayer.
 */
function sleeperPlayerToAlgorithmPlayer(
  player: SleeperPlayer,
  projectedPoints: number
): AlgorithmPlayer {
  const eligiblePositions: Position[] = []
  if (player.fantasy_positions) {
    for (const pos of player.fantasy_positions) {
      if (isValidPosition(pos)) {
        eligiblePositions.push(pos as Position)
      }
    }
  }

  // Fallback to primary position if no fantasy_positions
  if (eligiblePositions.length === 0 && isValidPosition(player.position)) {
    eligiblePositions.push(player.position as Position)
  }

  return {
    playerId: player.player_id,
    fullName: player.full_name,
    team: player.team || null,
    position: (isValidPosition(player.position) ? player.position : 'FLEX') as Position,
    eligiblePositions,
    projectedPoints,
    injuryStatus: player.injury_status || null,
    status: player.status || null,
    byeWeek: null, // No reliable bye week data source
  }
}

/**
 * Type guard for valid Position values.
 */
function isValidPosition(pos: string): boolean {
  const validPositions = [
    'QB',
    'RB',
    'WR',
    'TE',
    'K',
    'DEF',
    'DL',
    'LB',
    'DB',
    'FLEX',
    'SUPERFLEX',
    'REC_FLEX',
    'WRRB_FLEX',
    'IDP_FLEX',
  ]
  return validPositions.includes(pos)
}

/**
 * Converts roster_positions array to RosterSlot[] for lineup optimizer.
 */
function rosterPositionsToSlots(rosterPositions: string[]): RosterSlot[] {
  const slots: RosterSlot[] = []
  let slotIndex = 0

  for (const pos of rosterPositions) {
    if (pos === 'BN') {
      // Bench slot - allows all positions
      slots.push({
        slotId: `bench-${slotIndex}`,
        slotType: 'bench',
        allowedPositions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'],
      })
    } else if (isValidPosition(pos)) {
      // Starter slot
      const allowedPositions = expandFlexPositions(pos as Position)
      slots.push({
        slotId: `starter-${slotIndex}`,
        slotType: 'starter',
        allowedPositions,
      })
    }
    slotIndex++
  }

  return slots
}

/**
 * Expands FLEX positions to their eligible positions.
 */
function expandFlexPositions(position: Position): Position[] {
  switch (position) {
    case 'FLEX':
      return ['RB', 'WR', 'TE']
    case 'SUPERFLEX':
      return ['QB', 'RB', 'WR', 'TE']
    case 'REC_FLEX':
      return ['WR', 'TE']
    case 'WRRB_FLEX':
      return ['WR', 'RB']
    case 'IDP_FLEX':
      return ['DL', 'LB', 'DB']
    default:
      return [position]
  }
}

/**
 * Orchestrates trade evaluation for a league.
 * Fetches league/roster/players, computes VBD baselines, normalizes data, and calls evaluateTrade().
 */
export async function calculateTradeForLeague(
  options: CalculateTradeForLeagueOptions
): Promise<{ data: TradeOutput | null; error: string | null }> {
  const { leagueId, rosterId, givingPlayerIds, receivingPlayerIds, week } = options

  try {
    // Step 1: Fetch league settings
    let league
    try {
      league = await getCachedLeague(leagueId)
    } catch {
      return { data: null, error: 'League not found' }
    }

    if (!league) {
      return { data: null, error: 'League not found' }
    }

    // Step 2: Fetch current roster
    const rosters = await getCachedRosters(leagueId)
    const currentRoster = rosters.find((r) => r.roster_id === rosterId)

    if (!currentRoster) {
      return { data: null, error: 'Roster not found' }
    }

    // Step 3: Fetch ALL players with projections (needed for baseline calculation)
    const supabase = await createClient()
    const allPlayersObj = await getAllPlayers()
    const allPlayersArray = Object.values(allPlayersObj)

    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('id, projected_points')
      .not('projected_points', 'is', null)

     if (dbError) {
       logger.error('Trade', 'Error fetching projections', { dbError })
       return { data: null, error: 'Failed to fetch projections' }
     }

    if (!dbPlayers || dbPlayers.length === 0) {
      return { data: null, error: 'No projections available' }
    }

    // Build projections map
    const projectionsMap: Record<string, number> = {}
    dbPlayers.forEach((player: PlayerProjection) => {
      if (player.projected_points !== null) {
        projectionsMap[player.id] = player.projected_points
      }
    })

    const playersWithProjections = allPlayersArray.filter(
      (p) => projectionsMap[p.player_id] !== undefined
    )

    if (playersWithProjections.length === 0) {
      return { data: null, error: 'No projections available' }
    }

    // Step 4: Compute VBD baselines from FULL player pool
    const rosterPositions = (league.roster_positions ?? []) as string[]
    const leagueSize = league.total_rosters || 12

    // Count starters per position
    const starterCounts: Record<string, number> = {}
    for (const pos of rosterPositions) {
      if (pos !== 'BN' && isValidPosition(pos)) {
        starterCounts[pos] = (starterCounts[pos] || 0) + 1
      }
    }

    // Calculate baselines for each position
    const baselines: Record<string, PositionBaseline> = {}
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'] as Position[]

    for (const position of positions) {
      const starters = starterCounts[position] || 0
      if (starters === 0) continue

      // Filter players by position
      const positionPlayers = playersWithProjections.filter((p) => p.position === position)

      // Add projected_points to metadata for calculateBaseline
      const playersWithMetadata = positionPlayers.map((p) => ({
        player_id: p.player_id,
        full_name: p.full_name,
        nfl_team: p.team,
        metadata: {
          projected_points: projectionsMap[p.player_id],
        },
      }))

      const baseline = calculateBaseline({
        position,
        leagueSize,
        starters,
        players: playersWithMetadata,
      })

      if (baseline) {
        baselines[position] = baseline
      }
    }

    // Step 5: Normalize players to AlgorithmPlayer[]
    const givingPlayers: AlgorithmPlayer[] = []
    for (const playerId of givingPlayerIds) {
      const player = allPlayersArray.find((p) => p.player_id === playerId)
      const projectedPoints = projectionsMap[playerId]
      if (player && projectedPoints !== undefined) {
        givingPlayers.push(sleeperPlayerToAlgorithmPlayer(player, projectedPoints))
      }
    }

    const receivingPlayers: AlgorithmPlayer[] = []
    for (const playerId of receivingPlayerIds) {
      const player = allPlayersArray.find((p) => p.player_id === playerId)
      const projectedPoints = projectionsMap[playerId]
      if (player && projectedPoints !== undefined) {
        receivingPlayers.push(sleeperPlayerToAlgorithmPlayer(player, projectedPoints))
      }
    }

    // Normalize current roster
    const currentRosterPlayers: AlgorithmPlayer[] = []
    const rosterPlayerIds = currentRoster.players || []
    for (const playerId of rosterPlayerIds) {
      const player = allPlayersArray.find((p) => p.player_id === playerId)
      const projectedPoints = projectionsMap[playerId]
      if (player && projectedPoints !== undefined) {
        currentRosterPlayers.push(sleeperPlayerToAlgorithmPlayer(player, projectedPoints))
      }
    }

    // Convert roster_positions to RosterSlot[]
    const rosterSlots = rosterPositionsToSlots(rosterPositions)

    // Step 6: Call pure algorithm
    const result = evaluateTrade({
      giving: givingPlayers,
      receiving: receivingPlayers,
      currentRoster: currentRosterPlayers,
      leagueSettings: {
        baselines: baselines as Record<Position, PositionBaseline>,
        rosterSlots,
      },
      week,
    })

    // Step 7: Return result
    return { data: result, error: null }
   } catch (error) {
     logger.error('Trade', 'Unexpected error', { error })
     const errorMessage = error instanceof Error ? error.message : 'Unknown error'
     return { data: null, error: `Trade calculation failed: ${errorMessage}` }
   }
}
