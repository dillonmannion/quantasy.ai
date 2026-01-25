import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedLeague } from '@/lib/sleeper/cache'
import { calculateVBD } from '@/lib/algorithms'
import { getAllPlayers } from '@/lib/sleeper'
import type { VBDInput, ScoringFormat } from '@/lib/algorithms/types'
import type { Database } from '@/lib/supabase/types'

type PlayerProjection = {
  id: string
  projected_points: number | null
  sleeper_data: Record<string, unknown> | null
}

interface VBDRequest {
  leagueId: string
  limit?: number
  offset?: number
  positions?: string[]
}

interface VBDResponse {
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
    scoringFormat: 'standard' | 'half_ppr' | 'ppr'
    totalPlayers: number
    limit: number
    offset: number
  }
  generatedAt: string
}

function detectScoringFormat(scoringSettings: Record<string, number>): ScoringFormat {
  const recPpr = scoringSettings['rec'] ?? 0

  if (recPpr === 1) return 'ppr'
  if (recPpr === 0.5) return 'half_ppr'
  return 'standard'
}

export async function POST(request: NextRequest): Promise<NextResponse<VBDResponse | { error: string }>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request body
    const body = (await request.json()) as VBDRequest
    const { leagueId, limit = 300, offset = 0, positions } = body

    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
    }

    // Validate pagination limits
    const validLimit = Math.min(Math.max(1, limit), 500)
    const validOffset = Math.max(0, offset)

    // 3. Fetch league from cache
    let league
    try {
      league = await getCachedLeague(leagueId)
    } catch (error) {
      console.error('[VBD] Error fetching league:', error)
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // 4. Fetch all players from Sleeper
    const allPlayersObj = await getAllPlayers()
    const allPlayersArray = Object.values(allPlayersObj)

    // 5. Fetch players with projections from database
    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('id, projected_points, sleeper_data')
      .not('projected_points', 'is', null)

    if (dbError) {
      console.error('[VBD] Error fetching projections:', dbError)
      return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 })
    }

    if (!dbPlayers || dbPlayers.length === 0) {
      return NextResponse.json({ error: 'No projections available' }, { status: 400 })
    }

    // 6. Build projections map from database
    const projectionsMap: Record<string, number> = {}
    dbPlayers.forEach((player: PlayerProjection) => {
      if (player.projected_points !== null) {
        projectionsMap[player.id] = player.projected_points
      }
    })

    // 7. Filter players to only those with projections
    const playersWithProjections = allPlayersArray.filter((p) => projectionsMap[p.player_id] !== undefined)

    if (playersWithProjections.length === 0) {
      return NextResponse.json({ error: 'No projections available' }, { status: 400 })
    }

    // 8. Prepare VBD input
    const scoringFormat = detectScoringFormat(league.scoring_settings as Record<string, number>)
    const rosterPositions = (league.roster_positions ?? []) as string[]

    const vbdInput: VBDInput = {
      players: playersWithProjections,
      projections: projectionsMap,
      leagueSettings: {
        teams: league.total_rosters || 12,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rosterPositions: rosterPositions as any,
        scoringSettings: (league.scoring_settings as Record<string, number>) || {},
      },
      scoringFormat,
      projectionSource: 'database',
    }

    // 9. Call calculateVBD
    const vbdOutput = calculateVBD(vbdInput)

    // 10. Apply position filter if provided
    let filteredRankings = vbdOutput.rankings
    if (positions && positions.length > 0) {
      filteredRankings = filteredRankings.filter((r) => positions.includes(r.position))
    }

    // 11. Apply pagination
    const totalPlayers = filteredRankings.length
    const paginatedRankings = filteredRankings.slice(validOffset, validOffset + validLimit)

    // 12. Build response
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

    const response: VBDResponse = {
      rankings: paginatedRankings.map((ranking) => ({
        playerId: ranking.playerId,
        name: ranking.fullName,
        position: ranking.position,
        team: ranking.team,
        vbd: ranking.vbdScore,
        projectedPoints: ranking.projectedPoints,
        adp: ranking.overallRank, // Using overall rank as ADP proxy
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('[VBD] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `VBD calculation failed: ${errorMessage}` }, { status: 500 })
  }
}
