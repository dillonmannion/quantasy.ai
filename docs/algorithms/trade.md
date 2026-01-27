# Trade Evaluator

**Algorithm**: `trade_evaluator_v1`  
**Status**: Implemented in Phase 3

## Overview

The trade evaluator analyzes proposed trades using VBD (Value Based Drafting) to determine fairness. It calculates the value of players you're giving away versus players you're receiving, and optionally shows the impact on your weekly lineup.

## Fairness Score Formula

```
Fairness Score = ((Receiving Value - Giving Value) / Max Value) × 100

Where:
- Receiving Value = Σ(VBD of players you receive)
- Giving Value = Σ(VBD of players you give)
- Max Value = max(|Receiving Value|, |Giving Value|)
```

### VBD Calculation

For each player in the trade:

```
Player VBD = Projected Points - Position Baseline
```

**Example**:
- Giving: RB (200 pts, baseline 150) = VBD 50
- Receiving: WR (180 pts, baseline 140) = VBD 40
- Fairness Score = ((40 - 50) / 50) × 100 = **-20** (bad trade)

## Verdict Thresholds

| Fairness Score | Verdict | Meaning |
|----------------|---------|---------|
| ≥ 50 | Great | You win significantly |
| 10 to 49 | Fair | Slight advantage to you |
| -9 to 9 | Fair | Roughly even trade |
| -10 to -49 | Bad | Slight disadvantage |
| ≤ -50 | Veto-Worthy | You lose significantly |

### Interpretation

- **Positive score**: You're receiving more value than giving
- **Negative score**: You're giving more value than receiving
- **Zero score**: Perfectly balanced trade

**Example Verdicts**:
- Score +75: "Great" - You're getting a steal
- Score +15: "Fair" - Slight upgrade for you
- Score -5: "Fair" - Roughly even
- Score -30: "Bad" - You're overpaying
- Score -80: "Veto-Worthy" - Terrible trade

## Lineup Impact (Optional)

When roster, slots, and week are provided, the evaluator shows:

### Pre-Trade Lineup
- Optimal lineup with current roster
- Projected points total

### Post-Trade Lineup
- Optimal lineup after trade
- Projected points total

### Delta
```
Lineup Delta = Post-Trade Points - Pre-Trade Points
```

**Example**:
- Pre-trade: 145 points (starting RB2 with 18 pts)
- Post-trade: 152 points (starting new WR with 25 pts)
- **Delta: +7 points** (trade improves weekly lineup)

### Why Lineup Impact Matters

VBD measures **draft value**, but lineup impact measures **weekly value**:

- **VBD**: Compares to replacement level (baseline)
- **Lineup**: Compares to your actual starters

**Scenario**: Trading away your RB3 (bench) for a WR2 (starter)
- VBD: May be negative (RB3 has higher VBD than WR2)
- Lineup: Positive (WR2 starts, RB3 doesn't)

Lineup impact reveals trades that improve your starting lineup even if VBD is negative.

## Multi-Player Trades

The algorithm handles any number of players on each side:

**2-for-1 Trade**:
- Giving: RB1 (VBD 80), WR2 (VBD 40) = Total 120
- Receiving: RB1 (VBD 100) = Total 100
- Fairness: ((100 - 120) / 120) × 100 = **-16.7** (bad)

**3-for-2 Trade**:
- Giving: RB2 (50), WR3 (30), TE1 (25) = Total 105
- Receiving: RB1 (80), WR2 (40) = Total 120
- Fairness: ((120 - 105) / 120) × 100 = **+12.5** (fair, slight advantage)

## Show Your Work

Each trade evaluation includes:

### Player Breakdown
For each player:
- Name and position
- VBD value
- Whether giving or receiving

### Lineup Impact (if provided)
- Pre-trade starters and bench
- Post-trade starters and bench
- Projected points before and after
- Delta (change in weekly points)

### Methodology
Explanation of VBD formula and fairness calculation

### Caveats
- Missing baselines for positions
- Missing roster/week data (no lineup impact)

## Edge Cases

### Missing Baseline

If a position has no baseline (e.g., K in some leagues):
- VBD = Projected Points - 0
- Caveat added: "Missing baseline for position K"

### Zero Value Trade

If both sides have zero VBD:
- Fairness Score = 0
- Verdict = "Fair"

### Negative VBD Players

Players below replacement level have negative VBD:
- Still included in calculation
- May make trade appear better/worse than reality

## Dynasty League Considerations

In dynasty leagues, consider:
- **Age**: Younger players have future value not captured by VBD
- **Contract**: Keeper cost affects true value
- **Picks**: Draft picks not included in v1 algorithm

VBD measures **current season value only**.

## API Usage

```typescript
POST /api/algorithms/trade
{
  "giving": [
    { playerId, fullName, position, projectedPoints, ... }
  ],
  "receiving": [
    { playerId, fullName, position, projectedPoints, ... }
  ],
  "leagueSettings": {
    "baselines": {
      "QB": { projectedPoints: 280, ... },
      "RB": { projectedPoints: 150, ... },
      ...
    },
    "rosterSlots": [...] // optional
  },
  "currentRoster": [...], // optional
  "week": 5 // optional
}
```

## Integration

Used by:
- **Trade Page** (`/trade`) - Interactive trade calculator
- **Trade Analyzer** - Evaluate league trades
- **Trade Finder** - Future feature to suggest trades

## Limitations (v1)

- No future value (age, potential)
- No draft pick valuation
- No injury risk adjustment
- No schedule strength
- No positional scarcity beyond VBD
- No league context (contending vs rebuilding)

## Future Enhancements

- **Draft pick valuation** - Include picks in trades
- **Dynasty adjustments** - Age and contract factors
- **Injury risk** - Discount injury-prone players
- **Schedule analysis** - Playoff schedule strength
- **League context** - Adjust for contending/rebuilding
- **Historical trades** - Learn from league trade patterns
- **Trade suggestions** - AI-powered trade finder

## Implementation

See `src/lib/algorithms/trade.ts` for full implementation.

## References

- **VBD Algorithm**: `src/lib/algorithms/vbd.ts`
- **Lineup Optimizer**: `src/lib/algorithms/lineup.ts`
- **Tests**: `src/tests/unit/algorithms/trade.test.ts`
- **E2E Tests**: `tests/e2e/trade-calculator.spec.ts`
