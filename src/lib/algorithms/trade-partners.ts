import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getCachedLeague, getCachedRosters } from '@/lib/sleeper/cache'
import { getAllPlayers } from '@/lib/sleeper'
import { calculateBaseline } from './baselines'
import { calculateRosterStrength, calculateCompatibilityScore } from './roster-strength'
import type {
  AlgorithmPlayer,
  Position,
  PositionBaseline,
  RosterSlot,
  TradePartnerMatch,
} from './types'

import type { SleeperPlayer } from '@/lib/sleeper/types'

/**
 * Options for finding trade partners.
 */
export interface FindTradePartnersOptions {
  /** Sleeper league ID */
  leagueId: string

  /** User's roster ID (1-based integer) */
  rosterId: number

  /** User ID for cache scoping */
  userId?: string

  /** Skip cache for live updates */
  skipCache?: boolean
}

/**
 * Result from trade partner finder.
 */
export interface FindTradePartnersResult {
  /** Sorted array of trade partner matches */
  matches: TradePartnerMatch[]

  /** Error message if operation failed */
  error: string | null
}

type PlayerProjection = {
  id: string
  projected_points: number | null
}

/**
 * Validates a position string is a valid Position type.
 */
function isValidPosition(pos: string): boolean {
  const validPositions = [
    'QB', 'RB', 'WR', 'TE', 'K', 'DEF',
    'DL', 'LB', 'DB',
    'FLEX', 'SUPERFLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX',
  ]
  return validPositions.includes(pos)
}

/**
 * Converts Sleeper player to AlgorithmPlayer format.
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
    byeWeek: null,
  }
}

/**
 * Converts roster positions array to RosterSlot configuration.
 */
function rosterPositionsToSlots(rosterPositions: string[]): RosterSlot[] {
  const slots: RosterSlot[] = []
  let slotIndex = 0

  for (const pos of rosterPositions) {
    if (pos === 'BN') {
      slots.push({
        slotId: `bench-${slotIndex}`,
        slotType: 'bench',
        allowedPositions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'],
      })
    } else if (isValidPosition(pos)) {
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
 * Expands flex position to allowed positions array.
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
 * Finds compatible trade partners for a user's roster.
 *
 * Algorithm:
 * 1. Fetch all rosters in the league
 * 2. Calculate roster strength for each team
 * 3. Calculate compatibility score based on:
 *    - Overlap between my surplus and their needs
 *    - Overlap between my needs and their surplus
 * 4. Return sorted array by compatibility score descending
 *
 * @param options - League ID, roster ID, and optional settings
 * @returns Sorted array of TradePartnerMatch by compatibility descending
 */
export async function findTradePartners(
  options: FindTradePartnersOptions
): Promise<FindTradePartnersResult> {
  const { leagueId, rosterId } = options

  try {
    // Fetch league data
    let league
    try {
      league = await getCachedLeague(leagueId)
    } catch {
      return { matches: [], error: 'League not found' }
    }

    if (!league) {
      return { matches: [], error: 'League not found' }
    }

    // Fetch all rosters
    const rosters = await getCachedRosters(leagueId)
    const myRoster = rosters.find((r) => r.roster_id === rosterId)

    if (!myRoster) {
      return { matches: [], error: 'Roster not found' }
    }

    // Fetch players and projections
    const supabase = await createClient()
    const allPlayersObj = await getAllPlayers()
    const allPlayersArray = Object.values(allPlayersObj)

    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('id, projected_points')
      .not('projected_points', 'is', null)

    if (dbError) {
      logger.error('TradePartners', 'Error fetching projections', { dbError })
      return { matches: [], error: 'Failed to fetch projections' }
    }

    if (!dbPlayers || dbPlayers.length === 0) {
      return { matches: [], error: 'No projections available' }
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
      return { matches: [], error: 'No projections available' }
    }

    // Calculate baselines
    const rosterPositions = (league.roster_positions ?? []) as string[]
    const leagueSize = league.total_rosters || 12

    const starterCounts: Record<string, number> = {}
    for (const pos of rosterPositions) {
      if (pos !== 'BN' && isValidPosition(pos)) {
        starterCounts[pos] = (starterCounts[pos] || 0) + 1
      }
    }

    const baselines: Partial<Record<Position, PositionBaseline>> = {}
    const positions = ['QB', 'RB', 'WR', 'TE'] as Position[]

    for (const position of positions) {
      const starters = starterCounts[position] || 0
      if (starters === 0) continue

      const positionPlayers = playersWithProjections.filter((p) => p.position === position)

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

    // Build roster slots
    const rosterSlots = rosterPositionsToSlots(rosterPositions)

    // Convert my roster to AlgorithmPlayer[]
    const myPlayers: AlgorithmPlayer[] = []
    for (const playerId of myRoster.players || []) {
      const player = allPlayersArray.find((p) => p.player_id === playerId)
      const projectedPoints = projectionsMap[playerId]
      if (player && projectedPoints !== undefined) {
        myPlayers.push(sleeperPlayerToAlgorithmPlayer(player, projectedPoints))
      }
    }

    // Calculate my roster strength
    const myStrength = calculateRosterStrength(myPlayers, baselines, rosterSlots)

    // Calculate roster strength for all other teams
    const matches: TradePartnerMatch[] = []

    for (const otherRoster of rosters) {
      // Skip my own roster
      if (otherRoster.roster_id === rosterId) continue

      // Convert their roster to AlgorithmPlayer[]
      const theirPlayers: AlgorithmPlayer[] = []
      for (const playerId of otherRoster.players || []) {
        const player = allPlayersArray.find((p) => p.player_id === playerId)
        const projectedPoints = projectionsMap[playerId]
        if (player && projectedPoints !== undefined) {
          theirPlayers.push(sleeperPlayerToAlgorithmPlayer(player, projectedPoints))
        }
      }

      // Calculate their roster strength
      const theirStrength = calculateRosterStrength(theirPlayers, baselines, rosterSlots)

      // Calculate compatibility
      const { score, suggestedPositions } = calculateCompatibilityScore(myStrength, theirStrength)

      matches.push({
        rosterId: String(otherRoster.roster_id),
        ownerName: otherRoster.owner_id || `Team ${otherRoster.roster_id}`,
        compatibilityScore: score,
        myStrength,
        theirStrength,
        suggestedPositions,
        rosterPlayerIds: otherRoster.players || [],
      })
    }

    // Sort by compatibility score descending
    matches.sort((a, b) => {
      if (b.compatibilityScore !== a.compatibilityScore) {
        return b.compatibilityScore - a.compatibilityScore
      }
      // Tie-breaker: alphabetically by rosterId
      return a.rosterId.localeCompare(b.rosterId)
    })

    logger.info('TradePartners', `Found ${matches.length} potential trade partners`)

    return { matches, error: null }
  } catch (error) {
    logger.error('TradePartners', 'Unexpected error', { error })
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { matches: [], error: `Trade partner search failed: ${errorMessage}` }
  }
}
