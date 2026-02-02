# MONTE CARLO DRAFT SIMULATION

## OVERVIEW

Probabilistic draft simulation to calculate player survival rates. Runs 100-1000 iterations with cancellation support.

## FILES

| File | Purpose |
|------|---------|
| `simulator.ts` | Core simulation engine with `runSimulation()` |
| `market-model.ts` | Simulates other teams' draft behavior |
| `utility.ts` | Generates recommendations from survival rates |
| `types.ts` | 226 lines of Monte Carlo-specific types |
| `index.ts` | Barrel export |

## ALGORITHM

```
For each iteration (100-1000x):
  1. Simulate draft picks using market model
  2. Track which target players get drafted before user's pick
  3. Record survival (available) or death (drafted)

Output:
  survivalRates: { [playerId]: probability 0-1 }
  recommendations: sorted by risk-adjusted value
```

## KEY CONCEPTS

| Concept | Description |
|---------|-------------|
| **Survival Rate** | P(player available at user's pick) |
| **Market Model** | Simulates other drafters using ADP + noise |
| **Guardrails** | Min/max picks per position per team |
| **Preferences** | User's likes, dislikes, DND (Do Not Draft) |

## USAGE

```typescript
import { runSimulation, type MonteCarloInput } from '@/lib/algorithms/monte-carlo'

const result = await runSimulation({
  draftState: { ... },
  userPick: 24,
  targetPlayers: ['player-1', 'player-2'],
  adpMap: { ... },
  config: { iterations: 500 },
  signal: abortController.signal  // Cancellation support
})

// result.survivalRates['player-1'] = 0.72 (72% chance available)
```

## CONFIGURATION

```typescript
interface MonteCarloConfig {
  iterations: number          // 100-1000, default 500
  adpNoise: number           // Std dev for ADP randomization
  positionGuardrails: {      // Min/max per team
    QB: { min: 1, max: 2 },
    RB: { min: 2, max: 5 },
    // ...
  }
}
```

## PREFERENCES

```typescript
type PlayerPreference = 'like' | 'dislike' | 'dnd'  // dnd = Do Not Draft

// Likes: Boost in recommendations
// Dislikes: Penalty in recommendations  
// DND: Excluded from all calculations
```

## CANCELLATION

Long simulations support `AbortSignal`:
```typescript
const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)  // 5s timeout

const result = await runSimulation({ ..., signal: controller.signal })
```

## CONVENTIONS

- Pure functions (deterministic with seed, stochastic without)
- Types in `types.ts`, never inline
- Export from `index.ts` only
- Parent module (`@/lib/algorithms`) re-exports selectively
- Use `createMock*()` factories in tests (see `src/tests/unit/algorithms/monte-carlo/factories.ts`)

## ANTI-PATTERNS

- **DO NOT** run >1000 iterations (performance)
- **DO NOT** skip cancellation support for long operations
- **DO NOT** mutate input objects (pure functions)
- **DO NOT** import from parent types - use local `types.ts`

## IMPORT PATTERNS

```typescript
// From within monte-carlo module
import type { MonteCarloInput, SurvivalRates } from './types'

// From outside (parent re-exports selectively)
import { runSimulation, type MonteCarloInput } from '@/lib/algorithms/monte-carlo'

// WRONG - don't import from parent types
import type { Position } from '@/lib/algorithms/types'  // NO!
```

## TESTING

```bash
# Run Monte Carlo tests
pnpm test src/tests/unit/algorithms/monte-carlo

# Watch mode
pnpm test src/tests/unit/algorithms/monte-carlo --watch
```

**Mock factories (in `src/tests/unit/algorithms/monte-carlo/factories.ts`):**
```typescript
import { createMockDraftBoard, createMockADPMap, createMockPreferences } from './factories'

const board = createMockDraftBoard({ teams: 12, currentPick: 1 })
const adpMap = createMockADPMap(['4046', '4040', '4041'])
const prefs = createMockPreferences({ likes: ['6803'], dislikes: ['5018'] })
```
