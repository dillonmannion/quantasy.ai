# Lineup Optimizer

**Algorithm**: `lineup_optimizer_v1`  
**Status**: Implemented in Phase 3

## Overview

The lineup optimizer analyzes your roster and automatically selects the best starting lineup to maximize projected points for a given week. It handles FLEX positions, bye weeks, injuries, and complex roster configurations.

## Algorithm Approach

The optimizer uses a **backtracking search** with a **greedy fallback** to find the optimal lineup:

1. **Exclude unavailable players** (bye week, Out, IR)
2. **Greedy initialization** - Quick first pass to get a baseline
3. **Backtracking search** - Exhaustively try combinations to maximize points
4. **Timeout protection** - Falls back to greedy if search exceeds 500ms

## Optimization Formula

```
Maximize: Σ(Projected Points of Starters)

Subject to:
- Each starter slot filled by eligible player
- Each player used at most once
- Unavailable players excluded
```

## Player Availability

Players are excluded from starting lineup if:

| Status | Excluded | Reason |
|--------|----------|--------|
| Bye Week | Yes | `byeWeek === week` |
| Out | Yes | `status === 'OUT'` or `injuryStatus === 'OUT'` |
| IR | Yes | `status === 'IR'` or `injuryStatus === 'IR'` |
| Doubtful | No | May play, included in optimization |
| Questionable | No | May play, included in optimization |

## FLEX Position Handling

FLEX slots accept multiple positions. The optimizer expands FLEX eligibility:

| FLEX Type | Eligible Positions |
|-----------|-------------------|
| FLEX | RB, WR, TE |
| SUPERFLEX | QB, RB, WR, TE |
| REC_FLEX | WR, TE |
| WRRB_FLEX | WR, RB |
| IDP_FLEX | DL, LB, DB |

**Example**: 
- Roster: 3 RBs (180, 150, 120 pts), 3 WRs (170, 140, 110 pts)
- Slots: 2 RB, 2 WR, 1 FLEX
- Optimal: RB1 (180), RB2 (150), WR1 (170), WR2 (140), FLEX: RB3 (120)
- Total: 760 points

The optimizer tries all valid combinations to find the highest total.

## Backtracking Search

The algorithm uses **constraint satisfaction** with backtracking:

1. **Sort slots** by specificity (QB before FLEX)
2. **For each slot**, try all eligible players
3. **Recursively** fill remaining slots
4. **Track best** combination found
5. **Backtrack** when no improvement possible

**Timeout**: If search exceeds 500ms, use greedy fallback.

### Greedy Fallback

When backtracking times out:

1. For each slot (in order)
2. Select highest-projected eligible player
3. Mark player as used
4. Continue to next slot

Greedy is fast (O(n log n)) but may miss optimal combinations.

## Slot Ordering Strategy

Slots are processed in order of **specificity** (fewest eligible positions first):

1. **QB** (1 position) - most constrained
2. **RB, WR, TE, K, DEF** (1 position each)
3. **REC_FLEX** (2 positions: WR, TE)
4. **WRRB_FLEX** (2 positions: WR, RB)
5. **FLEX** (3 positions: RB, WR, TE)
6. **SUPERFLEX** (4 positions: QB, RB, WR, TE)
7. **IDP_FLEX** (3 positions: DL, LB, DB)

This ordering reduces search space by filling constrained slots first.

## Show Your Work

Each starter includes:
- Slot assignment (e.g., "RB1", "FLEX")
- Allowed positions for that slot
- Player selected
- Projected points
- Selection reason (backtracking or greedy)

Excluded players show:
- Player name
- Exclusion reason (bye week, injury status)

## Edge Cases

### Missing Bye Week Data

If `byeWeek` is null for some players:
- Player is included in optimization (assumed available)
- Caveat added: "Bye week data not available for all players"

### Timeout Fallback

If backtracking exceeds 500ms:
- Greedy solution used
- Caveat added: "Optimization exceeded 500ms; using greedy fallback"
- Typically happens with 10+ starter slots and 30+ roster players

### Empty Slots

If no eligible players available for a slot:
- Slot remains empty (null)
- Projected points = 0 for that slot

### Tie-Breaking

When multiple players have identical projected points:
- Alphabetical by player ID (stable ordering)

## Performance

| Roster Size | Starter Slots | Typical Time |
|-------------|---------------|--------------|
| 15 players | 9 starters | <50ms |
| 20 players | 10 starters | 100-200ms |
| 25 players | 11 starters | 300-500ms |
| 30+ players | 12+ starters | 500ms (timeout) |

## API Usage

```typescript
import { optimizeLineup } from '@/lib/algorithms'

const result = optimizeLineup({
  roster: AlgorithmPlayer[],
  slots: RosterSlot[],
  week: number
})

// Returns:
{
  starters: AlgorithmPlayer[],
  bench: AlgorithmPlayer[],
  projectedPoints: number,
  explanation: {
    algorithm: 'lineup_optimizer_v1',
    timestamp: string,
    inputsSummary: {...},
    excludedPlayers: [...],
    decisions: [...],
    caveats: [...]
  }
}
```

## Integration

Used by:
- **Roster Page** (`/roster`) - Weekly lineup recommendations
- **Trade Evaluator** - Pre/post-trade lineup impact
- **Waiver Recommendations** - Future integration planned

## Limitations (v1)

- No strength of schedule adjustments
- No weather/game environment factors
- No opponent defense rankings
- No correlation between players (stacking)
- No multi-week optimization

## Future Enhancements

- **Playoff optimizer** - Optimize for weeks 15-17
- **Stacking logic** - QB + WR from same team
- **Opponent defense** - Adjust projections based on matchup
- **Weather adjustments** - Reduce projections for bad weather games
- **Multi-week view** - Show optimal lineup for next 3 weeks

## Implementation

See `src/lib/algorithms/lineup.ts` for full implementation.

## References

- **Algorithm**: Constraint Satisfaction Problem (CSP) with backtracking
- **Complexity**: O(n!) worst case, O(n log n) greedy fallback
- **Tests**: `src/tests/unit/algorithms/lineup.test.ts`
