# Dynasty Valuation Algorithms

**Research Date:** January 2026

---

## 1. Value-Based Drafting (VBD) Foundation

### Core Formula
```
VBD = Projected Points - Baseline (Replacement Level)
```

VBD values players based on their **points above replacement level**, not total points. This normalizes value across positions with different scoring scales.

### VBD Variations
| Variant | Definition | Best For |
|---------|------------|----------|
| **VORP** | Value Over Replacement Player | General use |
| **VONA** | Value Over Next Available | Draft decisions |
| **VOLS** | Value Over Last Starter | Roster construction |

### Our Current Implementation
**Location:** `src/lib/algorithms/vbd.ts`

```typescript
// Baseline calculation
baselineRank = leagueSize × starters
// Example: 12-team, 2 RB starters → RB24 is baseline

// VBD calculation
vbd = projectedPoints - baselineProjectedPoints

// FLEX handling - player gets credit for best slot
vbd = Math.max(positionVBD, flexVBD)

// IDP scarcity (when IDP ≥ 40% of roster)
multiplier = 1.0 + (idpPercentage - 0.40) × 2
```

### Limitations for Dynasty
- Single-year focus only
- No age adjustments or career trajectory
- No rookie development curves
- Position scarcity can distort values

---

## 2. Dynasty-Specific Valuation Methods

### The Dynasty Total Value Formula

The industry standard for multi-year dynasty valuation:

```
V_total = Σ(t=0 to n) [VBD_t × P(survival)_t] / (1 + r)^t
```

**Variables:**
- `VBD_t` = Projected VBD in year t
- `P(survival)_t` = Probability player is still productive at year t (age curve)
- `r` = Discount rate (typically 15-25%)
- `n` = Expected remaining career years

### Practical "Three-Year Window" Simplification

Most dynasty algorithms cap projections at 3 years:

```
Value = (Year1 VBD × 1.0) + (Year2 VBD × 0.8) + (Year3 VBD × 0.6)
```

**Why 3 years?**
1. NFL roster prediction beyond 3 years is statistically impossible
2. At 20% discount rate, Year 4+ production worth <50% of today

### Age Curve Integration

Apply position-specific age penalties:

```typescript
function getAgeFactor(position: Position, age: number): number {
  const curves = {
    QB: { peak: 29, decay: 0.03 },  // Slowest decline
    RB: { peak: 25, decay: 0.12 },  // Fastest decline
    WR: { peak: 27, decay: 0.06 },  // Moderate
    TE: { peak: 28, decay: 0.05 },  // Late development
  }
  const { peak, decay } = curves[position]
  return Math.exp(-decay * Math.abs(age - peak))
}
```

### Contract & Keeper Adjustments
- **Salary Cap Impact**: Contract cost affects net value
- **Years Remaining**: Longer control = higher dynasty value
- **Option Years**: Team options add premium value
- **Rookie Scale**: 5-year control for first-round picks

---

## 3. Major Platform Approaches

### FantasyPros
**Methodology:**
- Uses Expert Consensus Rankings (ECR) as base
- Exponential decay curve: `Value = 10500 × e^(ECR × -0.0235)`
- Position adjustments with different coefficients
- League customization for depth vs. stud preferences

### DynastyProcess (Open Source)
**Core Formula:**
```r
Value = 10500 * e^(FP ECR * -0.0235)
```

**Key Features:**
- Exponential decay from ECR rankings
- Rookie Pick Model: Blend of "Perfect Knowledge" and "Hit Rate" GAM models
- Future Pick Discount: 80% of current year value
- 2QB Adjustment via LOESS regression

**Customization Parameters:**
| Parameter | Range | Effect |
|-----------|-------|--------|
| Valuation Factor | -0.0220 to -0.0250 | Depth vs. stud preference |
| Rookie Optimism | 0-100% | Perfect knowledge vs. hit rate blend |
| Future Factor | % | Future pick discount rate |

