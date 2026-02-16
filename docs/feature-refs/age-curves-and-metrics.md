# Age Curves & Advanced Metrics

**Research Date:** January 2026

---

## 1. Position-Specific Age Curves

### Summary Table

| Position | Peak Age | Prime Window | Cliff Age | Avg Career |
|----------|----------|--------------|-----------|------------|
| **QB** | 27-32 | 26-34 | 38 | 10+ years |
| **RB** | 23-26 | 22-28 | 28 | 4.2 years |
| **WR** | 25-28 | 24-31 | 32 | 6.8 years |
| **TE** | 26-30 | 25-32 | 33 | 7.5 years |

### Running Backs

**Key Statistics:**
- **Peak Age:** 26 (based on 25-year analysis of RBs with ≥1 top-24 season)
- **Prime Window:** Ages 22-28
- **Cliff:** Dramatic falloff at age 28-29
- **Career Length:** 4.2 years as primary starter

**Development Pattern:**
- 88% of career baseline in rookie season
- Most common breakout year: Rookie (35% of breakouts)
- 77% of top-24 RBs reach that status by age 25
- 95% reach top-24 by age 28

**Age Curve (% of Peak Production):**
```
Age 22: 85%
Age 23: 92%
Age 24: 96%
Age 25: 99%
Age 26: 100% (Peak)
Age 27: 95%
Age 28: 85%
Age 29: 70%
Age 30: 55%
Age 31: 45%
Age 32: 35%
Age 33+: 25% or less
```

**Dynasty Implication:** Sell RBs after Year 4, before the cliff.

### Wide Receivers

**Key Statistics:**
- **Peak Age:** 26-28
- **Prime Window:** Ages 24-31
- **Cliff:** Significant decline after 32
- **Career Length:** 6.8 years as productive starter

**Development Pattern:**
- Gradual improvement through ages 25-28
- 70% of breakouts occur in Years 2-4
- Slower start than RBs, longer prime

**Age Curve (% of Peak Production):**
```
Age 22: 80%
Age 23: 85%
Age 24: 93%
Age 25: 97%
Age 26: 100% (Peak Start)
Age 27: 100%
Age 28: 100% (Peak End)
Age 29: 95%
Age 30: 88%
Age 31: 80%
Age 32: 74%
Age 33: 65%
Age 34+: 50% or less
```

**Dynasty Implication:** WRs maintain value longer; don't panic sell at 28.

### Tight Ends

**Key Statistics:**
- **Peak Age:** 26-30 (latest developing position)
- **Prime Window:** Ages 25-32
- **Cliff:** Minimal until 31, gradual thereafter
- **Career Length:** 7.5 years (longest of skill positions)

**Development Pattern:**
- Slowest maturation (often Years 2-4 for breakout)
- 89% of baseline still at age 34
- Most durable position

**Age Curve (% of Peak Production):**
```
Age 22: 65%
Age 23: 75%
Age 24: 85%
Age 25: 92%
Age 26: 100% (Peak Start)
Age 27: 100%
Age 28: 100%
Age 29: 100%
Age 30: 100% (Peak End)
Age 31: 95%
Age 32: 90%
Age 33: 85%
Age 34: 78%
Age 35+: 65% or less
```

**Dynasty Implication:** Be patient with young TEs; elite TEs hold value into 30s.

### Quarterbacks

**Key Statistics:**
- **Peak Age:** Variable (27-32 for most, later for elite)
- **Prime Window:** 26-34 (widest of any position)
- **Cliff:** 38+ for most, later for pocket passers
- **Career Length:** 10+ years for starters

**Characteristics:**
- Exceptional longevity compared to other positions
- Rushing QBs have shorter peaks than pocket passers
- Experience often compensates for physical decline

**Dynasty Implication:** QBs are long-term assets; don't overweight age for elite QBs.

---

## 2. Mathematical Age Models

### Exponential Decay Formula

```typescript
function getAgeFactor(position: Position, age: number): number {
  const curves: Record<Position, { peak: number; decay: number }> = {
    QB: { peak: 29, decay: 0.03 },   // Slow decay
    RB: { peak: 25, decay: 0.12 },   // Fast decay
    WR: { peak: 27, decay: 0.06 },   // Moderate decay
    TE: { peak: 28, decay: 0.05 },   // Slow decay
  }
  
  const { peak, decay } = curves[position]
  const ageDiff = Math.abs(age - peak)
  
  return Math.exp(-decay * ageDiff)
}
```

