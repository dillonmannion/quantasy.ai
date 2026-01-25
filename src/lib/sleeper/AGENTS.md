# SLEEPER API CLIENT

## OVERVIEW

Typed client for Sleeper fantasy football API. Rate-limited, with caching support.

## FILES

| File | Purpose |
|------|---------|
| `client.ts` | API functions with rate limiting |
| `types.ts` | TypeScript interfaces for all Sleeper entities |
| `cache.ts` | Caching utilities (player data) |
| `player-search.ts` | Player search functionality |
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

## RATE LIMITING

Built-in `RateLimiter` class:
- 16 requests per second (Sleeper's limit)
- Auto-throttles with backoff
- Debug logging in development

**DO NOT** bypass the rate limiter or call the API directly.

## TYPES

Key interfaces in `types.ts`:
- `SleeperUser` - User account
- `SleeperLeague` - League settings, scoring, rosters
- `SleeperRoster` - Team roster with player IDs
- `SleeperMatchup` - Weekly matchup scores
- `SleeperPlayer` - Player metadata
- `SleeperNFLState` - Current season/week state
- `SleeperAPIError` - Error response (use `isSleeperAPIError()` guard)

## CACHING

`getAllPlayers()` returns ~10k players. **Always cache this.**

Use `cache.ts` utilities or cache at API route level with `next: { revalidate: 60 }`.

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
