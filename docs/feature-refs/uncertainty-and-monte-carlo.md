# Uncertainty Quantification & Monte Carlo Simulation

**Research Date:** January 2026

---

## 1. Projection Uncertainty Methods

### Variance Across Projection Sources

The most practical uncertainty metric: how much do experts disagree?

**Method:**
```typescript
interface ProjectionWithUncertainty {
  playerId: string
  projectedPoints: number
  uncertainty: number  // Standard deviation across sources
  floor: number        // 20th percentile
  ceiling: number      // 80th percentile
}

function calculateUncertainty(projections: number[]): number {
  const mean = projections.reduce((a, b) => a + b, 0) / projections.length
  const variance = projections.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / projections.length
  return Math.sqrt(variance)
}
```

**Interpretation:**
- High variance = high uncertainty = risky player
- Low variance = high consensus = stable floor

### Distribution Shapes by Player Type

| Player Type | Distribution | Characteristics |
|-------------|--------------|-----------------|
| Established Starters | Normal | Bell curve around projection |
| Rookies | Right-skewed | High ceiling, low floor |
| Injury-prone | Bimodal | Healthy peak OR injured zero |
| Boom/Bust | Platykurtic | Fat tails, extreme outcomes |

### Confidence Interval Construction

```typescript
function getConfidenceInterval(
  projection: number,
  uncertainty: number,
  confidenceLevel: number = 0.8
): { floor: number; ceiling: number } {
  // Z-scores for common confidence levels
  const zScores: Record<number, number> = {
    0.5: 0.67,
    0.8: 1.28,
    0.9: 1.645,
    0.95: 1.96,
  }
  
  const z = zScores[confidenceLevel] || 1.28
  
  return {
    floor: projection - (z * uncertainty),
    ceiling: projection + (z * uncertainty),
  }
}
```

---

## 2. Our Monte Carlo Implementation

### Current State
**Location:** `src/lib/algorithms/monte-carlo/`

Our implementation calculates **survival rates** - the probability a player will be available at your draft pick.

### Core Algorithm

```typescript
// For each iteration (100-1000x):
for (let i = 0; i < iterations; i++) {
  // Start from current draft position
  let availablePlayers = [...allPlayers]
  
  // Simulate picks until user's turn
  for (let pick = currentPick; pick < userNextPick; pick++) {
    const team = getTeamForPick(pick)
    
    if (team === userTeam) {
      // User picks target player
      availablePlayers = availablePlayers.filter(p => p.id !== targetId)
    } else {
      // Simulate opponent pick using market model
      const opponentPick = simulateMarketPick(availablePlayers, config)
      availablePlayers = availablePlayers.filter(p => p.id !== opponentPick.id)
    }
  }
  
  // Track if target was available
  if (availablePlayers.some(p => p.id === targetId)) {
    survivedCount++
  }
}

survivalRate = survivedCount / iterations
```

### Market Model (Opponent Simulation)

```typescript
function simulateMarketPick(
  availablePlayers: Player[],
  config: MarketConfig
): Player {
  // Score each player
  const scores = availablePlayers.map(player => {
    const baseADP = player.adp
    const preferenceModifier = config.preferences[player.id] || 0
    const adjustedADP = baseADP * (1 + preferenceModifier)
    
    // Add Gaussian noise for unpredictability
    const noise = gaussianRandom(0, config.noiseStdDev)
    const tiebreaker = Math.random() * config.tiebreaker
    
    return -adjustedADP + noise + tiebreaker
  })
  
  // Return player with highest score (lowest adjusted ADP)
  const maxIndex = scores.indexOf(Math.max(...scores))
  return availablePlayers[maxIndex]
}
```

### Adaptive Iteration Count

```typescript
function determineIterationCount(variance: number): number {
  if (variance > 0.2) return 1000  // High uncertainty
  if (variance > 0.1) return 500   // Medium uncertainty
  return 100                        // Low uncertainty (stop early)
}
```

---

## 3. Bayesian Approaches

### Why Bayesian for Fantasy?

1. **Natural uncertainty quantification** via posterior distributions
2. **Incorporates prior knowledge** (ADP, historical performance)
3. **Sequential updating** as season progresses
4. **Handles small sample sizes** better than frequentist methods

### Bayesian Projection Framework

```typescript
interface BayesianProjection {
  prior: {
    mean: number      // Pre-season expectation (from ADP)
    variance: number  // Uncertainty in prior
  }
  data: number[]       // Observed weekly performances
  posterior: {
    mean: number      // Updated projection
    variance: number  // Updated uncertainty
  }
}

function updateBayesian(projection: BayesianProjection, newWeekScore: number): void {
  const { prior, data } = projection
  data.push(newWeekScore)
  
  // Conjugate normal-normal update
  const n = data.length
  const sampleMean = data.reduce((a, b) => a + b, 0) / n
  const sampleVariance = data.reduce((sum, x) => sum + Math.pow(x - sampleMean, 2), 0) / n
  
  // Posterior parameters (weighted average of prior and data)
  const priorWeight = 1 / prior.variance
  const dataWeight = n / sampleVariance
  const totalWeight = priorWeight + dataWeight
  
  projection.posterior = {
    mean: (priorWeight * prior.mean + dataWeight * sampleMean) / totalWeight,
    variance: 1 / totalWeight,
  }
}
```

### Practical Application: Weekly Updates

**Pre-Season (Week 0):**
```
Prior = ADP-based projection (e.g., 15 PPG for WR1)
Variance = High (no data yet)
```

