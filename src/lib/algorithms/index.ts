export type {
  ScoringSettings,
  ScoringFormat,
  Position,
  RosterConfig,
  PositionBaseline,
  PlayerRanking,
  VBDInput,
  VBDOutput,
  VBDExplanation,
  AlgorithmPlayer,
  RosterSlot,
  LineupInput,
  LineupOutput,
  LineupExplanation,
  TradeVerdict,
  TradePlayerBreakdown,
  TradeLineupImpact,
  TradeExplanation,
  TradeInput,
  TradeOutput,
} from './types'

export type { BaselineInput } from './baselines'
export { calculateBaseline } from './baselines'

export { detectScoringFormat, getScoringExplanation } from './scoring'

export { calculateIDPScarcityMultiplier, getIDPGroup } from './idp'

export { getFlexBaseline } from './flex'

export { calculateVBD } from './vbd'

export { optimizeLineup } from './lineup'

export { evaluateTrade } from './trade'

export type { VBDForLeagueResult, VBDForLeagueOptions } from './calculate-vbd-for-league'
export { calculateVBDForLeague } from './calculate-vbd-for-league'
