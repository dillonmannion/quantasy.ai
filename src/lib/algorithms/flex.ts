import type { Position, PositionBaseline } from './types'

export function getFlexBaseline(
  flexType: Position,
  baselines: Record<string, PositionBaseline>
): PositionBaseline | null {
  let eligiblePositions: Position[]

  switch (flexType) {
    case 'FLEX':
      eligiblePositions = ['RB', 'WR', 'TE']
      break
    case 'SUPERFLEX':
      eligiblePositions = ['QB', 'RB', 'WR', 'TE']
      break
    case 'REC_FLEX':
      eligiblePositions = ['WR', 'TE']
      break
    case 'WRRB_FLEX':
      eligiblePositions = ['WR', 'RB']
      break
    case 'IDP_FLEX':
      eligiblePositions = ['DL', 'LB', 'DB']
      break
    default:
      return null
  }

  const eligibleBaselines = eligiblePositions
    .map((pos) => baselines[pos])
    .filter((baseline): baseline is PositionBaseline => baseline !== undefined)

  if (eligibleBaselines.length !== eligiblePositions.length) {
    return null
  }

  const minBaseline = eligibleBaselines.reduce((min, current) => {
    return current.projectedPoints < min.projectedPoints ? current : min
  })

  return {
    position: flexType,
    playerId: minBaseline.playerId,
    playerName: minBaseline.playerName,
    team: minBaseline.team,
    projectedPoints: minBaseline.projectedPoints,
    baselineRank: minBaseline.baselineRank,
  }
}
