# ALGORITHMS

## OVERVIEW

Value-Based Drafting (VBD) and future algorithms. Pure functions, composable, type-safe.

## FILES

### Pure Functions
| File | Purpose |
|------|---------|
| `vbd.ts` | VBD ranking engine |
| `lineup.ts` | Backtracking lineup optimizer (500ms timeout) |
| `trade.ts` | Trade value comparison (redraft + dynasty) |
| `waivers.ts` | Waiver recommendations + FAAB bids |
| `pick-value.ts` | Draft pick valuation using expected players + scarcity |
| `dynasty-vbd.ts` | Dynasty-adjusted VBD with age curves + multi-year discounting |
| `age-curves.ts` | Dynasty value adjustment curves (peak 25-28) |
| `roster-strength.ts` | VBD totals by position for trade partner matching |
| `trade-partners.ts` | Compatible trade partner identification by roster needs |
| `value-normalization.ts` | Z-score normalization across external value sources |
| `draft-picks.ts` | Discounted pick chart values |

### Helpers
| File | Purpose |
|------|---------|
| `baselines.ts` | Position baseline (replacement level) |
| `flex.ts` | FLEX/SUPERFLEX position handling |
| `idp.ts` | IDP scarcity multiplier |
| `scoring.ts` | Scoring format detection (PPR/half/standard) |

### Orchestrators
| File | Purpose |
|------|---------|
| `calculate-vbd-for-league.ts` | Fetches data + calls calculateVBD |
| `calculate-lineup-for-week.ts` | Fetches roster + calls optimizeLineup |
| `calculate-trade-for-league.ts` | Fetches league/externals + calls evaluateTrade |
| `calculate-waivers-for-league.ts` | Fetches free agents + calls recommendWaivers |
| `calculate-pick-value-for-draft.ts` | Fetches draft state + calls calculatePickValue |

### Infrastructure
| File | Purpose |
|------|---------|
| `cache.ts` | SHA256 cache keys + getOrComputeAlgorithm (1h TTL) |
| `types.ts` | All TypeScript interfaces (~923 lines) |
| `index.ts` | Barrel export |

## VBD ALGORITHM

```
VBD = Player Projected Points - Baseline Projected Points
```

**Baseline**: Last starter drafted at position
- Formula: `Baseline Rank = League Size × Starters`
- Example: 12-team, 2 RB starters → RB24 is baseline

**FLEX Handling**: Players get two VBD calculations, use higher:
1. Position VBD (vs position baseline)
2. FLEX VBD (vs FLEX baseline = min of eligible positions)

**SUPERFLEX**: Dramatically increases QB value via SUPERFLEX baseline

**IDP Multiplier**: Applied when 40%+ roster is IDP
- Formula: `1.0 + (IDP% - 0.40) × 2`

## USAGE

```typescript
import { calculateVBD, type VBDInput, type VBDOutput } from '@/lib/algorithms'

const output: VBDOutput = calculateVBD({
  players: [...],
  projections: { [playerId]: points },
  leagueSettings: { teams: 12, rosterPositions: [...] },
  scoringFormat: 'ppr',
  projectionSource: 'custom'
})
```

## API INTEGRATION

- Endpoint: `POST /api/algorithms/vbd`
- Request: `{ leagueId, limit?, offset?, positions? }`
- Response: `{ rankings, baselines, metadata, generatedAt }`
- Cache: League (1h), Players (24h), Projections (DB)

## ADDING NEW ALGORITHMS

1. Create `src/lib/algorithms/[name].ts`
2. Define types in `types.ts`
3. Export from `index.ts`
4. Create API route at `src/app/api/algorithms/[name]/route.ts`
5. Wire up UI components

## STATUS

| Algorithm | Status | File | Purpose |
|-----------|--------|------|---------|
| VBD | Complete | `vbd.ts` | Draft rankings |
| Lineup Optimizer | Complete | `lineup.ts` | Weekly lineup (backtracking, 500ms timeout) |
| Trade Evaluator | Complete | `trade.ts` | Trade value comparison (redraft + dynasty) |
| Waiver Priority | Complete | `waivers.ts` | Waiver recommendations + FAAB bids |
| Monte Carlo | Complete | `monte-carlo/` | Draft survival simulation (see AGENTS.md) |
| Pick Value | Complete | `pick-value.ts` | Draft pick valuation |
| Dynasty VBD | Complete | `dynasty-vbd.ts` | Age-adjusted dynasty rankings |
| Roster Strength | Complete | `roster-strength.ts` | Position group VBD totals |
| Trade Partners | Complete | `trade-partners.ts` | Compatible partner matching |
| Value Normalization | Complete | `value-normalization.ts` | Cross-source Z-score normalization |

## TESTING

```bash
# Run algorithm tests only
pnpm test src/tests/unit/algorithms

# Run with coverage
pnpm test:coverage

# Watch mode for specific file
pnpm test src/tests/unit/algorithms/vbd.test.ts
```

**Coverage requirements for VBD:**
- 97% branch coverage
- 100% function coverage
- 100% line coverage
- 100% statement coverage

**Mock factory usage:**
```typescript
import { createMockPlayer, createMockVBDInput } from '@/tests/mocks'

const input = createMockVBDInput(
  [createMockPlayer('4046', 'Patrick Mahomes', 'QB')],
  { '4046': 380.5 },
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
  12  // teams
)
```

## CONVENTIONS

- All functions are pure (no side effects)
- Types in `types.ts`, never inline
- Use barrel export from `index.ts`
- 100% test coverage required (97% branches, 100% functions/lines/statements)
- Tests use `createMock*()` factory functions

## IMPORT PATTERNS

```typescript
// CORRECT - use barrel export
import { calculateVBD, type VBDInput } from '@/lib/algorithms'

// WRONG - deep import bypasses barrel
import { calculateVBD } from '@/lib/algorithms/vbd'

// EXCEPTION - orchestrators with heavyweight deps are NOT in barrel
import { calculateTradeForLeague } from '@/lib/algorithms/calculate-trade-for-league'
import { calculatePickValueForDraft } from '@/lib/algorithms/calculate-pick-value-for-draft'
```
