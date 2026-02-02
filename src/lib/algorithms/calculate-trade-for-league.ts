import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getCachedLeague, getCachedRosters } from '@/lib/sleeper/cache'
import { getAllPlayers } from '@/lib/sleeper'
import {
  fetchDynastyProcessPlayerValues,
  fetchFantasyCalcPlayerValues,
  fetchKTCPlayerValues,
} from '@/lib/external'
import { upsertExternalValues } from '@/lib/supabase/external-values'
import { evaluateTrade } from './trade'
import { calculateBaseline } from './baselines'
import { getOrComputeAlgorithm, generateTradeCacheKey } from './cache'
import { normalizeValues, calculateConsensus } from './value-normalization'
import type {
  AlgorithmPlayer,
  PositionBaseline,
  Position,
  RosterSlot,
  TradeOutput,
  TradeableAsset,
  PlayerAsset,
  ExternalPlayerValue,
  ExternalValueSource,
  NormalizedValue,
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
  giving?: TradeableAsset[]
  receiving?: TradeableAsset[]
  week: number
  userId?: string
  skipCache?: boolean
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

function getScaleForSource(source: ExternalValueSource): string {
  switch (source) {
    case 'DynastyProcess':
      return '0-10000'
    case 'KTC':
      return '0-10000'
    case 'FantasyCalc':
      return '0-1000'
  }
}

async function fetchAllExternalValues(): Promise<{
  combinedValues: ExternalPlayerValue[]
  originalValuesByPlayer: Record<string, ExternalPlayerValue[]>
}> {
  const [dpValues, fcValues, ktcValues] = await Promise.all([
    fetchDynastyProcessPlayerValues().catch((err) => {
      logger.warn('Trade', 'DynastyProcess fetch failed', { error: err })
      return {} as Record<string, ExternalPlayerValue>
    }),
    fetchFantasyCalcPlayerValues('dynasty').catch((err) => {
      logger.warn('Trade', 'FantasyCalc fetch failed', { error: err })
      return {} as Record<string, ExternalPlayerValue>
    }),
    fetchKTCPlayerValues().catch((err) => {
      logger.warn('Trade', 'KTC fetch failed', { error: err })
      return {} as Record<string, ExternalPlayerValue>
    }),
  ])

  const combinedValues: ExternalPlayerValue[] = [
    ...Object.values(dpValues),
    ...Object.values(fcValues),
    ...Object.values(ktcValues),
  ]

  const originalValuesByPlayer: Record<string, ExternalPlayerValue[]> = {}
  for (const value of combinedValues) {
    if (!originalValuesByPlayer[value.playerId]) {
      originalValuesByPlayer[value.playerId] = []
    }
    originalValuesByPlayer[value.playerId].push(value)
  }

  return { combinedValues, originalValuesByPlayer }
}

function buildExternalValuesBreakdown(
  playerId: string,
  normalizedByPlayer: Record<string, NormalizedValue[]>,
  originalValuesByPlayer: Record<string, ExternalPlayerValue[]>
): {
  consensus?: number
  sources?: Array<{
    source: ExternalValueSource
    value: number
    originalScale?: string
  }>
} | undefined {
  const playerNormalized = normalizedByPlayer[playerId]
  const playerOriginals = originalValuesByPlayer[playerId]

  if (!playerNormalized || playerNormalized.length === 0) {
    return undefined
  }

  const consensus = calculateConsensus(playerNormalized)

  const sources = playerNormalized
    .map((nv) => {
      const originalValue = playerOriginals?.find((v) => v.source === nv.source)
      const value = originalValue?.dynasty_value ?? originalValue?.redraft_value ?? 0
      return {
        source: nv.source,
        value,
        originalScale: getScaleForSource(nv.source),
      }
    })
    .filter((s) => s.value > 0)

  return {
    consensus: consensus ?? undefined,
    sources: sources.length > 0 ? sources : undefined,
  }
}

export async function calculateTradeForLeague(
  options: CalculateTradeForLeagueOptions
): Promise<{ data: TradeOutput | null; error: string | null }> {
  const { leagueId, rosterId, givingPlayerIds, receivingPlayerIds, week, giving, receiving, userId, skipCache } = options

  try {
    const givingIds = giving && giving.length > 0
      ? giving.filter(a => a.type === 'player').map(a => (a as PlayerAsset).playerId)
      : givingPlayerIds
    const receivingIds = receiving && receiving.length > 0
      ? receiving.filter(a => a.type === 'player').map(a => (a as PlayerAsset).playerId)
      : receivingPlayerIds

    const cacheKey = await generateTradeCacheKey({
      leagueId,
      rosterId,
      week,
      givingIds,
      receivingIds,
    })

    const inputParams = {
      leagueId,
      rosterId,
      week,
      givingIds,
      receivingIds,
    }

    const computeTrade = async (): Promise<TradeOutput> => {
    let league
    try {
      league = await getCachedLeague(leagueId)
    } catch {
      throw new Error('League not found')
    }

    if (!league) {
      throw new Error('League not found')
    }

    const rosters = await getCachedRosters(leagueId)
    const currentRoster = rosters.find((r) => r.roster_id === rosterId)

    if (!currentRoster) {
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
       logger.error('Trade', 'Error fetching projections', { dbError })
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

    const playersWithProjections = allPlayersArray.filter(
      (p) => projectionsMap[p.player_id] !== undefined
    )

    if (playersWithProjections.length === 0) {
      throw new Error('No projections available')
    }

    const rosterPositions = (league.roster_positions ?? []) as string[]
    const leagueSize = league.total_rosters || 12

    const starterCounts: Record<string, number> = {}
    for (const pos of rosterPositions) {
      if (pos !== 'BN' && isValidPosition(pos)) {
        starterCounts[pos] = (starterCounts[pos] || 0) + 1
      }
    }

    const baselines: Record<string, PositionBaseline> = {}
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

    const { combinedValues, originalValuesByPlayer } = await fetchAllExternalValues()
    const normalizedByPlayer = normalizeValues(combinedValues)

    if (combinedValues.length > 0) {
      const dbInsertValues = combinedValues.map((v) => ({
        sleeper_id: v.playerId,
        source: v.source,
        dynasty_value: v.dynasty_value ?? null,
        redraft_value: v.redraft_value ?? null,
      }))
      upsertExternalValues(dbInsertValues).catch((err) => {
        logger.warn('Trade', 'Failed to upsert external values', { error: err })
      })
    }

    // Normalize giving/receiving assets
    // If 'giving' is provided (TradeInputV2), assume it contains partial data that needs augmentation (e.g. projections)
    // If not, assume legacy 'givingPlayerIds'
    
    let finalGiving: TradeableAsset[] = []
    let finalReceiving: TradeableAsset[] = []

    if (giving && giving.length > 0) {
       // We have TradeInputV2 assets.
       // For players, we need to ensure they have projected points from our DB source (overriding client if needed/safer)
       // For picks, we pass them through (their value is calculated in evaluateTrade)
       finalGiving = giving.map(asset => {
          if (asset.type === 'player') {
             const proj = projectionsMap[asset.playerId] || asset.projectedPoints
             // Re-construct full player asset if possible or just update projection
             return { ...asset, projectedPoints: proj }
          }
          return asset
       })
    } else {
       // Legacy path
       for (const playerId of givingPlayerIds) {
         const player = allPlayersArray.find((p) => p.player_id === playerId)
         const projectedPoints = projectionsMap[playerId]
         if (player && projectedPoints !== undefined) {
           const algoPlayer = sleeperPlayerToAlgorithmPlayer(player, projectedPoints)
           finalGiving.push({
             type: 'player',
             playerId: algoPlayer.playerId,
             fullName: algoPlayer.fullName,
             position: algoPlayer.position,
             projectedPoints: algoPlayer.projectedPoints
           })
         }
       }
    }

    if (receiving && receiving.length > 0) {
       finalReceiving = receiving.map(asset => {
          if (asset.type === 'player') {
             const proj = projectionsMap[asset.playerId] || asset.projectedPoints
             return { ...asset, projectedPoints: proj }
          }
          return asset
       })
    } else {
       // Legacy path
       for (const playerId of receivingPlayerIds) {
         const player = allPlayersArray.find((p) => p.player_id === playerId)
         const projectedPoints = projectionsMap[playerId]
         if (player && projectedPoints !== undefined) {
            const algoPlayer = sleeperPlayerToAlgorithmPlayer(player, projectedPoints)
            finalReceiving.push({
              type: 'player',
              playerId: algoPlayer.playerId,
              fullName: algoPlayer.fullName,
              position: algoPlayer.position,
              projectedPoints: algoPlayer.projectedPoints
            })
         }
       }
    }

    const currentRosterPlayers: AlgorithmPlayer[] = []
    const rosterPlayerIds = currentRoster.players || []
    for (const playerId of rosterPlayerIds) {
      const player = allPlayersArray.find((p) => p.player_id === playerId)
      const projectedPoints = projectionsMap[playerId]
      if (player && projectedPoints !== undefined) {
        currentRosterPlayers.push(sleeperPlayerToAlgorithmPlayer(player, projectedPoints))
      }
    }

    const rosterSlots = rosterPositionsToSlots(rosterPositions)

    const result = evaluateTrade({
      giving: finalGiving,
      receiving: finalReceiving,
      currentRoster: currentRosterPlayers,
      leagueSettings: {
        baselines: baselines as Record<Position, PositionBaseline>,
        rosterSlots,
      },
      week,
    })

    for (const breakdown of result.explanation.playerBreakdown) {
      const externalValues = buildExternalValuesBreakdown(
        breakdown.playerId,
        normalizedByPlayer,
        originalValuesByPlayer
      )
      if (externalValues) {
        breakdown.externalValues = externalValues
      }
    }

    return result
    }

    const result = await getOrComputeAlgorithm<TradeOutput>(
      'trade',
      cacheKey,
      leagueId,
      inputParams,
      computeTrade,
      { skipCache, userId }
    )

    return { data: result, error: null }
   } catch (error) {
     logger.error('Trade', 'Unexpected error', { error })
     const errorMessage = error instanceof Error ? error.message : 'Unknown error'
     return { data: null, error: `Trade calculation failed: ${errorMessage}` }
   }
}