### Survival Analysis (Career Length)

Using Kaplan-Meier estimates and Cox proportional hazards:

```
h(t) = h₀(t) × exp(β₁×Age + β₂×Position + β₃×InjuryHistory)
```

Where:
- `h(t)` = Hazard rate (probability of career ending)
- `h₀(t)` = Baseline hazard function
- `β` = Coefficients for risk factors

### Production Baseline Model

```typescript
function projectFutureProduction(
  currentProduction: number,
  currentAge: number,
  position: Position,
  yearsOut: number
): number {
  const futureAge = currentAge + yearsOut
  const currentFactor = getAgeFactor(position, currentAge)
  const futureFactor = getAgeFactor(position, futureAge)
  
  // Adjust for relative decline from current position
  const relativeDecline = futureFactor / currentFactor
  
  return currentProduction * relativeDecline
}
```

---

## 3. Opportunity Metrics

### Target Share

**Formula:**
```
Target Share = Player Targets / Team Targets
```

**Predictive Thresholds:**
- **Elite WRs:** >25% target share
- **WR2 Territory:** 15-20% target share
- **Replacement Level:** <12% target share

**True Target Share (Context-Adjusted):**
```
True Target Share = Targets / (Team Targets - Player Targets)
```

### Route Participation

**Formula:**
```
Route Participation Rate = Routes Run / Team Total Routes
```

**Why It Matters:**
- More predictive than raw targets
- Accounts for offensive pace
- Identifies "always on the field" players

### Targets Per Route Run (TPRR)

**Formula:**
```
TPRR = Targets / Routes Run
```

**Thresholds:**
- **Elite:** >25% TPRR
- **Good:** 20-25% TPRR
- **Average:** 15-20% TPRR

### Snap Share

**Formula:**
```
Snap Share = Player Snaps / Team Offensive Snaps
```

**RB Opportunity Score:**
```
RB Opportunity = (Rush Share × 0.6) + (Target Share × 0.4)
```

---

## 4. Efficiency Metrics

### Yards Per Route Run (YPRR)

**The "Holy Grail" for WR Evaluation**

**Formula:**
```
YPRR = Receiving Yards / Routes Run
```

**Thresholds:**
| Level | YPRR | Example Players |
|-------|------|-----------------|
| Elite | >2.5 | Top 5 WRs |
| Great | 2.0-2.5 | WR1 territory |
| Good | 1.5-2.0 | Solid starters |
| Below Average | <1.5 | Bench/replacement |

**Predictive Power:**
- Top 10% YPRR correlates strongly with next-year fantasy points
- More stable year-to-year than raw yardage

### First Downs Per Route Run (1D/RR)

**More Stable Than YPRR**

**Formula:**
```
1D/RR = First Downs Gained / Routes Run
```

**Why Better:**
- 0.15 higher correlation to next-year performance than YPRR
- Captures "clutch" ability on third downs
- Less affected by outlier big plays

### Yards After Contact (YAC)

**For RB Evaluation**

**Formula:**
```
YAC/Attempt = Yards After Contact / (Rushes + Receptions)
```

**Related Metrics:**
- **Broken Tackle Rate:** Broken Tackles / Attempts
- **Contact Balance:** Yards Before Contact / Yards After Contact
- **Evaded Tackles:** Missed tackles forced per touch

### Separation Metrics

**For WR Evaluation**

| Metric | Description |
|--------|-------------|
| **Avg Separation** | Distance from nearest defender at catch |
| **Success vs. Man** | Completion rate when targeted vs. man coverage |
| **Route Running Grade** | PFF subjective grade for route precision |
| **Cushion at Snap** | Distance from CB at line of scrimmage |

---

## 5. Situation-Independent Metrics

### Context-Neutral YPRR

**Adjusts for scheme and personnel:**
```
YPRR_adj = YPRR × (League Avg WRs on Field / Team Avg WRs on Field)
```

### Catchable Target Rate

**Formula:**
```
Catchable Rate = Catchable Targets / Total Targets
```

