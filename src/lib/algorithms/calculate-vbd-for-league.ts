import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getCachedLeague } from '@/lib/sleeper/cache'
import { getAllPlayers } from '@/lib/sleeper'
import type { SleeperPlayer, SleeperLeague } from '@/lib/sleeper'
import { calculateVBD } from './vbd'
import { detectScoringFormat } from './scoring'
import { getOrComputeAlgorithm, generateVBDCacheKey } from './cache'
import type { VBDInput, ScoringFormat, Position } from './types'

type PlayerProjection = {
  id: string
  projected_points: number | null
}

export interface VBDForLeagueResult {
  rankings: Array<{
    playerId: string
    name: string
    position: string
    team: string | null
    vbd: number
    projectedPoints: number
    adp: number | null
    rank: number
  }>
  baselines: Record<
    string,
    {
      position: string
      baselineRank: number
      playerName: string
      projectedPoints: number
    }
  >
  metadata: {
    leagueId: string
    leagueName: string
    scoringFormat: ScoringFormat
    totalPlayers: number
    limit: number
    offset: number
  }
  generatedAt: string
}

export interface VBDForLeagueOptions {
  leagueId: string
  limit?: number
  offset?: number
  positions?: string[]
  /** Pre-fetched players to avoid duplicate getAllPlayers() call */
  prefetchedPlayers?: Record<string, SleeperPlayer>
  /** Pre-fetched league to avoid duplicate getCachedLeague() call */
  prefetchedLeague?: SleeperLeague
  /** Skip cache for live drafts (future: bypass algorithm output cache) */
  skipCache?: boolean
}

export async function calculateVBDForLeague(
  options: VBDForLeagueOptions
): Promise<{ data: VBDForLeagueResult | null; error: string | null }> {
  const {
    leagueId,
    limit = 300,
    offset = 0,
    positions,
    prefetchedPlayers,
    prefetchedLeague,
    skipCache = false,
  } = options
  const validLimit = Math.min(Math.max(1, limit), 500)
  const validOffset = Math.max(0, offset)

  try {
    let league: SleeperLeague
    if (prefetchedLeague) {
      league = prefetchedLeague
    } else {
      try {
        league = await getCachedLeague(leagueId)
      } catch {
        return { data: null, error: 'League not found' }
      }

      if (!league) {
        return { data: null, error: 'League not found' }
      }
    }

    const scoringSettings = (league.scoring_settings as Record<string, number>) || {}
    const rosterPositions = (league.roster_positions ?? []) as string[]
    const cacheKey = await generateVBDCacheKey({
      leagueId,
      scoringSettings,
      rosterPositions,
      totalRosters: league.total_rosters || 12,
    })

    const inputParams = {
      leagueId,
      limit: validLimit,
      offset: validOffset,
      positions: positions ?? [],
    }

    const computeVBD = async (): Promise<VBDForLeagueResult> => {
      const supabase = await createClient()

      const allPlayersObj = prefetchedPlayers ?? await getAllPlayers()
      const allPlayersArray = Object.values(allPlayersObj)

      const { data: dbPlayers, error: dbError } = await supabase
        .from('players')
        .select('id, projected_points')
        .not('projected_points', 'is', null)

       if (dbError) {
         logger.error('VBD', 'Error fetching projections', { dbError })
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

      const scoringFormat = detectScoringFormat(scoringSettings)
      const typedRosterPositions = rosterPositions as Position[]

      const vbdInput: VBDInput = {
        players: playersWithProjections,
        projections: projectionsMap,
        leagueSettings: {
          teams: league.total_rosters || 12,
          rosterPositions: typedRosterPositions,
          scoringSettings,
        },
        scoringFormat,
        projectionSource: 'database',
      }

      const vbdOutput = calculateVBD(vbdInput)

      let filteredRankings = vbdOutput.rankings
      if (positions && positions.length > 0) {
        filteredRankings = filteredRankings.filter((r) =>
          positions.includes(r.position)
        )
      }

      const totalPlayers = filteredRankings.length
      const paginatedRankings = filteredRankings.slice(
        validOffset,
        validOffset + validLimit
      )

      const baselines: Record<
        string,
        {
          position: string
          baselineRank: number
          playerName: string
          projectedPoints: number
        }
      > = {}

      Object.entries(vbdOutput.baselines).forEach(([position, baseline]) => {
        baselines[position] = {
          position: baseline.position,
          baselineRank: baseline.baselineRank,
          playerName: baseline.playerName,
          projectedPoints: baseline.projectedPoints,
        }
      })

      return {
        rankings: paginatedRankings.map((ranking) => ({
          playerId: ranking.playerId,
          name: ranking.fullName,
          position: ranking.position,
          team: ranking.team,
          vbd: ranking.vbdScore,
          projectedPoints: ranking.projectedPoints,
          adp: ranking.overallRank,
          rank: ranking.overallRank,
        })),
        baselines,
        metadata: {
          leagueId,
          leagueName: league.name,
          scoringFormat,
          totalPlayers,
          limit: validLimit,
          offset: validOffset,
        },
        generatedAt: new Date().toISOString(),
      }
    }

    const result = await getOrComputeAlgorithm<VBDForLeagueResult>(
      'vbd',
      cacheKey,
      leagueId,
      inputParams,
      computeVBD,
      { skipCache }
    )

    return { data: result, error: null }
   } catch (error) {
     logger.error('VBD', 'Unexpected error', { error })
     const errorMessage = error instanceof Error ? error.message : 'Unknown error'
     return { data: null, error: `VBD calculation failed: ${errorMessage}` }
   }
}
