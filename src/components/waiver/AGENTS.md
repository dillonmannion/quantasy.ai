# WAIVER COMPONENTS

## OVERVIEW

Waiver wire UI. View recommendations, set FAAB bids, manage claims.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `recommendation-list.tsx` | `RecommendationList` | Ranked waiver targets |
| `faab-bid-display.tsx` | `FaabBidDisplay` | Suggested FAAB bid amount |
| `droppable-player-selector.tsx` | `DroppablePlayerSelector` | Select player to drop |
| `add-to-claims-button.tsx` | `AddToClaimsButton` | Add waiver claim |
| `index.ts` | All exports | Barrel export |

## DATA FLOW

```
WaiversPage (server component)
  └── RecommendationList (client)
        ├── WaiverCard (per player)
        │     ├── FaabBidDisplay
        │     ├── DroppablePlayerSelector
        │     └── AddToClaimsButton
        └── ClaimsList (queued claims)
```

## USAGE

```typescript
import { RecommendationList, FaabBidDisplay } from '@/components/waiver'

<RecommendationList
  recommendations={recommendations}
  roster={roster}
  budget={budget}
  onAddClaim={handleAddClaim}
/>
```

## CONVENTIONS

- All components use `'use client'`
- Recommendations via `/api/algorithms/waivers` POST
- FAAB bids calculated by algorithm (not user-editable by default)
- Claims require selecting a player to drop

## ANTI-PATTERNS

- **DO NOT** call waivers algorithm from components - use API route
- **DO NOT** allow FAAB bids exceeding remaining budget
