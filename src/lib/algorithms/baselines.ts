import type { Position, PositionBaseline } from './types'

export interface BaselineInput {
  position: Position
  leagueSize: number
  starters: number
  players: Array<{
    player_id: string
    full_name: string
    nfl_team: string | null
    metadata?: {
      projected_points?: number
    }
  }>
}

export function calculateBaseline(input: BaselineInput): PositionBaseline | null {
  const { position, leagueSize, starters, players } = input

  if (starters === 0 || players.length === 0) {
    return null
  }

  const baselineRank = leagueSize * starters
  const baselineIndex = baselineRank - 1

  const sortedPlayers = [...players].sort((a, b) => {
    const pointsA = a.metadata?.projected_points ?? 0
    const pointsB = b.metadata?.projected_points ?? 0

    if (pointsA !== pointsB) {
      return pointsB - pointsA
    }

    return a.full_name.localeCompare(b.full_name)
  })

  const baselinePlayer = sortedPlayers[Math.min(baselineIndex, sortedPlayers.length - 1)]

  if (!baselinePlayer) {
    return null
  }

  return {
    position,
    playerId: baselinePlayer.player_id,
    playerName: baselinePlayer.full_name,
    team: baselinePlayer.nfl_team,
    projectedPoints: baselinePlayer.metadata?.projected_points ?? 0,
    baselineRank,
  }
}
