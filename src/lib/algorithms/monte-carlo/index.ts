export type {
  PlayerPreference,
  PreferenceModifiers,
  DraftPosition,
  MarketConfig,
  GuardrailConfig,
  MonteCarloInput,
  MonteCarloOutput,
  SimulationResult,
  PickRecommendation,
  MonteCarloExplanation,
} from './types'

export { simulateMarketPick, simulateMarketPickDeterministic } from './market-model'

export type {
  UtilityInput,
  RecommendationInput,
  ConfidenceLevel,
  RecommendationType,
  UtilityRecommendation,
} from './utility'

export { calculateUtility, generateRecommendation, classifyConfidence } from './utility'

export type { GuardrailContext, StarterFillResult } from './guardrails'

export {
  calculateTEScarcityMultiplier,
  calculateStarterFillGuardrail,
  calculate2ndQBPenalty,
  applyGuardrails,
} from './guardrails'

export { runSimulation, calculateSurvivalProbability } from './simulator'

export { MonteCarloWorker } from './worker-client'
export type { WorkerMessage, WorkerResponse } from './worker-client'