**After Week 4:**
```
Data = [12, 18, 8, 22]  // Actual weekly scores
Posterior Mean = Weighted blend of prior (15) and sample mean (15)
Posterior Variance = Reduced (more confidence)
```

**Key Insight:** Early weeks, prior dominates. Later weeks, data dominates.

---

## 4. Game Theory in Trades

### Information Asymmetry

**The "Lemon Problem":**
When someone offers you a trade, ask: "What do they know that I don't?"

**Exploitation Strategy:**
- Use advanced metrics (xFP, target share) vs. box scores
- If you have info advantage, act quickly
- If opponent has info advantage, be cautious

### Nash Equilibrium in Trading

**Definition:** State where no manager can improve by unilaterally changing strategy.

**Fantasy Application:**
- Team A: 5 elite WRs, no RBs
- Team B: 5 elite RBs, no WRs
- Nash Equilibrium: Trade WR for RB (both teams improve)

**The "Hold-out" Problem:**
Demanding too much moves away from equilibrium → deal collapses.

### Trade Negotiation Concepts

| Concept | Application |
|---------|-------------|
| **Anchoring** | First offer sets the range |
| **Winner's Curse** | Instant acceptance = you overpaid |
| **BATNA** | Waiver wire depth affects leverage |
| **Signaling** | Offering a player reveals your valuation |

---

## 5. Risk-Adjusted Valuation

### Consistency Metrics

**Weekly Standard Deviation:**
```typescript
function calculateConsistency(weeklyScores: number[]): number {
  const mean = weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length
  const variance = weeklyScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / weeklyScores.length
  return Math.sqrt(variance)
}
```

**Boom/Bust Classification:**
- **Boom Player:** High ceiling, high std dev (e.g., deep threat WR)
- **Consistent Player:** Moderate ceiling, low std dev (e.g., slot WR)

### Risk-Adjusted VBD

```typescript
function riskAdjustedVBD(
  baseVBD: number,
  uncertainty: number,
  riskTolerance: number  // 0 = risk-averse, 1 = risk-neutral
): number {
  // Certainty equivalent: penalize uncertainty based on risk tolerance
  const riskPenalty = (1 - riskTolerance) * uncertainty
  return baseVBD - riskPenalty
}
```

### Portfolio Theory Application

**Treat roster like financial portfolio:**

```typescript
interface RosterPortfolio {
  players: Player[]
  expectedReturn: number    // Total projected points
  portfolioVariance: number // Combined uncertainty
  correlations: number[][]  // Player correlation matrix
}

function calculatePortfolioVariance(
  players: Player[],
  correlations: number[][]
): number {
  let variance = 0
  
  for (let i = 0; i < players.length; i++) {
    for (let j = 0; j < players.length; j++) {
      variance += players[i].variance * players[j].variance * correlations[i][j]
    }
  }
  
  return Math.sqrt(variance)
}
```

**Key Insight:** Negatively correlated players reduce overall roster risk.

---

## 6. Enhancement Recommendations

### Enhanced Monte Carlo Config

```typescript
interface EnhancedMonteCarloConfig extends MonteCarloConfig {
  // Current
  noiseStdDev: number
  adpWeight: number
  
  // Enhancements
  projectionVariance: Record<string, number>  // Per-player uncertainty
  correlationMatrix: number[][]               // Player correlations
  injuryRisk: Record<string, number>          // Injury probability
  opponentModeling: 'basic' | 'adaptive'      // Opponent intelligence
}
```

### Bayesian Projection System

```typescript
interface BayesianProjectionSystem {
  // Pre-season setup
  initializePriors(adpRankings: ADPRanking[]): void
  
  // Weekly updates
  updateWithWeekResults(weekResults: WeekResult[]): void
  
  // Projections
  getProjection(playerId: string): {
    mean: number
    stdDev: number
    confidenceInterval: { low: number; high: number }
  }
  
  // Full posterior for advanced analysis
  getPosteriorDistribution(playerId: string): Distribution
}
```

### Player Correlation Matrix

```typescript
// Players on same team are positively correlated
// Players on opposing teams have negative game-level correlation
// Same-position players have meta-correlation (league trends)

const correlations = {
  // QB-WR1 on same team: highly correlated
  'mahomes-kelce': 0.65,
  
  // Two WRs competing for targets: negatively correlated
  'wr1-wr2-same-team': -0.15,
  
  // Players on opposing teams (game total fixed)
  'qb-opposing-defense': -0.30,
}
```

---

## 7. Implementation Priority

### Phase 1: Uncertainty Display
- Add confidence intervals to all projections
- Show floor/ceiling in UI
- Color-code by uncertainty level

### Phase 2: Bayesian Updates
- Initialize priors from ADP
- Update weekly with actual results
- Display posterior vs. prior shift

### Phase 3: Correlation-Aware Monte Carlo
- Build player correlation matrix
- Use in Monte Carlo simulations
- Account for roster construction synergies

### Phase 4: Risk-Adjusted Recommendations
- Add risk tolerance setting
- Show risk-adjusted rankings
- Portfolio optimization for roster construction

---

## References

- Fantasy Football Analytics: https://fantasyfootballanalytics.net/
- Bayesian FF: https://nathanbraun.com/bayesian-fantasy-football/
- Monte Carlo Draft: Stanford CS221 research
- Portfolio Theory: Markowitz modern portfolio theory applied to FF
