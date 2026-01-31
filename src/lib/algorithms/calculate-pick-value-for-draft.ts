import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getDraft, getDraftPicks, getDraftTradedPicks } from '@/lib/sleeper/draft'
import { getAllPlayers, getLeague } from '@/lib/sleeper'
import type { SleeperPlayer, SleeperDraft, SleeperLeague } from '@/lib/sleeper'
import { calculatePickValue } from './pick-value'
import { detectScoringFormat } from './scoring'
import { getOrComputeAlgorithm, getProjectionVersion } from './cache'
import type { PickValueInput, PickValueOutput, Position } from './types'

type PlayerProjection = {
  id: string
  projected_points: number | null
}

export interface CalculatePickValueForDraftOptions {
  draftId: string
  pickNumber?: number
  allPicks?: boolean
}

export async function calculatePickValueForDraft(
  draftId: string,
  pickNumber?: number,
  allPicks?: boolean
): Promise<PickValueOutput | PickValueOutput[]> {
  try {
    // Fetch draft metadata
    let draft: SleeperDraft
    try {
      draft = await getDraft(draftId)
    } catch {
      throw new Error('Draft not found')
    }

    if (!draft) {
      throw new Error('Draft not found')
    }

    // Fetch league to get scoring settings and roster positions
    let league: SleeperLeague
    try {
      league = await getLeague(draft.league_id)
    } catch {
      throw new Error('League not found')
    }

    if (!league) {
      throw new Error('League not found')
    }

    // Fetch all draft picks
    const picks = await getDraftPicks(draftId)

    // Fetch traded picks (not used yet, but fetched for future use)
    const tradedPicks = await getDraftTradedPicks(draftId)

    // Calculate draftedPlayerIds Set
    const draftedPlayerIds = new Set(
      picks.filter((p) => p.player_id).map((p) => p.player_id)
    )

    // Fetch players + projections from Supabase
    const supabase = await createClient()
    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('id, projected_points')
      .not('projected_points', 'is', null)

    if (dbError) {
      logger.error('PickValue', 'Error fetching projections', { dbError })
      throw new Error('Failed to fetch projections')
    }

    if (!dbPlayers || dbPlayers.length === 0) {
      throw new Error('No projections available')
    }

    // Build projections map
    const projectionsMap: Record<string, number> = {}
    dbPlayers.forEach((player: PlayerProjection) => {
      if (player.projected_points !== null) {
        projectionsMap[player.id] = player.projected_points
      }
    })

    // Fetch all players from Sleeper
    const allPlayersObj = await getAllPlayers()
    const allPlayersArray = Object.values(allPlayersObj)

    // Filter to players with projections
    const playersWithProjections = allPlayersArray.filter(
      (p) => projectionsMap[p.player_id] !== undefined
    )

    if (playersWithProjections.length === 0) {
      throw new Error('No projections available')
    }

    // Detect scoring format from league
    const scoringSettings = (league.scoring_settings as Record<string, number>) || {}
    const scoringFormat = detectScoringFormat(scoringSettings)
    const rosterPositions = (league.roster_positions ?? []) as Position[]

    // Get projection version for cache key
    const version = await getProjectionVersion()

    // If allPicks is true, calculate for all picks
    if (allPicks) {
      const totalPicks = draft.settings.rounds * draft.settings.teams
      const results: PickValueOutput[] = []

      for (let pick = 1; pick <= totalPicks; pick++) {
        const cacheKey = `pick-value:${draftId}:${pick}:${version}`

        const computeFn = async (): Promise<PickValueOutput> => {
          const input: PickValueInput = {
            draftId,
            pickNumber: pick,
            remainingPlayers: playersWithProjections,
            leagueSettings: {
              teams: draft.settings.teams,
              rosterPositions,
              scoringSettings,
            },
            scoringFormat,
            projections: projectionsMap,
            draftedPlayerIds,
          }

          return calculatePickValue(input)
        }

        const result = await getOrComputeAlgorithm<PickValueOutput>(
          'lineup',
          cacheKey,
          draft.league_id,
          { draftId, pickNumber: pick },
          computeFn,
          { ttlMs: 3600000 } // 1 hour
        )

        results.push(result)
      }

      return results
    }

    // Single pick calculation
    if (!pickNumber) {
      throw new Error('pickNumber is required when allPicks is false')
    }

    const cacheKey = `pick-value:${draftId}:${pickNumber}:${version}`

    const computeFn = async (): Promise<PickValueOutput> => {
      const input: PickValueInput = {
        draftId,
        pickNumber,
        remainingPlayers: playersWithProjections,
        leagueSettings: {
          teams: draft.settings.teams,
          rosterPositions,
          scoringSettings,
        },
        scoringFormat,
        projections: projectionsMap,
        draftedPlayerIds,
      }

      return calculatePickValue(input)
    }

    const result = await getOrComputeAlgorithm<PickValueOutput>(
      'lineup',
      cacheKey,
      draft.league_id,
      { draftId, pickNumber },
      computeFn,
      { ttlMs: 3600000 } // 1 hour
    )

    return result
  } catch (error) {
    logger.error('PickValue', 'Unexpected error', { error })
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Pick value calculation failed: ${errorMessage}`)
  }
}
