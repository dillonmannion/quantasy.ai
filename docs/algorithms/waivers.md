# Waiver Wire Recommendations

**Algorithm**: `waiver_v1`  
**Status**: Implemented in Phase 4

## Overview

The waiver recommendation system analyzes available free agents and provides priority-ranked recommendations based on VBD improvement and roster need.

## Priority Calculation

```
Priority Score = VBD Improvement × Roster Need Multiplier
```

### VBD Improvement

```
VBD Improvement = Candidate VBD - Worst Starter VBD
```

Where:
- **Candidate VBD** = Candidate Projected Points - Position Baseline
- **Worst Starter VBD** = Worst starter's VBD at that position on your roster
- If roster has fewer players than starters needed, Worst Starter VBD = 0

### Roster Need Multipliers

| Scenario | Multiplier | When Applied |
|----------|------------|--------------|
| Injury Replacement | 1.5x | Starter at position is Out/IR/Doubtful |
| Starter Upgrade | 1.3x | Candidate would start over worst starter |
| Filling Gap | 1.0x | Roster has fewer than required starters |
| Depth Add | 0.8x | Starter slots filled, candidate is depth |

## FAAB Bid Calculation

For leagues using FAAB (Free Agent Acquisition Budget):

```
Base Bid = min(VBD Improvement / 100, 0.30) × Total Budget
Adjusted Bid = Base Bid × Need Multiplier
Min Bid = Adjusted Bid × 0.8
Max Bid = min(Remaining Budget, Adjusted Bid × 1.2)
```

**Example**: 
- VBD Improvement = 30
- Need Multiplier = 1.3x (starter upgrade)
- Total Budget = $100
- Base Bid = min(30/100, 0.30) × 100 = $30
- Adjusted Bid = $30 × 1.3 = $39
- Min Bid = $39 × 0.8 = $31
- Max Bid = min($100, $39 × 1.2) = $47
- **Suggested Range**: $31-$47

## Droppable Players

Players are droppable if they are NOT in the top N at their position, where N = required starters.

**Example**: 12-team league, 2 RB starters
- Roster has 4 RBs
- Top 2 RBs (by projected points) are protected
- Bottom 2 RBs are droppable

## Show Your Work

Each recommendation includes:
- VBD calculation breakdown
- Improvement over worst starter
- Need multiplier explanation
- Priority score calculation
- FAAB bid range (if applicable)

## Limitations (v1)

- Bye week conflicts not factored
- Matchup strength not considered
- No sentiment/trending analysis
- No league aggression multiplier (requires historical data)

## API Usage

```typescript
POST /api/algorithms/waivers
{
  "leagueId": "string",
  "rosterId": number,
  "week": number,
  "faabBudget": {
    "total": number,
    "remaining": number
  } // optional
}
```

## Implementation

See `src/lib/algorithms/waivers.ts` for full implementation.
