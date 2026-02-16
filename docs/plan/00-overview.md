# Quantasy Stage 1: MVP Overview

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Quick reference for project vision and success criteria

---

## Stage 1 Vision

**Goal:** A proof-of-concept SSR website for testing draft, roster, waiver, and trade 
algorithms with friends and family who all use Sleeper.

---

## Success Criteria

- [ ] 5-10 alpha testers can connect their Sleeper leagues
- [ ] All 4 core tools functional (Draft, Roster, Trade, Waivers)
- [ ] Mobile experience is primary, desktop is enhanced
- [ ] "Show Your Work" transparency for all algorithm outputs
- [ ] Balatro-inspired animations make data feel rewarding
- [ ] Zero critical bugs during 2-week testing period

---

## Non-Goals for Stage 1

- ESPN/Yahoo league support (deferred to Stage 2)
- Python-based ML algorithms (deferred to Stage 2)
- Live real-time draft rooms (deferred to Stage 2)
- Monetization features (deferred to Stage 3)

---

## Timeline Overview

| Phase | Weeks | Focus |
|-------|-------|-------|
| Phase 0 | 1-2 | Foundation & Design System |
| Phase 1 | 3-4 | Data Layer & League Connection |
| Phase 2 | 5-6 | Draft Assistant |
| Phase 3 | 7-8 | Roster Optimizer & Trade Calculator |
| Phase 4 | 9-10 | Waiver Wire & Polish |
| Phase 5 | 11-12 | Alpha Testing & Iteration |

**Total: 12 weeks**

---

## Tech Stack Summary

| Category | Choice |
|----------|--------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix primitives) |
| Animations | Framer Motion |
| Database | Supabase (Postgres) |
| Hosting | Fly.io |
| Data Source | Sleeper API |
| Language | TypeScript (strict mode) |
| Testing | Vitest + Playwright |

---

## What Stage 1 Delivers

### For Users (Alpha Testers)
1. **Connect Sleeper league** - See your roster, standings, matchups
2. **Draft Assistant** - VBD-based rankings with full transparency
3. **Roster Optimizer** - Set optimal lineup each week
4. **Trade Calculator** - Evaluate trades before proposing
5. **Waiver Recommendations** - Know who to pick up and what to bid

### For the Product
1. **Validated tech stack** - Next.js + Supabase + Framer Motion proven
2. **Animation system** - Reusable primitives for future features
3. **Algorithm framework** - "Show Your Work" pattern established
4. **Feedback baseline** - Real user input guides Stage 2

### For the Developer
1. **12-week realistic timeline** - Avoids burnout
2. **Clear phase boundaries** - Know when features are "done"
3. **Testing strategy** - Confidence in deployments
4. **Documentation** - Reduced context-switching

---

## Related Documents

- [01-tech-stack.md](./01-tech-stack.md) - Detailed technology decisions
- [02-database-schema.md](./02-database-schema.md) - Supabase schema
- [03-animation-system.md](./03-animation-system.md) - Animation primitives
- [04-file-structure.md](./04-file-structure.md) - Project layout
- [05-deferred-risks.md](./05-deferred-risks.md) - Future stages & risk mitigations
- [phase-0-foundation.md](./phase-0-foundation.md) - Phase 0 implementation
- [phase-1-data-layer.md](./phase-1-data-layer.md) - Phase 1 implementation
- [phase-2-draft-assistant.md](./phase-2-draft-assistant.md) - Phase 2 implementation
- [phase-3-roster-trade.md](./phase-3-roster-trade.md) - Phase 3 implementation
- [phase-4-waivers-polish.md](./phase-4-waivers-polish.md) - Phase 4 implementation
- [phase-5-alpha-testing.md](./phase-5-alpha-testing.md) - Phase 5 implementation
