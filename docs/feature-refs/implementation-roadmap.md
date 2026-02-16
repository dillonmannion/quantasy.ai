# Implementation Roadmap

**Research Date:** January 2026  
**Purpose:** Actionable recommendations for enhancing Quantasy's dynasty algorithms

---

## Executive Summary

Based on comprehensive research, these are the highest-impact improvements ordered by priority:

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| **P0** | Age Curves in VBD | Transforms redraft → dynasty | Medium |
| **P0** | Draft Pick Valuation | Enables dynasty trades | Low |
| **P1** | ML Projection System | Competitive projections | High |
| **P1** | Uncertainty Quantification | Better decision-making | Medium |
| **P2** | Bayesian Weekly Updates | In-season intelligence | Medium |
| **P2** | Market Sentiment Integration | Real-time values | Medium |
| **P3** | RL Draft Optimization | Advanced draft assistant | High |
| **P3** | Player Correlations | Portfolio optimization | Medium |

---

## Phase 1: Dynasty Value Foundation (P0)

### 1.1 Add Age Curve Multipliers

**File:** `src/lib/algorithms/age-curves.ts` (new)

```typescript
export interface AgeCurveConfig {
  position: Position
  peakAge: number
  decayRate: number
  cliffAge: number
}

export const AGE_CURVES: Record<Position, AgeCurveConfig> = {
  QB: { position: 'QB', peakAge: 29, decayRate: 0.03, cliffAge: 38 },
  RB: { position: 'RB', peakAge: 25, decayRate: 0.12, cliffAge: 28 },
  WR: { position: 'WR', peakAge: 27, decayRate: 0.06, cliffAge: 32 },
  TE: { position: 'TE', peakAge: 28, decayRate: 0.05, cliffAge: 33 },
  K:  { position: 'K',  peakAge: 32, decayRate: 0.02, cliffAge: 40 },
  DEF: { position: 'DEF', peakAge: 27, decayRate: 0.00, cliffAge: 99 },
}

export function getAgeFactor(position: Position, age: number): number {
  const config = AGE_CURVES[position]
  if (!config) return 1.0
  
  const { peakAge, decayRate, cliffAge } = config
  
  // Past cliff age: steep decline
  if (age > cliffAge) {
    const yearsPostCliff = age - cliffAge
    return Math.exp(-decayRate * (cliffAge - peakAge)) * Math.pow(0.7, yearsPostCliff)
  }
  
  // Normal exponential decay from peak
  return Math.exp(-decayRate * Math.abs(age - peakAge))
}

export function getYearsToCliff(position: Position, age: number): number {
  const config = AGE_CURVES[position]
  if (!config) return 10
  return Math.max(0, config.cliffAge - age)
}
```

### 1.2 Add Draft Pick Valuation

**File:** `src/lib/algorithms/draft-picks.ts` (new)

```typescript
export interface DraftPick {
  year: number
  round: number
  position: 'early' | 'mid' | 'late' | 'unknown'
  originalOwner?: string
}

const ROUND_BASE_VALUES: Record<number, number> = {
  1: 8500,
  2: 4500,
  3: 2500,
  4: 1200,
  5: 500,
}

const POSITION_MODIFIERS: Record<string, number> = {
  early: 1.15,   // Picks 1-4 in round
  mid: 1.0,      // Picks 5-8 in round
  late: 0.85,    // Picks 9-12 in round
  unknown: 1.0,  // Default for future picks
}

export function getDraftPickValue(
  pick: DraftPick,
  currentYear: number,
  futureDiscountRate: number = 0.80
): number {
  const baseValue = ROUND_BASE_VALUES[pick.round] || 250
  const positionMod = POSITION_MODIFIERS[pick.position]
  const yearDiff = pick.year - currentYear
  const futureDiscount = Math.pow(futureDiscountRate, Math.max(0, yearDiff))
  
  return Math.round(baseValue * positionMod * futureDiscount)
}

export function compareDraftPicks(a: DraftPick, b: DraftPick, currentYear: number): number {
  return getDraftPickValue(b, currentYear) - getDraftPickValue(a, currentYear)
}
```

### 1.3 Extend VBD for Dynasty

**File:** `src/lib/algorithms/dynasty-vbd.ts` (new)

