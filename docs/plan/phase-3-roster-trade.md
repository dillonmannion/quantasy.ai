# Phase 3: Roster Optimizer & Trade Calculator (Weeks 7-8)

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete implementation guide for Phase 3

---

## Objectives

- Lineup optimizer (greedy algorithm)
- Trade value calculator with fairness scoring
- Both tools with "Show Your Work" transparency
- Drag-and-drop trade builder UI

---

## Week 7: Roster/Lineup Optimizer

### Day 1-2: Lineup Algorithm

- [ ] Implement greedy lineup optimizer (`lib/algorithms/lineup.ts`):
  ```typescript
  interface LineupInput {
    roster: Player[];
    rosterPositions: string[]; // ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
    week: number;
  }
  
  interface LineupOutput {
    starters: { position: string; player: Player }[];
    bench: Player[];
    projectedPoints: number;
    explanation: LineupExplanation;
  }
  ```
- [ ] Algorithm logic:
  1. Sort players by projected points (descending)
  2. Fill required positions first (QB, then skill positions)
  3. Fill FLEX with best remaining RB/WR/TE
  4. Handle bye weeks (exclude players on bye)
  5. Handle injuries (flag but allow override)

### Day 3-4: Roster Optimizer UI

- [ ] Build roster page (`/roster`)
- [ ] Display current lineup vs. optimized lineup
- [ ] Side-by-side comparison:
  ```
  Current Lineup          Optimized Lineup
  QB: Mahomes (22.5)      QB: Mahomes (22.5)
  RB: Henry (18.2)        RB: Henry (18.2)
  RB: Swift (12.1)    ->  RB: Gibbs (15.8) +3.7
  ...
  Total: 142.5            Total: 148.9 (+6.4)
  ```
- [ ] "Apply Optimization" button (shows instructions for Sleeper)
- [ ] Bye week warnings
- [ ] Injury indicators

### Day 5: Roster "Show Your Work"

- [ ] Explanation panel:
  ```
  Why we suggest starting Gibbs over Swift:
  
  |-- Gibbs projected: 15.8 pts
  |   +-- vs. DAL (28th vs RB)
  |-- Swift projected: 12.1 pts
  |   +-- vs. SF (4th vs RB)
  +-- Difference: +3.7 points
  
  Factors considered:
  * Opponent defense ranking
  * Recent performance (last 3 weeks)
  * Snap count trends
  * Weather (if outdoor game)
  ```

---

## Week 8: Trade Calculator

### Day 1-2: Trade Value Algorithm

- [ ] Implement trade evaluator (`lib/algorithms/trade.ts`):
  ```typescript
  interface TradeInput {
    giving: Player[];
    receiving: Player[];
    leagueSettings: LeagueSettings;
    currentRoster: Player[];
  }
  
  interface TradeOutput {
    fairnessScore: number; // -100 to +100 (0 = perfectly fair)
    givingValue: number;
    receivingValue: number;
    verdict: 'great' | 'fair' | 'bad' | 'veto-worthy';
    explanation: TradeExplanation;
  }
  ```
- [ ] Value factors:
  - [ ] VBD of players involved
  - [ ] Positional need (does user need a WR?)
  - [ ] Remaining season value (bye weeks, schedule)
  - [ ] Injury risk adjustment

### Day 3-4: Trade Calculator UI

- [ ] Build trade page (`/trade`)
- [ ] Drag-and-drop interface:
  ```
  +------------------+     +------------------+
  |   YOU GIVE       |     |   YOU RECEIVE    |
  |  +-----------+   |     |  +-----------+   |
  |  | Player A  |   |     |  | Player X  |   |
  |  +-----------+   |     |  +-----------+   |
  |  +-----------+   |     |                  |
  |  | Player B  |   |     |  [Drop here]     |
  |  +-----------+   |     |                  |
  +------------------+     +------------------+
           v Trade Value: +12.5 (GREAT!) v
  ```
