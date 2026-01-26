# DRAFT COMPONENTS

## OVERVIEW

Draft Assistant UI. Client components with React Context state management.

## FILES

| File | Purpose |
|------|---------|
| `draft-shell.tsx` | Layout wrapper, provides DraftStateProvider |
| `draft-rankings.tsx` | Main rankings display with filters |
| `rankings-list.tsx` | Virtualized player list (TanStack Virtual) |
| `rankings-controls.tsx` | Position filter, search, sort controls |
| `swipeable-player-row.tsx` | Mobile swipe-to-pick player card |
| `explanation-panel.tsx` | "Show Your Work" VBD transparency |
| `my-team-sidebar.tsx` | Current roster display |
| `mock-draft-controls.tsx` | Mock draft start/reset/undo |
| `keeper-section.tsx` | Keeper player management |
| `auction-banner.tsx` | Auction budget display |
| `offline-indicator.tsx` | Network status indicator |

## DATA FLOW

```
DraftShell (provides DraftStateProvider)
  └── DraftRankings
        ├── RankingsControls (filter/search/sort)
        └── RankingsList (virtualized)
              └── SwipeablePlayerRow (mobile) or inline (desktop)
                    └── ExplanationPanel (on click)
```

## STATE MANAGEMENT

Uses `useDraftState()` from `@/lib/draft`:

```typescript
type DraftAction =
  | { type: 'MARK_DRAFTED'; playerId, playerName, position, rosterId }
  | { type: 'UNDO_LAST_PICK' }
  | { type: 'LOAD_KEEPERS'; playerIds }
  | { type: 'SYNC_PICKS'; picks }
  | { type: 'RESET' }
```

Mock draft state persisted to localStorage.

## LIVE SYNC

`useDraftSync()` hook polls `/api/draft/[draftId]/picks` every 3s during live draft:
- Exponential backoff on rate limit (429)
- Max 3 retries on error
- Auto-stops on draft complete

## VBD COLOR CODING

Rankings use VBD percentiles for color:
- Top 10%: Green
- Top 25%: Blue
- Top 50%: Yellow
- Bottom 50%: Gray

## CONVENTIONS

- All files are `'use client'`
- Use `useDraftState()` for state, not prop drilling
- Respect `useReducedMotion()` for animations
- Mobile swipe uses touch events, not drag libraries
- ExplanationPanel fetches AI explanation on demand (rate limited)
