import type { VBDInput, VBDOutput, Position, PositionBaseline, PlayerRanking } from './types'
import { calculateBaseline, type BaselineInput } from './baselines'
import { getFlexBaseline } from './flex'
import { calculateIDPScarcityMultiplier, getIDPGroup } from './idp'

export function calculateVBD(input: VBDInput): VBDOutput {
  const starterCounts: Record<string, number> = {}
  input.leagueSettings.rosterPositions.forEach(pos => {
    starterCounts[pos] = (starterCounts[pos] || 0) + 1
  })

  const playersByPosition: Record<string, Array<{
    player_id: string
    full_name: string
    nfl_team: string | null
    metadata: { projected_points: number }
  }>> = {}

  input.players.forEach(player => {
    const projection = input.projections[player.player_id]
    if (projection !== undefined && projection > 0) {
      if (!playersByPosition[player.position]) {
        playersByPosition[player.position] = []
      }
      playersByPosition[player.position].push({
        player_id: player.player_id,
        full_name: player.full_name,
        nfl_team: player.team,
        metadata: { projected_points: projection }
      })
    }
  })

  const baselines: Record<string, PositionBaseline> = {}
  const flexPositions: Position[] = ['FLEX', 'SUPERFLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX']

  Object.keys(starterCounts).forEach(position => {
    const starters = starterCounts[position]
    const players = playersByPosition[position] || []
    
    if (starters > 0 && players.length > 0 && !flexPositions.includes(position as Position)) {
      const baseline = calculateBaseline({
        position: position as Position,
        leagueSize: input.leagueSettings.teams,
        starters,
        players
      })
      if (baseline) {
        baselines[position] = baseline
      }
    }
  })

  flexPositions.forEach(flexType => {
    if (starterCounts[flexType]) {
      const flexBaseline = getFlexBaseline(flexType, baselines)
      if (flexBaseline) {
        baselines[flexType] = flexBaseline
      }
    }
  })

  const idpMultiplier = calculateIDPScarcityMultiplier(input.leagueSettings.rosterPositions)

  const rankings: PlayerRanking[] = []

  input.players.forEach(player => {
    const projection = input.projections[player.player_id]
    if (!projection || projection <= 0) return
    
    const baseline = baselines[player.position]
    if (!baseline) return
    
    let vbd = projection - baseline.projectedPoints
    
    if (['RB', 'WR', 'TE'].includes(player.position) && baselines['FLEX']) {
      const flexVBD = projection - baselines['FLEX'].projectedPoints
      vbd = Math.max(vbd, flexVBD)
    }
    
    if (['QB', 'RB', 'WR', 'TE'].includes(player.position) && baselines['SUPERFLEX']) {
      const superflexVBD = projection - baselines['SUPERFLEX'].projectedPoints
      vbd = Math.max(vbd, superflexVBD)
    }
    
    const idpGroup = getIDPGroup(player.position)
    if (idpGroup) {
      vbd *= idpMultiplier
    }
    
    rankings.push({
      playerId: player.player_id,
      fullName: player.full_name,
      firstName: player.first_name,
      lastName: player.last_name,
      team: player.team,
      position: player.position as Position,
      eligiblePositions: (player.fantasy_positions || [player.position]) as Position[],
      projectedPoints: projection,
      vbdScore: vbd,
      overallRank: 0,
      positionRank: 0,
      status: typeof player.status === 'string' ? player.status : null,
      injuryStatus: player.injury_status
    })
  })

  rankings.sort((a, b) => {
    if (b.vbdScore !== a.vbdScore) {
      return b.vbdScore - a.vbdScore
    }
    return b.projectedPoints - a.projectedPoints
  })

  rankings.forEach((player, index) => {
    player.overallRank = index + 1
  })

  const positionRanks: Record<string, number> = {}
  rankings.forEach(player => {
    positionRanks[player.position] = (positionRanks[player.position] || 0) + 1
    player.positionRank = positionRanks[player.position]
  })

  return {
    rankings,
    baselines,
    metadata: {
      calculatedAt: new Date().toISOString(),
      playerCount: rankings.length,
      leagueSize: input.leagueSettings.teams,
      scoringFormat: input.scoringFormat,
      projectionSource: input.projectionSource
    }
  }
}
