# TRADE COMPONENTS

## OVERVIEW

Trade calculator UI. Build trades, evaluate fairness, view AI explanations.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `trade-builder.tsx` | `TradeBuilder` | Main trade form with two-sided player selection |
| `player-picker.tsx` | `PlayerPicker` | Search + select players for trade |
| `player-chip.tsx` | `PlayerChip` | Removable player badge in trade |
| `fairness-meter.tsx` | `FairnessMeter` | Visual trade balance indicator |
| `trade-explanation.tsx` | `TradeExplanation` | AI-generated trade analysis |
| `index.ts` | All exports | Barrel export |

## DATA FLOW

```
TradeBuilder
  ├── PlayerPicker (team A) → select players
  ├── PlayerPicker (team B) → select players
  ├── PlayerChip[] (removable)
  ├── FairnessMeter (shows balance)
  └── TradeExplanation (AI analysis)
```

## USAGE

```typescript
import { TradeBuilder, FairnessMeter } from '@/components/trade'

<TradeBuilder
  leagueId={leagueId}
  userRosterId={userRosterId}
  rosters={rosters}
  players={players}
/>
```

## CONVENTIONS

- All components use `'use client'`
- Trade evaluation via `/api/algorithms/trade` POST
- Player values from VBD algorithm
- FairnessMeter shows percentage difference (green = fair, red = lopsided)

## ANTI-PATTERNS

- **DO NOT** call trade algorithm from components - use API route
- **DO NOT** hardcode player values - always use VBD
