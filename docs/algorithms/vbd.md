# Value-Based Drafting (VBD) Algorithm

## Overview

Value-Based Drafting (VBD) is a fantasy football draft strategy that ranks players by comparing their projected points to a "replacement level" baseline player at their position. This helps identify which players provide the most value above what you could get from a late-round pick or waiver wire addition.

## The Core Formula

```
VBD = Player Projected Points - Baseline Projected Points
```

**Example**: If Patrick Mahomes is projected for 350 points and the QB12 baseline is 280 points, his VBD is 70.

## Baseline Calculation

The baseline represents the "replacement level" player - the last starter you'd expect to be drafted at each position.

**Formula**:
```
Baseline Rank = League Size × Starters at Position
```

**Examples**:
- 12-team league, 1 QB starter → QB12 is the baseline
- 12-team league, 2 RB starters → RB24 is the baseline  
- 10-team league, 3 WR starters → WR30 is the baseline

The baseline player is found by:
1. Sorting all players at the position by projected points (highest to lowest)
2. Taking the player at the baseline rank

## Position Support

### Standard Positions
- **QB** (Quarterback)
- **RB** (Running Back)
- **WR** (Wide Receiver)
- **TE** (Tight End)
- **K** (Kicker)
- **DEF** (Team Defense)

### IDP Positions
- **DL** (Defensive Line) - includes DE, DT, EDR
- **LB** (Linebacker) - includes ILB, OLB
- **DB** (Defensive Back) - includes CB, S, SS, FS

### FLEX Positions
- **FLEX** - RB/WR/TE eligible
- **SUPERFLEX** - QB/RB/WR/TE eligible
- **REC_FLEX** - WR/TE eligible
- **WRRB_FLEX** - WR/RB eligible
- **IDP_FLEX** - DL/LB/DB eligible

## FLEX Handling

Players eligible for FLEX slots (RB, WR, TE) get VBD calculated two ways:

1. **Position-specific VBD**: Compared to their position baseline (e.g., RB vs RB24)
2. **FLEX-adjusted VBD**: Compared to the FLEX baseline (minimum of RB/WR/TE baselines)

The **higher** of the two values is used for ranking.

**Why this matters**: In a 12-team league with 2 RB, 3 WR, 1 TE, and 1 FLEX:
- RB baseline: RB24 (might be 180 points)
- WR baseline: WR36 (might be 150 points)
- TE baseline: TE12 (might be 120 points)
- FLEX baseline: min(180, 150, 120) = 120 (TE12)

A WR projected for 200 points gets:
- Position VBD: 200 - 150 = 50
- FLEX VBD: 200 - 120 = 80
- **Final VBD: 80** (higher value)

This correctly values WRs higher because they compete for FLEX spots against weaker TEs.

## SUPERFLEX Handling

SUPERFLEX leagues dramatically increase QB value because QBs can fill a FLEX spot.

**Example** (12-team SUPERFLEX):
- QB baseline: QB12 (340 points)
- SUPERFLEX baseline: min(QB12, RB24, WR36, TE12) = 120 (TE12)

A QB projected for 380 points gets:
- Position VBD: 380 - 340 = 40
- SUPERFLEX VBD: 380 - 120 = 260
- **Final VBD: 260** (massive boost!)

This is why QBs go much earlier in SUPERFLEX leagues.

## IDP Handling

### Separate Baselines

IDP positions (DL, LB, DB) each have their own baseline calculated independently. There is no universal "IDP baseline" because defensive positions score differently.

**Example** (12-team IDP league with 2 DL, 2 LB, 2 DB):
- DL baseline: DL24
- LB baseline: LB24
- DB baseline: DB24

### Scarcity Multiplier

In IDP-heavy leagues (40%+ of roster slots are IDP), elite IDP players become more valuable due to scarcity. A multiplier is applied:

```
Multiplier = 1.0 + (IDP Percentage - 0.40) × 2
```

**Examples**:
- 40% IDP (6 of 15 slots): 1.0x multiplier (threshold)
- 50% IDP (8 of 16 slots): 1.2x multiplier
- 60% IDP (9 of 15 slots): 1.4x multiplier

The multiplier is applied ONLY to IDP VBD values, not offensive players.

## League Type Examples

### Standard 12-Team PPR
**Roster**: 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 K, 1 DEF