```typescript
import { getAgeFactor } from './age-curves'
import { PlayerRanking } from './types'

export interface DynastyVBDInput {
  player: PlayerRanking
  age: number
  yearsToProject?: number
  discountRate?: number
}

export interface DynastyVBDOutput {
  currentVBD: number
  dynastyVBD: number
  ageFactor: number
  yearlyBreakdown: Array<{
    year: number
    age: number
    factor: number
    discountedVBD: number
  }>
}

export function calculateDynastyVBD(input: DynastyVBDInput): DynastyVBDOutput {
  const {
    player,
    age,
    yearsToProject = 3,
    discountRate = 0.20,
  } = input
  
  const currentAgeFactor = getAgeFactor(player.position, age)
  const yearlyBreakdown: DynastyVBDOutput['yearlyBreakdown'] = []
  let dynastyVBD = 0
  
  for (let t = 0; t < yearsToProject; t++) {
    const futureAge = age + t
    const futureFactor = getAgeFactor(player.position, futureAge)
    const relativeDecline = futureFactor / currentAgeFactor
    const yearVBD = player.vbdScore * relativeDecline
    const discountedVBD = yearVBD / Math.pow(1 + discountRate, t)
    
    dynastyVBD += discountedVBD
    
    yearlyBreakdown.push({
      year: t,
      age: futureAge,
      factor: futureFactor,
      discountedVBD: Math.round(discountedVBD),
    })
  }
  
  return {
    currentVBD: player.vbdScore,
    dynastyVBD: Math.round(dynastyVBD),
    ageFactor: currentAgeFactor,
    yearlyBreakdown,
  }
}
```

### 1.4 Extend Trade Calculator

**File:** Modify `src/lib/algorithms/trade.ts`

```typescript
// Add to TradeInput interface
export interface DynastyTradeInput extends TradeInput {
  givingDraftPicks?: DraftPick[]
  receivingDraftPicks?: DraftPick[]
  useDynastyValues?: boolean  // Toggle age adjustments
  currentYear?: number
}

// Add to evaluateTrade function
export function evaluateTrade(input: DynastyTradeInput): TradeOutput {
  const { useDynastyValues = false, currentYear = new Date().getFullYear() } = input
  
  // Calculate player values (existing logic)
  let givingValue = input.givingPlayers.reduce((sum, p) => {
    const baseValue = p.vbdScore
    if (useDynastyValues && p.age) {
      const dynasty = calculateDynastyVBD({ player: p, age: p.age })
      return sum + dynasty.dynastyVBD
    }
    return sum + baseValue
  }, 0)
  
  let receivingValue = input.receivingPlayers.reduce((sum, p) => {
    const baseValue = p.vbdScore
    if (useDynastyValues && p.age) {
      const dynasty = calculateDynastyVBD({ player: p, age: p.age })
      return sum + dynasty.dynastyVBD
    }
    return sum + baseValue
  }, 0)
  
  // Add draft pick values
  if (input.givingDraftPicks) {
    givingValue += input.givingDraftPicks.reduce(
      (sum, pick) => sum + getDraftPickValue(pick, currentYear), 0
    )
  }
  
  if (input.receivingDraftPicks) {
    receivingValue += input.receivingDraftPicks.reduce(
      (sum, pick) => sum + getDraftPickValue(pick, currentYear), 0
    )
  }
  
  // ... rest of existing logic
}
```

---

## Phase 2: ML Projection System (P1)

### 2.1 Feature Engineering Module

**File:** `src/lib/ml/features.ts` (new)

```typescript
export interface PlayerFeatures {
  // Volume (most predictive)
  targetShare: number
  rushShare: number
  snapPercentage: number
  redZoneOpportunities: number
  
  // Efficiency
  yardsPerRouteRun: number
  firstDownsPerRoute: number
  catchRate: number
  
  // Context
  vegasGameTotal: number
  teamImpliedTotal: number
  opponentDVOA: number
  homeAway: 0 | 1
  
  // Temporal (three windows)
  seasonAvgPoints: number
  rolling4AvgPoints: number
  rolling4StdPoints: number
  prevWeekPoints: number
}

export function extractFeatures(playerData: RawPlayerData): PlayerFeatures {
  // Implementation for feature extraction from raw data
  // Would pull from Sleeper API, nflverse, etc.
}
```

### 2.2 Ensemble Model Architecture

**File:** `src/lib/ml/ensemble.ts` (new)

```typescript
export interface EnsembleConfig {
  ridgeWeight: number
  xgbWeight: number
  lgbmWeight: number
}

export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  ridgeWeight: 0.35,
  xgbWeight: 0.35,
  lgbmWeight: 0.30,
}

export interface ProjectionResult {
  playerId: string
  projectedPoints: number
  uncertainty: number
  floor: number  // 20th percentile
  ceiling: number  // 80th percentile
  modelBreakdown: {
    ridge: number
    xgb: number
    lgbm: number
  }
}

// Note: Actual model training would be done in Python
// This TypeScript interface is for consuming pre-trained model outputs
export async function getEnsembleProjection(
  playerId: string,
  features: PlayerFeatures,
  config: EnsembleConfig = DEFAULT_ENSEMBLE_CONFIG
): Promise<ProjectionResult> {
  // Call Python API or pre-computed projections
  const response = await fetch('/api/ml/projection', {
    method: 'POST',
    body: JSON.stringify({ playerId, features }),
  })
  return response.json()
}
```

