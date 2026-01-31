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
  WaiverInput,
  WaiverOutput,
  WaiverRecommendation,
  WaiverExplanation,
  FABBidRange,
  CalculateWaiversForLeagueOptions,
} from './types'

export type { BaselineInput } from './baselines'
export { calculateBaseline } from './baselines'

export { detectScoringFormat, getScoringExplanation } from './scoring'

export { calculateIDPScarcityMultiplier, getIDPGroup } from './idp'

export { getFlexBaseline } from './flex'

export { calculateVBD } from './vbd'

export type { DynastyVBDInput, DynastyVBDOutput } from './dynasty-vbd'
export { calculateDynastyVBD } from './dynasty-vbd'

export { optimizeLineup } from './lineup'

export { evaluateTrade } from './trade'

export { recommendWaivers } from './waivers'

export type { VBDForLeagueResult, VBDForLeagueOptions } from './calculate-vbd-for-league'
export { calculateVBDForLeague } from './calculate-vbd-for-league'

export type { LineupForWeekOptions } from './calculate-lineup-for-week'
export { calculateLineupForWeek } from './calculate-lineup-for-week'

export type { CalculateTradeForLeagueOptions } from './calculate-trade-for-league'
export { calculateTradeForLeague } from './calculate-trade-for-league'

export { calculateWaiversForLeague } from './calculate-waivers-for-league'

export type { AgeCurveConfig } from './age-curves'
export { AGE_CURVES, getAgeFactor, getYearsToCliff } from './age-curves'

export type { DraftPick } from './draft-picks'
export { getDraftPickValue, compareDraftPicks } from './draft-picks'