**Baselines**:
- QB12, RB24, WR36, TE12, K12, DEF12
- FLEX baseline: min(RB24, WR36, TE12) = TE12

**Top VBD Players** (typical):
1. Elite RB (high volume + FLEX value)
2. Elite WR (high volume + FLEX value)
3. Elite TE (scarcity at position)
4. Top QB (consistent scoring)

### SUPERFLEX 12-Team
**Roster**: 1 QB, 2 RB, 3 WR, 1 TE, 1 SUPERFLEX, 1 K, 1 DEF

**Baselines**:
- QB12, RB24, WR36, TE12, K12, DEF12
- SUPERFLEX baseline: min(QB12, RB24, WR36, TE12) = TE12

**Top VBD Players** (typical):
1. Elite QB (SUPERFLEX value is huge)
2. Elite QB (yes, two QBs in top 5)
3. Elite RB
4. Elite WR
5. Elite QB (third QB often top 10)

### IDP-Heavy 12-Team
**Roster**: 1 QB, 2 RB, 2 WR, 1 TE, 2 DL, 2 LB, 2 DB, 1 IDP_FLEX

**Baselines**:
- QB12, RB24, WR24, TE12
- DL24, LB24, DB24
- IDP_FLEX baseline: min(DL24, LB24, DB24)

**IDP Scarcity**: 7 IDP slots / 12 total = 58% → 1.36x multiplier

**Top VBD Players** (typical):
1. Elite RB (still valuable)
2. Elite LB (high tackle volume + multiplier)
3. Elite WR
4. Elite DL (sacks + multiplier)
5. Elite DB (tackles + INTs + multiplier)

### Dynasty/Keeper Leagues

VBD works the same, but keepers are pre-marked as drafted. The algorithm excludes them from available rankings.

**Rookie Drafts**: When `player_type === 1` (rookies only), VBD only ranks players with `years_exp === 0`.

## Implementation Details

### File Structure
- `src/lib/algorithms/vbd.ts` - Main VBD orchestrator
- `src/lib/algorithms/baselines.ts` - Baseline calculation (pure function)
- `src/lib/algorithms/flex.ts` - FLEX baseline logic
- `src/lib/algorithms/idp.ts` - IDP scarcity multiplier
- `src/lib/algorithms/scoring.ts` - Scoring format detection
- `src/lib/algorithms/types.ts` - TypeScript interfaces

### API Endpoint
- `POST /api/algorithms/vbd` - Calculate VBD rankings for a league
- Returns top 300 players by default (configurable)
- Includes baselines and metadata

### Data Requirements
- Player projections in `players.projected_points` column
- League settings from Sleeper (roster positions, scoring)
- Projection source tracked for cache invalidation

## Integration with Other Algorithms

VBD is the foundation for multiple algorithms in Quantasy:

### Draft Assistant
- Uses VBD rankings for player recommendations
- Adjusts for already-drafted players
- Considers team needs and roster construction

### Trade Evaluator
- Calculates VBD for each player in trade
- Compares total value given vs received
- See `docs/algorithms/trade.md` for details

### Waiver Recommendations
- Computes VBD improvement for free agents
- Prioritizes pickups based on VBD gain
- Factors in roster need multipliers
- See `docs/algorithms/waivers.md` for details

### Lineup Optimizer
- Uses projected points (input to VBD)
- Optimizes weekly lineup for maximum points
- See `docs/algorithms/lineup.md` for details

## "Show Your Work" Transparency

All algorithms using VBD include detailed explanations:
- Baseline calculation for each position
- VBD formula breakdown per player
- Why specific players are ranked higher
- Caveats and limitations

This transparency helps users understand and trust the recommendations.

## Limitations & Future Enhancements

### Current Limitations
- Projections are pre-calculated (not re-scored for custom settings)
- Auction mode shows rankings only (no budget optimization)
- No injury/suspension adjustments

### Future Enhancements
- Re-score projections with custom scoring settings
- Auction budget optimization
- Injury risk adjustments
- Strength of schedule adjustments
- Playoff schedule optimization

## References

- **Original VBD Concept**: Joe Bryant (FootballGuys.com)
- **Implementation**: Quantasy Draft Assistant
- **Algorithm Tests**: `src/tests/unit/algorithms/vbd.test.ts`
- **E2E Tests**: `tests/e2e/draft-assistant.spec.ts`