### 2.3 Uncertainty Quantification

**File:** `src/lib/ml/uncertainty.ts` (new)

```typescript
export interface UncertaintyMetrics {
  projectionStdDev: number      // From multi-source variance
  modelDisagreement: number     // From ensemble spread
  sampleSize: number            // Games played this season
  confidenceLevel: 'high' | 'medium' | 'low'
}

export function calculateUncertainty(
  projections: number[],
  modelOutputs: { ridge: number; xgb: number; lgbm: number },
  gamesPlayed: number
): UncertaintyMetrics {
  // Multi-source projection variance
  const projMean = projections.reduce((a, b) => a + b, 0) / projections.length
  const projVariance = projections.reduce((sum, p) => sum + Math.pow(p - projMean, 2), 0) / projections.length
  const projectionStdDev = Math.sqrt(projVariance)
  
  // Model disagreement
  const modelValues = [modelOutputs.ridge, modelOutputs.xgb, modelOutputs.lgbm]
  const modelMean = modelValues.reduce((a, b) => a + b, 0) / 3
  const modelVariance = modelValues.reduce((sum, v) => sum + Math.pow(v - modelMean, 2), 0) / 3
  const modelDisagreement = Math.sqrt(modelVariance)
  
  // Combined uncertainty scaled to 0-100
  const rawUncertainty = (projectionStdDev + modelDisagreement) / 2
  const sampleSizePenalty = gamesPlayed < 4 ? 1.5 : gamesPlayed < 8 ? 1.2 : 1.0
  const scaledUncertainty = Math.min(100, rawUncertainty * sampleSizePenalty * 10)
  
  return {
    projectionStdDev,
    modelDisagreement,
    sampleSize: gamesPlayed,
    confidenceLevel: scaledUncertainty < 30 ? 'high' : scaledUncertainty < 60 ? 'medium' : 'low',
  }
}
```

---

## Phase 3: Advanced Features (P2-P3)

### 3.1 Bayesian Weekly Updates

**File:** `src/lib/ml/bayesian.ts` (new)

```typescript
export interface BayesianProjection {
  playerId: string
  prior: { mean: number; variance: number }
  weeklyScores: number[]
  posterior: { mean: number; variance: number }
  lastUpdated: Date
}

export function initializePrior(adpRank: number, position: Position): { mean: number; variance: number } {
  // Convert ADP to expected points based on historical data
  const positionBaselines: Record<Position, { base: number; decay: number }> = {
    QB: { base: 22, decay: 0.15 },
    RB: { base: 18, decay: 0.20 },
    WR: { base: 15, decay: 0.18 },
    TE: { base: 12, decay: 0.25 },
    K: { base: 8, decay: 0.10 },
    DEF: { base: 7, decay: 0.08 },
  }
  
  const { base, decay } = positionBaselines[position] || { base: 10, decay: 0.15 }
  const mean = base * Math.exp(-decay * (adpRank - 1) / 12)
  const variance = Math.pow(mean * 0.3, 2)  // 30% coefficient of variation
  
  return { mean, variance }
}

export function updatePosterior(projection: BayesianProjection, newWeekScore: number): void {
  projection.weeklyScores.push(newWeekScore)
  
  const n = projection.weeklyScores.length
  const sampleMean = projection.weeklyScores.reduce((a, b) => a + b, 0) / n
  const sampleVariance = projection.weeklyScores.reduce(
    (sum, x) => sum + Math.pow(x - sampleMean, 2), 0
  ) / n || 1
  
  // Bayesian update (conjugate normal-normal)
  const priorPrecision = 1 / projection.prior.variance
  const dataPrecision = n / sampleVariance
  const totalPrecision = priorPrecision + dataPrecision
  
  projection.posterior = {
    mean: (priorPrecision * projection.prior.mean + dataPrecision * sampleMean) / totalPrecision,
    variance: 1 / totalPrecision,
  }
  
  projection.lastUpdated = new Date()
}
```

### 3.2 Market Sentiment Integration

**File:** `src/lib/external/market-values.ts` (new)

```typescript
export interface MarketValue {
  playerId: string
  ktcValue: number | null
  dynastyProcessValue: number | null
  fantasyCalcValue: number | null
  consensusValue: number
  lastFetched: Date
}

export async function fetchKTCValues(): Promise<Record<string, number>> {
  // KeepTradeCut API integration
  // Note: Check their API terms of service
}

export async function fetchDynastyProcessValues(): Promise<Record<string, number>> {
  // DynastyProcess publishes values publicly
  // https://dynastyprocess.com/values/
}

export function calculateConsensusValue(
  ktc: number | null,
  dp: number | null,
  fc: number | null
): number {
  const values = [ktc, dp, fc].filter(v => v !== null) as number[]
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}
```