**Why It Matters:**
- Players with high catchable rates maintain production across QB changes
- Identifies "QB-proof" receivers

### Dominator Rating

**For College/Rookie Evaluation**

**Formula:**
```
Dominator = (Player Receiving Yards + Player Receiving TDs × 20) / 
            (Team Receiving Yards + Team Receiving TDs × 20)
```

**Breakout Threshold:**
- WRs: 20%+ dominator rating
- RBs: 25%+ dominator rating
- Breakout Age: Age at first dominator breakout

### Air Yards Share

**Scheme-Independent Volume**

**Formula:**
```
Air Yards Share = Player Air Yards / Team Air Yards
```

**Why It Matters:**
- Air yards translate across offensive systems
- Identifies "alpha" role regardless of completion rate
- Less affected by YAC variance

---

## 6. Expected Fantasy Points (xFP)

### Concept

xFP strips away efficiency to measure pure **opportunity value**:

```
xFP = Expected points based solely on usage, not execution
```

### Components

| Input | Adjustment |
|-------|------------|
| Rushing Attempts | × Expected yards per carry (based on box count, etc.) |
| Targets | × Expected catch rate (based on depth, location) |
| Receptions | × Expected YAC (based on position, location) |
| Red Zone Looks | × Expected TD rate |

### Fantasy Points Over Expected (FPOE)

**Formula:**
```
FPOE = Actual Fantasy Points - xFP
```

**Interpretation:**
- **FPOE > 0:** Player outperforming opportunity (efficiency)
- **FPOE < 0:** Player underperforming opportunity (inefficiency)
- **Regression candidate:** Extreme FPOE likely to regress

---

## 7. Implementation for Quantasy

### Composite Dynasty Score

```typescript
interface DynastyMetrics {
  // Core Value
  currentVBD: number
  dynastyVBD: number  // Age-adjusted multi-year
  
  // Age Factors
  age: number
  ageFactor: number
  yearsToCliff: number
  
  // Opportunity
  targetShare: number
  snapShare: number
  opportunityScore: number
  
  // Efficiency
  yprr: number
  firstDownsPerRoute: number
  catchableTargetRate: number
  
  // Risk
  injuryHistory: number  // Games missed last 3 years
  volatility: number     // Week-to-week std dev
}

function calculateDynastyScore(metrics: DynastyMetrics): number {
  const weights = {
    dynastyVBD: 0.35,
    opportunityScore: 0.25,
    efficiency: 0.20,
    ageFactor: 0.15,
    risk: 0.05,
  }
  
  const efficiencyScore = (metrics.yprr / 2.5) * 100  // Normalize to 100
  const riskScore = 100 - (metrics.injuryHistory * 5) - (metrics.volatility * 2)
  
  return (
    metrics.dynastyVBD * weights.dynastyVBD +
    metrics.opportunityScore * weights.opportunityScore +
    efficiencyScore * weights.efficiency +
    metrics.ageFactor * 100 * weights.ageFactor +
    riskScore * weights.risk
  )
}
```

### Buy/Sell/Hold Classification

```typescript
function classifyDynastyAction(
  player: Player,
  metrics: DynastyMetrics
): 'buy' | 'sell' | 'hold' {
  const { age, ageFactor, opportunityScore, yprr } = metrics
  const position = player.position
  
  // Sell candidates: Past peak with declining metrics
  if (position === 'RB' && age >= 27 && opportunityScore < 50) return 'sell'
  if (position === 'WR' && age >= 30 && yprr < 1.5) return 'sell'
  if (ageFactor < 0.7) return 'sell'
  
  // Buy candidates: Pre-peak with strong efficiency
  if (position === 'RB' && age <= 24 && yprr > 1.8) return 'buy'
  if (position === 'WR' && age <= 25 && opportunityScore > 60) return 'buy'
  if (position === 'TE' && age <= 26 && yprr > 1.5) return 'buy'
  
  return 'hold'
}
```

---

## References

- PFF Age Curves: https://www.pff.com/news/fantasy-football-aging-curves
- 4for4 Production Curves: https://www.4for4.com/2025/preseason/production-curves
- RotoViz Dynasty Age: https://www.rotoviz.com/dynasty-football-age-decay-curves/
- ESPN xFP Model: https://www.espn.com/fantasy/football/
