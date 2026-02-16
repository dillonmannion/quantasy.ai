# Phase 4: Waiver Wire & Polish (Weeks 9-10)

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete implementation guide for Phase 4

---

## Objectives

- Waiver recommendation system
- FAAB bid suggestions (for FAAB leagues)
- Overall UI/UX polish pass
- Performance optimization
- Accessibility audit

---

## Week 9: Waiver System

### Day 1-2: Waiver Algorithm

- [ ] Implement waiver recommender (`lib/algorithms/waivers.ts`):
  ```typescript
  interface WaiverInput {
    availablePlayers: Player[];
    currentRoster: Player[];
    leagueSettings: LeagueSettings;
    weekNumber: number;
  }
  
  interface WaiverOutput {
    recommendations: WaiverRecommendation[];
    droppable: Player[]; // Suggests who to drop
    explanation: WaiverExplanation;
  }
  
  interface WaiverRecommendation {
    player: Player;
    priority: number; // 1 = highest priority
    suggestedFaabBid: number; // For FAAB leagues
    reasons: string[];
  }
  ```
- [ ] Priority factors:
  - [ ] VBD vs. worst roster player at position
  - [ ] Roster need (injuries, bye weeks)
  - [ ] Trending up (recent performance)
  - [ ] Opportunity increase (starter injured, trade)

### Day 3-4: Waiver UI

- [ ] Build waiver page (`/waivers`)
- [ ] Recommendation list:
  ```
  TOP WAIVER TARGETS
  
  1. Tank Dell (WR - HOU)
     +-- +18.2 VBD over your WR4
     +-- Suggested FAAB: $12-15 (8-10%)
     +-- Drop: [Player X]
  
  2. Jaylen Warren (RB - PIT)
     +-- Najee Harris injury = opportunity
     +-- Suggested FAAB: $8-10 (5-7%)
     +-- Drop: [Player Y]
  ```
- [ ] "Add to Claims" button (generates Sleeper instructions)
- [ ] Filter: "Show only if I have someone to drop"

### Day 5: FAAB Bidding Logic

- [ ] Implement FAAB bid calculator:
  - [ ] Base: % of remaining budget based on value
  - [ ] Adjust: League aggression (from historical data if available)
  - [ ] Adjust: Roster need multiplier
- [ ] Show bid range, not single number (lets user decide risk)
- [ ] "Show Your Work" for FAAB:
  ```
  FAAB Suggestion: $12-15
  
  Calculation:
  |-- Base value: $10 (VBD-based)
  |-- Roster need multiplier: 1.3x (WR thin)
  |-- Remaining budget: $67 of $100
  +-- Range: $12 (safe) to $15 (aggressive)
  ```

---

## Week 10: Polish & Performance

### Day 1-2: UI Polish

- [ ] Consistent loading states everywhere
- [ ] Error states with helpful messages
- [ ] Empty states with calls-to-action
- [ ] Review all animations:
  - [ ] Timing feels right
  - [ ] No jank on mobile
  - [ ] Reduced motion respected
- [ ] Dark mode consistency check
- [ ] Typography review (readable on all sizes)

### Day 3: Performance Optimization

- [ ] Lighthouse audit (target: 90+ on all metrics)
- [ ] Bundle analysis (remove unused code)
- [ ] Image optimization (if any images added)
- [ ] Server component vs. client component audit:
  - [ ] Move data fetching to server where possible
  - [ ] Minimize client-side JS
- [ ] Caching review:
  - [ ] Static pages cached properly
  - [ ] Dynamic data has appropriate revalidation
- [ ] Database query optimization (add indexes if needed)

### Day 4: Accessibility Audit

- [ ] Screen reader testing (VoiceOver, NVDA)
- [ ] Keyboard navigation works everywhere
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Form labels and error messages accessible
- [ ] Animations respect `prefers-reduced-motion`

### Day 5: Documentation & Prep for Alpha

- [ ] Update README with:
  - [ ] Local development setup
  - [ ] Environment variables needed
  - [ ] How to deploy
- [ ] Algorithm documentation complete:
  - [ ] `/docs/algorithms/vbd.md`
  - [ ] `/docs/algorithms/lineup.md`
  - [ ] `/docs/algorithms/trade.md`
  - [ ] `/docs/algorithms/waivers.md`
- [ ] Create "How to Use" guide for testers
- [ ] Set up error monitoring (Sentry or similar, free tier)

---

## Testing Requirements

| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Waiver algorithm | Unit | Priority ordering, FAAB |
| Waiver UI | E2E | Add/remove claims |
| Performance | Lighthouse | 90+ all categories |
| Accessibility | aXe audit | 0 critical violations |

---

## Deliverables Checklist

- [ ] Waiver recommendation system complete
- [ ] FAAB bid suggestions working
- [ ] All pages polished and consistent
- [ ] Lighthouse scores 90+
- [ ] Accessibility audit passed
- [ ] Documentation complete
- [ ] Error monitoring configured

---

## FAAB Algorithm Reference

### Base Calculation

```typescript
function calculateFaabBid(
  player: Player,
  roster: Player[],
  remainingBudget: number,
  totalBudget: number
): { min: number; max: number } {
  // 1. Calculate value improvement
  const worstAtPosition = getWorstAtPosition(roster, player.position);
  const vbdImprovement = player.vbd - (worstAtPosition?.vbd ?? 0);
  
  // 2. Base bid as % of budget
  const basePercent = Math.min(vbdImprovement / 100, 0.3); // Cap at 30%
  const baseBid = Math.round(totalBudget * basePercent);
  
  // 3. Adjust for roster need
  const needMultiplier = calculateNeedMultiplier(roster, player.position);
  const adjustedBid = Math.round(baseBid * needMultiplier);
  
  // 4. Cap at remaining budget
  const cappedBid = Math.min(adjustedBid, remainingBudget);
  
  // 5. Return range (safe to aggressive)
  return {
    min: Math.max(1, Math.round(cappedBid * 0.8)),
    max: Math.min(remainingBudget, Math.round(cappedBid * 1.2)),
  };
}
```

### Need Multiplier

| Situation | Multiplier |
|-----------|------------|
| Starter-quality upgrade | 1.3x |
| Depth at position | 0.8x |
| Injury replacement | 1.5x |
| Bye week fill | 1.2x |

---

## Accessibility Checklist

### Keyboard Navigation
- [ ] All interactive elements focusable
- [ ] Tab order logical
- [ ] No keyboard traps
- [ ] Skip links present

### Screen Readers
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Errors announced
- [ ] Dynamic content updates announced

### Visual
- [ ] Color contrast 4.5:1 minimum
- [ ] Text resizable to 200%
- [ ] Focus indicators visible
- [ ] No color-only information

### Motion
- [ ] `prefers-reduced-motion` respected
- [ ] No auto-playing animations
- [ ] Pause controls if needed

---

## Related Documents

- [phase-3-roster-trade.md](./phase-3-roster-trade.md) - Previous phase
- [phase-5-alpha-testing.md](./phase-5-alpha-testing.md) - Next phase
- [03-animation-system.md](./03-animation-system.md) - Animation components
