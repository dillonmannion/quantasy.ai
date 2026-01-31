# Trade Value Systems & Calculators

**Research Date:** January 2026

---

## 1. KeepTradeCut (KTC) Methodology

### Core Approach: Crowdsourced Elo System

KTC uses a variation of the **Elo Rating System** (same system used in chess) to determine player values.

### How It Works

1. **Data Collection**
   - Users presented with 3 random players
   - Must rank as KEEP (highest), TRADE (middle), CUT (lowest)
   - Creates continuous stream of pairwise comparisons

2. **Elo Point Exchange**
   - Each ranking treated as head-to-head matches
   - KEEP "beats" TRADE and CUT
   - TRADE "beats" CUT
   - Points exchanged based on expected vs. actual outcome

3. **Strength of Opponent**
   - If low-ranked player "beats" high-ranked → big point swing
   - If expected winner wins → small point swing

4. **Scaling**
   - Elo ratings converted to 0-10,000 scale
   - Top asset (usually Mahomes/Allen in SF) pegged at ceiling
   - All others scaled proportionally

### Recency Weighting

Recent votes weighted more heavily than old votes:
- Reflects current "market price"
- Values can spike after big games
- Creates volatility (feature, not bug)

### Multi-Player Trade Adjustment

KTC applies a **package adjustment** to handle "3 quarters for a dollar" problem:

```
# Raw value is not simply additive
three_players_at_3000_each ≠ 9000

# Adjustment applies penalty for more players
adjusted_value = raw_sum × (1 - package_penalty)
```

### League Format Variations

| Format | TE Premium Setting |
|--------|-------------------|
| Standard | Off - no TE bonus |
| TE+ | +0.5-0.75 PPR bonus |
| TE++ | 2 TEs OR extreme bonus |

### Pros & Cons

| Pros | Cons |
|------|------|
| Real-time market sentiment | High volatility week-to-week |
| No single expert bias | Susceptible to hype trains |
| Democratic crowd wisdom | Echo chamber potential |
| Updates instantly with news | No performance data backing |

---

## 2. DynastyProcess Algorithm

### Core Formula: Exponential Decay

```r
Value = 10500 × e^(-0.0235 × ECR)
```

Where:
- **10500** = Base value multiplier
- **e** = Euler's number (2.71828)
- **-0.0235** = Valuation factor (adjustable)
- **ECR** = FantasyPros Expert Consensus Ranking

### Implementation

```r
.calculate_value <- function(df, value_factor) {
  .value_factor <- value_factor / 10000
  df_v <- df[, value := round(10500 * exp(-.value_factor * ecr))]
  return(df_v)
}
```

### Customization Parameters

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| Valuation Factor | -0.0235 | -0.0220 to -0.0250 | Higher = more value to studs |
| Rookie Optimism | 75% | 0-100% | Ceiling vs. hit rate blend |
| Future Factor | 80% | 50-100% | Future pick discount |

### Superflex/2QB Adjustment

Uses LOESS regression comparing 1QB and 2QB ADP data:

```r
# Position-specific adjustments
QB_2QB_ECR = 0.0122 × (1QB_ECR^1.7139)
RB_2QB_ECR = 1.539 × (1QB_ECR^0.9626)
WR_2QB_ECR = 1.4948 × (1QB_ECR^0.9689)
TE_2QB_ECR = 1.6367 × (1QB_ECR^0.9498)
```

**Example Impact:**
- Josh Allen: ECR 18.7 → Value 6,766 (1QB) vs 10,184 (2QB)
- ~50% value increase for elite QBs in Superflex

### Rookie Pick Valuation

**Dual Model Approach:**

```r
# Model 1: Perfect Knowledge (ceiling)
# What if we knew draft class outcomes?
perfect_knowledge = nth_ranked_player_value

# Model 2: Hit Rate (floor)
# Historical success rates by draft position
hit_rate = GAM_model_prediction

# Blend (default 75% optimism)
rookie_value = 0.75 × perfect_knowledge + 0.25 × hit_rate
```

### Future Pick Progressive Discount

```r
# Value increases as draft approaches
if (month < September):  factor = 0.80
if (month = October):    factor = 0.85
if (month = November):   factor = 0.90
if (month = December):   factor = 0.95
```

---

## 3. FantasyCalc Algorithm

### Core Approach: Trade Database Analysis

Built on **2,460,057+ real fantasy trades** with sophisticated statistical modeling.

### Process Pipeline

```
1. Run optimization algorithm for initial value discovery
   └── Across entire historical time period

2. Apply time weighting
   └── Recent trades weighted more heavily

3. Remove outlier trades
   └── Filter unrealistic/collusion trades

4. Adjust for league settings
   └── SuperFlex, PPR, team count

5. Apply frequency penalty
   └── Reduce confidence for rarely traded players

6. Smooth pick values
   └── Gamma distribution for draft picks
```

### Player Value Calculation

Each player's value at a point in time = weighted average of implied trade values:

```
Value_t = Σ(trade_implied_value × recency_weight) / Σ(recency_weight)
```

### Draft Pick Smoothing

Uses **Gamma distribution** to smooth pick values and handle:
- Position uncertainty (early vs. mid vs. late)
- Year uncertainty (2025 vs. 2026)
- Class strength variation

### Rebuilding vs. Contending Analysis

```
Diff = Redraft_Value - Dynasty_Value

If Diff > 0: Player better for contending (win-now value)
If Diff < 0: Player better for rebuilding (future value)
```

---

## 4. Draft Pick Value Charts