### 3.3 Player Correlation Matrix

**File:** `src/lib/algorithms/correlations.ts` (new)

```typescript
export interface CorrelationMatrix {
  playerIds: string[]
  matrix: number[][]  // Symmetric matrix
}

// Pre-computed correlations based on historical data
export const CORRELATION_RULES = {
  // Same team, same game
  QB_WR1_SAME_TEAM: 0.65,
  QB_TE1_SAME_TEAM: 0.55,
  WR1_WR2_SAME_TEAM: -0.15,  // Competing for targets
  RB_TEAM_GAME_SCRIPT: 0.30,
  
  // Opposing teams
  QB_OPPOSING_DEF: -0.30,
  
  // Position-level (league trends)
  RB_RB_LEAGUE: 0.10,
  WR_WR_LEAGUE: 0.08,
}

export function getPlayerCorrelation(
  player1: Player,
  player2: Player
): number {
  // Same player
  if (player1.id === player2.id) return 1.0
  
  // Same team correlations
  if (player1.team === player2.team) {
    if (player1.position === 'QB' && player2.position === 'WR') {
      return CORRELATION_RULES.QB_WR1_SAME_TEAM
    }
    // ... other same-team rules
  }
  
  // Default low correlation
  return 0.05
}
```

---

## Testing Requirements

### Unit Tests Required

```typescript
// src/tests/unit/algorithms/age-curves.test.ts
describe('Age Curves', () => {
  test('RB age factor peaks at 25', () => {
    expect(getAgeFactor('RB', 25)).toBeCloseTo(1.0)
    expect(getAgeFactor('RB', 30)).toBeLessThan(0.6)
  })
  
  test('QB age factor decays slowly', () => {
    expect(getAgeFactor('QB', 35)).toBeGreaterThan(0.8)
  })
})

// src/tests/unit/algorithms/draft-picks.test.ts
describe('Draft Pick Valuation', () => {
  test('1.01 is most valuable', () => {
    const pick101 = getDraftPickValue({ year: 2025, round: 1, position: 'early' }, 2025)
    const pick112 = getDraftPickValue({ year: 2025, round: 1, position: 'late' }, 2025)
    expect(pick101).toBeGreaterThan(pick112)
  })
  
  test('Future picks discounted', () => {
    const current = getDraftPickValue({ year: 2025, round: 1, position: 'mid' }, 2025)
    const future = getDraftPickValue({ year: 2026, round: 1, position: 'mid' }, 2025)
    expect(future).toBeLessThan(current * 0.85)
  })
})
```

---

## API Changes

### New Endpoints

```typescript
// POST /api/algorithms/dynasty-vbd
// Calculate dynasty-adjusted VBD for players
interface DynastyVBDRequest {
  leagueId: string
  playerIds: string[]
  yearsToProject?: number
}

// POST /api/algorithms/trade (extended)
// Add dynasty mode and draft picks
interface ExtendedTradeRequest extends TradeRequest {
  useDynastyValues?: boolean
  givingDraftPicks?: DraftPick[]
  receivingDraftPicks?: DraftPick[]
}

// GET /api/market-values
// Fetch aggregated market values
interface MarketValuesResponse {
  players: MarketValue[]
  lastUpdated: Date
}
```

---

## Timeline Estimate

| Phase | Features | Duration |
|-------|----------|----------|
| **Phase 1** | Age curves, draft picks, dynasty VBD | 2-3 weeks |
| **Phase 2** | ML projections, uncertainty | 4-6 weeks |
| **Phase 3** | Bayesian, market integration | 3-4 weeks |
| **Phase 4** | RL optimization, correlations | 4-6 weeks |

**Total:** 13-19 weeks for full implementation

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dynasty VBD accuracy | R² > 0.7 vs. KTC values | Correlation analysis |
| Projection RMSE | < industry average | Benchmark vs. FantasyPros |
| User engagement | +20% trade calculator usage | Analytics |
| Uncertainty calibration | 80% CI contains 80% of outcomes | Backtest |

---

## References

See individual research documents for detailed sources:
- [Dynasty Valuation Algorithms](./dynasty-valuation-algorithms.md)
- [Machine Learning Models](./machine-learning-models.md)
- [Trade Value Systems](./trade-value-systems.md)
- [Age Curves & Metrics](./age-curves-and-metrics.md)
- [Uncertainty & Monte Carlo](./uncertainty-and-monte-carlo.md)