### KeepTradeCut (KTC)
**Methodology:** Crowdsourced Elo rating system

**How It Works:**
1. Users rank three players as KEEP/TRADE/CUT
2. Each ranking treated as head-to-head match
3. Elo points exchanged based on expected vs. actual outcome
4. Higher-ranked player losing to lower-ranked = bigger swing

**Formula Components:**
```
score = -adjustedADP + noise + tiebreaker
adjustedADP = baseADP × (1 + preferenceModifier)
```

**Pros:**
- Real-time market sentiment
- No single expert bias
- Updates instantly with news

**Cons:**
- High volatility on weekly performance
- Susceptible to hype trains
- Can reinforce echo chamber

### FantasyCalc
**Methodology:** Data-driven from 2.4M+ real trades

**Process:**
1. Run optimization algorithm for initial values
2. Weight recent trades more heavily
3. Remove outlier trades
4. Adjust for league settings (SF, PPR, team count)
5. Apply frequency penalty for rarely traded players
6. Smooth pick values with gamma distribution

---

## 4. Draft Pick Valuation

### Jimmy Johnson Chart (Traditional)
| Pick | Value |
|------|-------|
| 1.01 | 3,000 |
| 1.06 | 1,600 |
| 1.12 | 1,200 |
| 2.01 | 580 |
| 3.01 | 265 |

Steep exponential decline, limited value for mid-late picks.

### DynastyProcess Approach
**Dual Model Blend:**

```r
# Perfect Knowledge: What if we knew outcomes?
perfect_knowledge = nth_ranked_player_value_from_draft_class

# Hit Rate: Historical success probability
hit_rate = GAM_model_of_draft_position_success

# Blend (default 80% optimism)
rookie_value = 0.8 × perfect_knowledge + 0.2 × hit_rate
```

### Future Pick Discount
Progressive monthly adjustment toward current year:

```r
if (month < September): future_factor = 0.80
if (month = October):   future_factor = 0.85
if (month = November):  future_factor = 0.90
if (month = December):  future_factor = 0.95
```

### Position Within Round
| Position | Description | Value Modifier |
|----------|-------------|----------------|
| Early | 1.01-1.04 | +10-15% |
| Mid | 1.05-1.08 | Baseline |
| Late | 1.09-1.12 | -10-15% |

---

## 5. Implementation Recommendations

### Priority 1: Add Dynasty VBD Extension
```typescript
function calculateDynastyVBD(
  player: Player, 
  yearsToProject: number = 3,
  discountRate: number = 0.20
): number {
  let totalValue = 0
  
  for (let t = 0; t < yearsToProject; t++) {
    const futureAge = player.age + t
    const ageFactor = getAgeFactor(player.position, futureAge)
    const yearVBD = player.currentVBD * ageFactor
    totalValue += yearVBD / Math.pow(1 + discountRate, t)
  }
  
  return totalValue
}
```

### Priority 2: Add Draft Pick Values
```typescript
function getDraftPickValue(
  round: number, 
  position: number, 
  year: number
): number {
  const ecr = (round - 1) * 12 + position
  const baseValue = 10500 * Math.exp(-0.0235 * ecr)
  
  const yearDiff = year - currentYear
  const futureDiscount = Math.pow(0.80, yearDiff)
  
  return baseValue * futureDiscount
}
```

### Priority 3: Extend Trade Calculator
```typescript
interface DynastyTradeInput extends TradeInput {
  givingDraftPicks: DraftPick[]
  receivingDraftPicks: DraftPick[]
  useDynastyValues: boolean  // Toggle age adjustments
}
```

---

## References

- DynastyProcess: https://dynastyprocess.com/values/
- FantasyPros VBD: https://www.fantasypros.com/2024/07/what-is-value-based-drafting-vbd/
- KeepTradeCut: https://keeptradecut.com/
- FantasyCalc: https://fantasycalc.com/
