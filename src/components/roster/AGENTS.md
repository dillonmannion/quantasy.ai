# ROSTER COMPONENTS

## OVERVIEW

Lineup optimizer UI. View current vs optimal lineup, apply recommendations.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `lineup-slot.tsx` | `LineupSlot` | Single roster slot with player |
| `lineup-comparison.tsx` | `LineupComparison` | Side-by-side current vs optimal |
| `lineup-explanation.tsx` | `LineupExplanationPanel` | Why move was recommended |
| `apply-optimization-button.tsx` | `ApplyOptimizationButton` | One-click apply optimal lineup |
| `index.ts` | All exports | Barrel export |

## DATA FLOW

```
RosterPage (server component)
  └── LineupComparison (client)
        ├── LineupSlot[] (current)
        ├── LineupSlot[] (optimal)
        ├── LineupExplanationPanel
        └── ApplyOptimizationButton
```

## USAGE

```typescript
import { LineupComparison, ApplyOptimizationButton } from '@/components/roster'

<LineupComparison
  currentLineup={currentLineup}
  optimalLineup={optimalLineup}
  players={players}
/>
```

## CONVENTIONS

- All components use `'use client'`
- Optimization via `/api/algorithms/lineup` POST
- Lineup algorithm uses backtracking (500ms timeout)
- Slots show position, player name, projected points

## ANTI-PATTERNS

- **DO NOT** call lineup algorithm from components - use API route
- **DO NOT** auto-apply optimization without user confirmation
