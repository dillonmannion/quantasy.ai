# DRAFT STATE

## OVERVIEW

React Context + useReducer for draft state management. Supports mock drafts (localStorage) and live drafts (sync).

## FILES

| File | Purpose |
|------|---------|
| `state.tsx` | `DraftStateProvider` + `useDraftState()` hook |
| `types.ts` | `DraftState`, `DraftAction`, `DraftPick` types |
| `index.ts` | Barrel export |

## USAGE

```typescript
// Wrap component tree
<DraftStateProvider
  draftId={draftId}
  status="live"  // 'mock' | 'live' | 'complete'
  userRosterId={userRosterId}
  initialKeepers={keeperIds}
>
  <DraftRankings />
</DraftStateProvider>

// Access state in child components
const { state, dispatch } = useDraftState()

// Dispatch actions
dispatch({ type: 'MARK_DRAFTED', playerId, playerName, position, rosterId })
dispatch({ type: 'UNDO_LAST_PICK' })
dispatch({ type: 'LOAD_KEEPERS', playerIds: [...] })
dispatch({ type: 'SYNC_PICKS', picks: [...] })
dispatch({ type: 'RESET' })
```

## ACTIONS

| Action | Purpose |
|--------|---------|
| `MARK_DRAFTED` | Add player to drafted set, increment pick |
| `UNDO_LAST_PICK` | Remove last pick (mock mode only) |
| `LOAD_KEEPERS` | Pre-mark keeper players as drafted |
| `SYNC_PICKS` | Replace picks from live draft API |
| `RESET` | Clear all picks (mock mode only) |

## PERSISTENCE

- **Mock drafts**: Saved to `localStorage` key `mock-draft-state`
- **Live drafts**: Synced via `/api/draft/[draftId]/picks` polling

## CONVENTIONS

- `'use client'` directive required
- Provider must wrap all draft components
- Use `useDraftState()` hook, never access context directly
- `draftedPlayerIds` is a `Set<string>` for O(1) lookup

## ANTI-PATTERNS

- **DO NOT** mutate `state` directly - always use `dispatch()`
- **DO NOT** use `useDraftState()` outside `DraftStateProvider`
- **DO NOT** persist live draft state to localStorage
