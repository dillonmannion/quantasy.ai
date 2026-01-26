# ALGORITHMS

## OVERVIEW

Value-Based Drafting (VBD) and future algorithms. Pure functions, composable, type-safe.

## FILES

| File | Purpose |
|------|---------|
| `vbd.ts` | Main VBD orchestrator |
| `baselines.ts` | Position baseline (replacement level) |
| `flex.ts` | FLEX/SUPERFLEX position handling |
| `idp.ts` | IDP scarcity multiplier |
| `scoring.ts` | Scoring format detection (PPR/half/standard) |
| `types.ts` | All TypeScript interfaces |
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

## ADDING NEW ALGORITHMS

1. Create `src/lib/algorithms/[name].ts`
2. Define types in `types.ts`
3. Export from `index.ts`
4. Create API route at `src/app/api/algorithms/[name]/route.ts`
5. Wire up UI components

## PLANNED

| Algorithm | Status | Purpose |
|-----------|--------|---------|
| VBD | Complete | Draft rankings |
| Lineup Optimizer | Planned | Weekly lineup |
| Trade Evaluator | Planned | Trade comparison |
| Waiver Priority | Planned | Waiver recommendations |

## CONVENTIONS

- All functions are pure (no side effects)
- Types in `types.ts`, never inline
- Use barrel export from `index.ts`
- 100% test coverage on VBD (97% branches, 100% functions/lines/statements)
