# SLEEPER API CLIENT

## OVERVIEW

Typed client for Sleeper fantasy football API. Rate-limited, with caching support.

## FILES

| File | Purpose |
|------|---------|
| `client.ts` | API functions with rate limiting (RateLimiter class) |
| `types.ts` | TypeScript interfaces for all Sleeper entities |
| `cache.ts` | Supabase caching (TTL-based: 24h/1h/15m/5m) |
| `player-search.ts` | Fuzzy player search |
| `draft.ts` | Draft-specific functions |
| `index.ts` | Barrel export |

## USAGE

```typescript
import { getUserByUsername, getUserLeagues, getCurrentSeason } from '@/lib/sleeper'

// Get user
const user = await getUserByUsername('sleeper_username')

// Get leagues for current season
const season = await getCurrentSeason()
const leagues = await getUserLeagues(user.user_id, season)
```

## API FUNCTIONS

| Function | Returns | Notes |
|----------|---------|-------|
| `getNFLState()` | `SleeperNFLState` | Current NFL week/season |
| `getCurrentSeason()` | `string` | e.g., "2025" |
| `getUserByUsername(username)` | `SleeperUser \| null` | Returns null if not found |
| `getUserById(userId)` | `SleeperUser \| null` | Returns null if not found |
| `getUserLeagues(userId, season)` | `SleeperLeague[]` | All NFL leagues for season |
| `getLeague(leagueId)` | `SleeperLeague` | Single league details |
| `getLeagueRosters(leagueId)` | `SleeperRoster[]` | All rosters in league |
| `getLeagueUsers(leagueId)` | `SleeperUser[]` | All users in league |
| `getMatchups(leagueId, week)` | `SleeperMatchup[]` | Weekly matchups |
| `getAllPlayers()` | `Record<string, SleeperPlayer>` | ~10k players, cache this |
| `getDraftPicks(draftId)` | `SleeperDraftPick[]` | No cache (real-time) |

## RATE LIMITING

Built-in `RateLimiter` class:
- 16 requests per second (Sleeper's limit)
- Sliding window with auto-throttle
- Debug logging in development

**DO NOT** bypass the rate limiter or call the API directly.

## CACHING (TTL-based)

| Data | TTL | Function |
|------|-----|----------|
| Players | 24h | `syncAllPlayers()` |
| League | 1h | `getCachedLeague()` |
| Rosters | 15m | `getCachedRosters()` |
| Matchups | 5m | `getCachedMatchups()` |
| Draft Picks | 0 | No cache (real-time) |

Invalidation: `invalidateLeagueCache(leagueId)` or `purgeLeagueCache(leagueId)`

## TYPES

Key interfaces in `types.ts`:
- `SleeperUser` - User account
- `SleeperLeague` - League settings, scoring, rosters
- `SleeperRoster` - Team roster with player IDs
- `SleeperMatchup` - Weekly matchup scores
- `SleeperPlayer` - Player metadata
- `SleeperNFLState` - Current season/week state
- `SleeperAPIError` - Error response (use `isSleeperAPIError()` guard)
- `SleeperDraftPick` - Draft pick with metadata

## ERROR HANDLING

```typescript
import { isSleeperAPIError } from '@/lib/sleeper/types'

try {
  const user = await getUserByUsername(username)
} catch (error) {
  if (isSleeperAPIError(error)) {
    if (error.statusCode === 404) {
      // User not found
    }
  }
}
```

## CONVENTIONS

- **DO NOT** hardcode season strings - use `getCurrentSeason()`
- **DO NOT** call API from components - use server actions or API routes
- **DO NOT** fetch all players on every request - cache for 24h minimum
- Player IDs are strings (e.g., "4046" for Patrick Mahomes)
- Team abbreviations are uppercase (e.g., "KC", "SF")

## IMPORT PATTERNS

```typescript
// CORRECT - use barrel export
import { getUserByUsername, getCurrentSeason } from '@/lib/sleeper'
import type { SleeperLeague, SleeperUser } from '@/lib/sleeper'

// WRONG - deep import
import { getUserByUsername } from '@/lib/sleeper/client'
```

## COMMON PATTERNS

**Fetch user leagues:**
```typescript
import { getUserByUsername, getUserLeagues, getCurrentSeason } from '@/lib/sleeper'

const user = await getUserByUsername('sleeper_username')
if (!user) return null

const season = await getCurrentSeason()
const leagues = await getUserLeagues(user.user_id, season)
```

**Check if player exists:**
```typescript
import { getAllPlayers } from '@/lib/sleeper'

const players = await getAllPlayers()
const player = players['4046']  // Patrick Mahomes
if (player) {
  console.log(player.full_name, player.position)
}
```

## TESTING

MSW handlers mock Sleeper API in E2E tests:
```typescript
// tests/mocks/handlers.ts
import { TEST_USER, TEST_LEAGUE } from './data'

http.get('https://api.sleeper.app/v1/user/:username', () => {
  return HttpResponse.json(TEST_USER)
})
```
