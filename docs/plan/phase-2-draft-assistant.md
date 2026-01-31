# Phase 2: Draft Assistant (Weeks 5-6)

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete implementation guide for Phase 2

---

## Objectives

- VBD (Value-Based Drafting) algorithm in TypeScript
- Draft assistant UI with player rankings
- "Show Your Work" transparency panel
- Balatro-style animations for picks
- Works for upcoming drafts (pre-season use case)

---

## Week 5: VBD Algorithm

### Day 1-2: VBD Implementation

- [ ] Research and document VBD formula:
  ```
  VBD = Player's Projected Points - Baseline Player's Projected Points
  
  Baseline = The last starter at that position
  Example (12-team, 1QB): QB12 is baseline for QBs
  ```
- [ ] Create algorithm module (`lib/algorithms/vbd.ts`):
  ```typescript
  interface VBDInput {
    players: Player[];
    leagueSettings: {
      teams: number;
      rosterPositions: string[]; // ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', ...]
      scoringSettings: ScoringSettings;
    };
  }
  
  interface VBDOutput {
    rankings: PlayerRanking[];
    explanation: {
      baselines: Record<Position, { player: Player; points: number }>;
      methodology: string;
    };
  }
  
  function calculateVBD(input: VBDInput): VBDOutput;
  ```
- [ ] Handle edge cases:
  - [ ] FLEX positions (RB/WR/TE eligible)
  - [ ] SUPERFLEX leagues
  - [ ] Different scoring formats (PPR, Half-PPR, Standard)

### Day 3-4: Projection Data

- [ ] Integrate projection sources:
  - [ ] Primary: FantasyPros public rankings (scrape or manual)
  - [ ] Fallback: nflverse historical averages
- [ ] Create projection update workflow:
  - [ ] Manual upload (CSV) for alpha
  - [ ] Automated fetch (future enhancement)
- [ ] Store projections in `players.projected_points`

### Day 5: Algorithm Testing

- [ ] Unit tests for VBD calculation
- [ ] Test with known rankings (validate against expert consensus)
- [ ] Performance test (should handle 500+ players instantly)
- [ ] Document algorithm in `docs/algorithms/vbd.md`

---

## Week 6: Draft Assistant UI

### Day 1-2: Rankings View

- [ ] Build draft assistant page (`/draft/assistant`)
- [ ] Player list with:
  - [ ] Rank, name, team, position
  - [ ] VBD score with color coding
  - [ ] Projected points
  - [ ] ADP comparison (if available)
- [ ] Filters:
  - [ ] By position
  - [ ] Hide drafted players
  - [ ] Search by name
- [ ] Sort options (VBD, projected points, ADP)

### Day 3: "Show Your Work" Panel

- [ ] Expandable explanation for each player:
  ```
  Patrick Mahomes - VBD: +45.2
  
  How we calculated this:
  |-- Projected Points: 385.5
  |-- QB Baseline (QB12): 340.3 points
  |-- VBD = 385.5 - 340.3 = 45.2
  +-- Scoring: 4pt passing TD, -2 INT, ...
  ```
- [ ] League settings display
- [ ] "Why is X ranked above Y?" comparison tool

### Day 4: Draft Simulation

- [ ] Mock draft mode:
  - [ ] Mark players as "drafted" (removes from available)
  - [ ] Track user's picks
  - [ ] Recalculate recommendations after each pick
- [ ] "My Team" sidebar showing drafted players
- [ ] Undo last pick functionality

> **Note on Monte Carlo Simulation:** Advanced Monte Carlo simulations for draft projections have been deferred to v1.1. The current implementation uses static VBD rankings which are sufficient for alpha testing. This decision was made to avoid complexity-related blockers (agent freezes) and prioritize core stability for the alpha launch.

### Day 5: Animations & Polish

- [ ] Player card hover effects
- [ ] `<Kaching>` when selecting a high-VBD player
- [ ] `<CardFlip>` reveal for recommendations
- [ ] Staggered list animation on filter change
- [ ] Mobile: swipe to mark as drafted
- [ ] Celebrate when draft is "complete"

---

## Testing Requirements

| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| VBD calculation | Unit | 100% branch coverage |
| Position baselines | Unit | All position combos |
| Rankings display | E2E | Filter, sort, search |
| Mock draft flow | E2E | Draft 15 rounds |

---

## Deliverables Checklist

- [ ] VBD algorithm with full test coverage
- [ ] `/draft/assistant` page functional
- [ ] "Show Your Work" panel implemented
- [ ] Mock draft mode working
- [ ] Algorithm documentation in `/docs`
- [ ] Animations feel satisfying

---

## "Show Your Work" Data Structure

```typescript
// Stored in algorithm_outputs table
interface VBDExplanation {
  algorithm: 'vbd_v1';
  timestamp: string;
  inputs: {
    playerCount: number;
    leagueSize: number;
    scoringFormat: string;
    rosterConfig: string[];
    projectionSource: string;
  };
  baselines: {
    QB: { playerId: string; name: string; projectedPoints: number };
    RB: { playerId: string; name: string; projectedPoints: number };
    WR: { playerId: string; name: string; projectedPoints: number };
    TE: { playerId: string; name: string; projectedPoints: number };
    // ...
  };
  methodology: string; // Markdown explanation
  caveats: string[]; // Known limitations
}
```

---

## VBD Algorithm Reference

### Formula

```
VBD = Player Projected Points - Baseline Points

Baseline = Points of the Nth-ranked player at position
N = (Teams * Starters at Position)

Example (12-team, 2 RB starters):
- RB Baseline = RB24's projected points
- If RB1 projects 300 pts, RB24 projects 180 pts
- RB1's VBD = 300 - 180 = 120
```

### FLEX Handling

For FLEX positions (typically best available RB/WR/TE):
1. Calculate baseline for RB/WR/TE separately
2. FLEX baseline = lowest of those baselines
3. Apply FLEX eligibility to VBD calculation

### Scoring Format Adjustments

| Format | Key Difference |
|--------|----------------|
| Standard | No reception bonus |
| Half-PPR | +0.5 per reception |
| Full PPR | +1.0 per reception |

PPR formats boost WR/RB pass-catchers relative to Standard.

---

## Related Documents

- [phase-1-data-layer.md](./phase-1-data-layer.md) - Player data prerequisite
- [phase-3-roster-trade.md](./phase-3-roster-trade.md) - Next phase
- [03-animation-system.md](./03-animation-system.md) - Animation components