- [ ] Player picker modal (search + filter)
- [ ] Real-time fairness calculation
- [ ] Mobile: tap to add instead of drag

### Day 5: Trade Animations & Polish

- [ ] Fairness meter animation (fills up/down as players added)
- [ ] `<Kaching>` on "great" trades
- [ ] Sad trombone equivalent for bad trades (subtle, not annoying)
- [ ] Trade success celebration (if trade is proposed via Sleeper link)
- [ ] "Show Your Work" expandable:
  ```
  Trade Analysis
  
  You Give:
  |-- Player A: 45.2 VBD, 12 weeks remaining
  +-- Player B: 22.1 VBD, 11 weeks remaining
  Total Given: 67.3 value points
  
  You Receive:
  +-- Player X: 78.8 VBD, 13 weeks remaining
  Total Received: 78.8 value points
  
  Net Value: +11.5 (17% gain)
  Verdict: GREAT TRADE
  
  Additional Context:
  * You're thin at WR, and Player X is WR1
  * Player A on bye Week 9 (your playoff push)
  ```

---

## Testing Requirements

| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Lineup optimizer | Unit | Bye weeks, injuries, FLEX |
| Trade calculator | Unit | 2-for-1, 3-for-2, edge cases |
| Drag-and-drop | E2E | Desktop and mobile |
| Fairness scoring | Unit | Known trade scenarios |

---

## Deliverables Checklist

- [ ] Lineup optimizer algorithm complete
- [ ] `/roster` page with side-by-side comparison
- [ ] Trade value algorithm complete
- [ ] `/trade` page with drag-and-drop
- [ ] Both tools have "Show Your Work" panels
- [ ] Animations celebrate good decisions
- [ ] Documentation for both algorithms

---

## Lineup Algorithm Reference

### Greedy Approach

```typescript
function optimizeLineup(roster: Player[], positions: string[]): Lineup {
  const available = [...roster].filter(p => !p.onBye && p.status !== 'OUT');
  available.sort((a, b) => b.projectedPoints - a.projectedPoints);
  
  const starters: Map<string, Player> = new Map();
  const used: Set<string> = new Set();
  
  // 1. Fill required positions (non-FLEX)
  for (const pos of positions.filter(p => p !== 'FLEX')) {
    const eligible = available.find(p => 
      p.position === pos && !used.has(p.id)
    );
    if (eligible) {
      starters.set(pos, eligible);
      used.add(eligible.id);
    }
  }
  
  // 2. Fill FLEX with best remaining RB/WR/TE
  const flexEligible = available.find(p => 
    ['RB', 'WR', 'TE'].includes(p.position) && !used.has(p.id)
  );
  if (flexEligible) {
    starters.set('FLEX', flexEligible);
  }
  
  return { starters, bench: roster.filter(p => !used.has(p.id)) };
}
```

---

## Trade Value Algorithm Reference

### Fairness Score Formula

```
Fairness = (Receiving Value - Giving Value) / Max(Receiving, Giving) * 100

Score Range:
- +50 to +100: Great trade (you win big)
- +10 to +50: Good trade (slight advantage)
- -10 to +10: Fair trade (balanced)
- -50 to -10: Bad trade (slight disadvantage)
- -100 to -50: Veto-worthy (you lose big)
```

### Value Factors

| Factor | Weight | Notes |
|--------|--------|-------|
| VBD | 60% | Core value metric |
| Positional need | 20% | Higher if filling a weakness |
| Remaining weeks | 10% | More value if more weeks left |
| Injury risk | 10% | Reduce value for injury-prone |

---

## Related Documents

- [phase-2-draft-assistant.md](./phase-2-draft-assistant.md) - VBD foundation
- [phase-4-waivers-polish.md](./phase-4-waivers-polish.md) - Next phase
- [03-animation-system.md](./03-animation-system.md) - Animation components