### Jimmy Johnson Chart (Traditional)

| Pick | Value | Pick | Value |
|------|-------|------|-------|
| 1.01 | 3,000 | 2.01 | 580 |
| 1.02 | 2,600 | 2.06 | 480 |
| 1.03 | 2,200 | 2.12 | 400 |
| 1.06 | 1,600 | 3.01 | 265 |
| 1.12 | 1,200 | 4.01 | 145 |

**Characteristics:**
- Created in 1990s by Cowboys coach
- Steep exponential decline in Round 1
- Limited value for mid-late picks
- Still widely referenced as baseline

### Rich Hill Chart (Modern Analytics)

**Philosophy:**
- Based on 15 years of actual NFL trade patterns
- More conservative top pick values
- Higher mid/late round values
- Reflects modern draft strategies

### Dynasty-Specific Adjustments

**Position Within Round:**

| Position | Modifier | Example |
|----------|----------|---------|
| Early (1-4) | +10-15% | 1.02 worth more than raw chart |
| Mid (5-8) | Baseline | Chart value |
| Late (9-12) | -10-15% | 1.11 worth less than raw chart |

**Future Year Discount:**

```typescript
function getFuturePickValue(baseValue: number, yearsOut: number): number {
  const discountRate = 0.80  // 20% annual discount
  return baseValue * Math.pow(discountRate, yearsOut)
}

// Examples:
// 2025 1st (current year): 100% value
// 2026 1st (next year): 80% value
// 2027 1st (2 years out): 64% value
```

---

## 5. Our Current Trade Implementation

### Location
`src/lib/algorithms/trade.ts`

### Current Formula

```typescript
// Fairness Score
fairnessScore = ((receivingValue - givingValue) / maxAbs) × 100

// Verdict Classification
if (score >= 50)  return 'great'       // You win significantly
if (score >= 10)  return 'fair'        // Slight advantage
if (score >= -10) return 'fair'        // Roughly even
if (score >= -50) return 'bad'         // Slight disadvantage
return 'veto-worthy'                   // You lose significantly
```

### Current Limitations

| Feature | Status |
|---------|--------|
| VBD-based player values | ✅ Implemented |
| Lineup impact analysis | ✅ Implemented |
| Draft pick valuation | ❌ Missing |
| Age-adjusted values | ❌ Missing |
| Market sentiment integration | ❌ Missing |
| Multi-year projections | ❌ Missing |

---

## 6. Implementation Recommendations

### Priority 1: Add Draft Pick Values

```typescript
const PICK_BASE_VALUES: Record<number, number> = {
  1: 8500,   // 1st round
  2: 4500,   // 2nd round
  3: 2500,   // 3rd round
  4: 1200,   // 4th round
}

const POSITION_MODIFIERS = {
  early: 1.15,   // Picks 1-4
  mid: 1.0,      // Picks 5-8
  late: 0.85,    // Picks 9-12
}

function getDraftPickValue(
  round: number,
  position: 'early' | 'mid' | 'late',
  year: number,
  currentYear: number
): number {
  const baseValue = PICK_BASE_VALUES[round] || 500
  const positionMod = POSITION_MODIFIERS[position]
  const yearDiscount = Math.pow(0.80, year - currentYear)
  
  return Math.round(baseValue * positionMod * yearDiscount)
}
```

### Priority 2: Add Age-Adjusted Values

```typescript
function getAgeAdjustedValue(
  player: Player,
  baseValue: number
): number {
  const ageFactor = getAgeFactor(player.position, player.age)
  return Math.round(baseValue * ageFactor)
}

function getAgeFactor(position: Position, age: number): number {
  const curves: Record<Position, { peak: number; decay: number }> = {
    QB: { peak: 29, decay: 0.03 },
    RB: { peak: 25, decay: 0.12 },
    WR: { peak: 27, decay: 0.06 },
    TE: { peak: 28, decay: 0.05 },
  }
  
  const { peak, decay } = curves[position] || { peak: 27, decay: 0.05 }
  return Math.exp(-decay * Math.abs(age - peak))
}
```

### Priority 3: Package Adjustment

```typescript
function applyPackageAdjustment(
  playerValues: number[],
  maxValueInTrade: number
): number {
  // Players beyond the first are worth less (roster spot cost)
  const sorted = [...playerValues].sort((a, b) => b - a)
  
  return sorted.reduce((total, value, index) => {
    // Each additional player worth 85% of face value
    const discount = Math.pow(0.85, index)
    return total + (value * discount)
  }, 0)
}
```

---

## 7. Comparative Analysis

### When to Use Each Calculator

| Use Case | Best Calculator | Why |
|----------|----------------|-----|
| Quick market check | KeepTradeCut | Real-time sentiment |
| Algorithmic analysis | DynastyProcess | Mathematical rigor, transparency |
| Historical accuracy | FantasyCalc | Massive trade database |
| League-specific | FantasyCalc | Best format adjustments |
| Consensus view | Average all three | Reduces individual biases |

### Value Discrepancy Opportunities

When calculators disagree significantly, opportunity exists:
- **KTC high, others low**: Hype train, potential sell high
- **KTC low, others high**: Under the radar, potential buy low
- **FantasyCalc differs**: Market hasn't caught up to trade data

---

## References

- DynastyProcess: https://dynastyprocess.com/values/
- KeepTradeCut: https://keeptradecut.com/
- FantasyCalc: https://fantasycalc.com/
- Dynasty Nerds: https://www.dynastynerds.com/
