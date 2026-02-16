import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getCachedLeague, getCachedRosters } from '@/lib/sleeper/cache'
import { getAllPlayers } from '@/lib/sleeper'
import { recommendWaivers } from './waivers'
import { calculateBaseline } from './baselines'
import { getOrComputeAlgorithm, generateWaiversCacheKey } from './cache'
import type {
  AlgorithmPlayer,
  PositionBaseline,
  Position,
  RosterSlot,
  WaiverOutput,
  CalculateWaiversForLeagueOptions,
} from './types'
import type { SleeperPlayer } from '@/lib/sleeper/types'

type PlayerProjection = {
  id: string
  projected_points: number | null
}

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

export async function calculateWaiversForLeague(
  options: CalculateWaiversForLeagueOptions
): Promise<{ data: WaiverOutput | null; error: string | null }> {
  const { leagueId, rosterId, week, faabBudget, userId, skipCache } = options

  try {
    const cacheKey = await generateWaiversCacheKey({
      leagueId,
      rosterId,
      week,
      faabBudget,
    })

    const inputParams = {
      leagueId,
      rosterId,
      week,
      faabBudget,
    }

    const computeWaivers = async (): Promise<WaiverOutput> => {
    let league
    try {
      league = await getCachedLeague(leagueId)
    } catch {
      throw new Error('League not found')
    }

    if (!league) {
      throw new Error('League not found')
    }

    const allRosters = await getCachedRosters(leagueId)
    const userRoster = allRosters.find((r) => r.roster_id === rosterId)

    if (!userRoster) {
      throw new Error('Roster not found')
    }

    const supabase = await createClient()
    const allPlayersObj = await getAllPlayers()
    const allPlayersArray = Object.values(allPlayersObj)

    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('id, projected_points')
      .not('projected_points', 'is', null)

     if (dbError) {
       logger.error('Waivers', 'Error fetching projections', { dbError })
       throw new Error('Failed to fetch projections')
     }

    if (!dbPlayers || dbPlayers.length === 0) {
      throw new Error('No projections available')
    }

    const projectionsMap: Record<string, number> = {}
    dbPlayers.forEach((player: PlayerProjection) => {
      if (player.projected_points !== null) {
        projectionsMap[player.id] = player.projected_points
      }
    })

    const rosterPlayerIds = new Set<string>()
    for (const roster of allRosters) {
      for (const playerId of roster.players ?? []) {
        rosterPlayerIds.add(playerId)
      }
      for (const playerId of roster.reserve ?? []) {
        rosterPlayerIds.add(playerId)
      }
    }

    let filteredOutCount = 0
    const totalFreeAgents = allPlayersArray.filter((p) => !rosterPlayerIds.has(p.player_id)).length
    const availablePlayers: AlgorithmPlayer[] = []

    for (const sleeperPlayer of allPlayersArray) {
      if (rosterPlayerIds.has(sleeperPlayer.player_id)) continue

      const projectedPoints = projectionsMap[sleeperPlayer.player_id]
      if (projectedPoints === undefined) {
        filteredOutCount++
        continue
      }

      availablePlayers.push(sleeperPlayerToAlgorithmPlayer(sleeperPlayer, projectedPoints))
    }

    const currentRoster: AlgorithmPlayer[] = []
    for (const playerId of userRoster.players ?? []) {
      const sleeperPlayer = allPlayersObj[playerId]
      const projectedPoints = projectionsMap[playerId]
      if (sleeperPlayer && projectedPoints !== undefined) {
        currentRoster.push(sleeperPlayerToAlgorithmPlayer(sleeperPlayer, projectedPoints))
      }
    }

    const playersWithProjections = allPlayersArray.filter(
      (p) => projectionsMap[p.player_id] !== undefined
    )

    const rosterPositions = (league.roster_positions ?? []) as string[]
    const leagueSize = league.total_rosters || 12

    const starterCounts: Record<string, number> = {}
    for (const pos of rosterPositions) {
      if (pos !== 'BN' && isValidPosition(pos)) {
        starterCounts[pos] = (starterCounts[pos] || 0) + 1
      }
    }

    const baselines: Partial<Record<Position, PositionBaseline>> = {}
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'] as Position[]

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

    const rosterSlots = rosterPositionsToSlots(rosterPositions)

    const result = recommendWaivers({
      availablePlayers,
      currentRoster,
      leagueSettings: {
        baselines,
        rosterSlots,
      },
      week,
      faabBudget,
    })

    const filteredPercentage = totalFreeAgents > 0 ? (filteredOutCount / totalFreeAgents) * 100 : 0
    if (filteredPercentage > 10) {
      result.explanation.caveats.push(
        `${Math.round(filteredPercentage)}% of free agents excluded due to missing projections`
      )
    }

    return result
    }

    const result = await getOrComputeAlgorithm<WaiverOutput>(
      'waivers',
      cacheKey,
      leagueId,
      inputParams,
      computeWaivers,
      { skipCache, userId }
    )

    return { data: result, error: null }
   } catch (error) {
     logger.error('Waivers', 'Unexpected error', { error })
     const errorMessage = error instanceof Error ? error.message : 'Unknown error'
     return { data: null, error: `Waiver calculation failed: ${errorMessage}` }
   }
}
