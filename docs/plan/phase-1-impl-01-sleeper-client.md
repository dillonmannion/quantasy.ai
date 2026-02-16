# Implementation Plan 01: Sleeper API Client

> **Phase:** 1 - Data Layer
> **Complexity:** Medium
> **Dependencies:** None
> **Estimated Time:** 4-6 hours

---

## Objective

Build a typed TypeScript client for the Sleeper Fantasy Football API with rate limiting, error handling, and request logging.

---

## Context

The Sleeper API is public and requires no authentication. Key constraints:
- Rate limit: 1000 requests/minute (~16/second)
- Base URL: `https://api.sleeper.app/v1`
- All responses are JSON
- 404s return null/empty for non-existent resources

Real-world reference: [kt474/fantasy-football-wrapped](https://github.com/kt474/fantasy-football-wrapped/blob/main/src/api/api.ts)

---

## Files to Create

### 1. `src/lib/sleeper/types.ts`

TypeScript types for all Sleeper API responses.

```typescript
/**
 * Sleeper API TypeScript Types
 * Based on https://docs.sleeper.com/
 */

// ============ Core Types ============

export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string | null
}

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: 'pre_draft' | 'drafting' | 'in_season' | 'complete'
  sport: 'nfl'
  settings: SleeperLeagueSettings
  scoring_settings: Record<string, number>
  roster_positions: string[]
  total_rosters: number
  previous_league_id: string | null
  draft_id: string
}

export interface SleeperLeagueSettings {
  playoff_week_start: number
  num_teams: number
  playoff_teams: number
  leg: number // current week/leg
  [key: string]: unknown
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string | null
  league_id: string
  players: string[] | null
  starters: string[] | null
  reserve: string[] | null
  taxi: string[] | null
  co_owners: string[] | null
  settings: SleeperRosterSettings
  metadata: Record<string, unknown> | null
}

export interface SleeperRosterSettings {
  wins: number
  losses: number
  ties: number
  fpts: number
  fpts_decimal?: number
  fpts_against?: number
  fpts_against_decimal?: number
  ppts?: number // potential points
  ppts_decimal?: number
  [key: string]: number | undefined
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number
  points: number
  custom_points: number | null
  starters: string[] | null
  starters_points: number[] | null
  players: string[] | null
  players_points: Record<string, number> | null
}

export interface SleeperPlayer {
  player_id: string
  full_name: string
  first_name: string
  last_name: string
  team: string | null
  position: string
  age: number | null
  years_exp: number | null
  status: 'Active' | 'Inactive' | 'Injured Reserve' | string
  injury_status: 'Out' | 'Doubtful' | 'Questionable' | 'IR' | null
  number: number | null
  height: string | null
  weight: string | null
  college: string | null
  fantasy_positions: string[] | null
  [key: string]: unknown
}

export interface SleeperNFLState {
  season: string
  season_type: 'pre' | 'regular' | 'post' | 'off'
  week: number
  leg: number
  display_week: number
  season_start_date: string
  previous_season: string
}

// ============ Error Types ============

export interface SleeperAPIError {
  error: string
  message: string
  statusCode: number
}

export function isSleeperAPIError(obj: unknown): obj is SleeperAPIError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'statusCode' in obj &&
    typeof (obj as SleeperAPIError).statusCode === 'number'
  )
}
```

### 2. `src/lib/sleeper/client.ts`

HTTP client with rate limiting and error handling.

```typescript
import type {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
  SleeperPlayer,
  SleeperNFLState,
  SleeperAPIError,
} from './types'

const BASE_URL = 'https://api.sleeper.app/v1'
const DEBUG = process.env.NODE_ENV === 'development'

// ============ Rate Limiter ============

class RateLimiter {
  private requestTimes: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 16, windowMs = 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async throttle(): Promise<void> {
    const now = Date.now()
    
    // Remove requests outside the window
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.windowMs
    )

    if (this.requestTimes.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = this.requestTimes[0]!
      const waitTime = this.windowMs - (now - oldestRequest) + 10 // +10ms buffer
      
      if (DEBUG) {
        console.log(`[Sleeper] Rate limited, waiting ${waitTime}ms`)
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return this.throttle() // Retry after waiting
    }

    this.requestTimes.push(now)
  }
}

const rateLimiter = new RateLimiter()

// ============ Fetch Wrapper ============

async function sleeperFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  await rateLimiter.throttle()

  const url = `${BASE_URL}${endpoint}`
  const startTime = Date.now()
  
  try {
    if (DEBUG) {
      console.log(`[Sleeper] GET ${endpoint}`)
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
      // Cache for 60 seconds on the edge
      next: { revalidate: 60 },
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const error: SleeperAPIError = {
        error: 'SleeperAPIError',
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      }
      
      if (DEBUG) {
        console.error(`[Sleeper] Error ${response.status} for ${endpoint} (${duration}ms)`)
      }
      
      throw error
    }

    const data = await response.json()
    
    if (DEBUG) {
      console.log(`[Sleeper] OK ${endpoint} (${duration}ms)`)
    }

    return data as T
  } catch (error) {
    if ((error as SleeperAPIError).statusCode) {
      throw error // Re-throw Sleeper errors
    }
    
    // Network or parsing error
    console.error(`[Sleeper] Network error for ${endpoint}:`, error)
    throw {
      error: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 0,
    } as SleeperAPIError
  }
}

// ============ API Methods ============

/**
 * Get NFL state (current season, week, etc.)
 */
export async function getNFLState(): Promise<SleeperNFLState> {
  return sleeperFetch<SleeperNFLState>('/state/nfl')
}

/**
 * Get user by username
 * @returns User object or null if not found
 */
export async function getUserByUsername(
  username: string
): Promise<SleeperUser | null> {
  try {
    const user = await sleeperFetch<SleeperUser>(`/user/${encodeURIComponent(username)}`)
    return user
  } catch (error) {
    if ((error as SleeperAPIError).statusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<SleeperUser | null> {
  try {
    return await sleeperFetch<SleeperUser>(`/user/${userId}`)
  } catch (error) {
    if ((error as SleeperAPIError).statusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * Get all leagues for a user in a given season
 */
export async function getUserLeagues(
  userId: string,
  season: string
): Promise<SleeperLeague[]> {
  return sleeperFetch<SleeperLeague[]>(
    `/user/${userId}/leagues/nfl/${season}`
  )
}

/**
 * Get league details
 */
export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`)
}

/**
 * Get all rosters in a league
 */
export async function getLeagueRosters(
  leagueId: string
): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`)
}

/**
 * Get all users/members in a league
 */
export async function getLeagueUsers(
  leagueId: string
): Promise<SleeperUser[]> {
  return sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`)
}

/**
 * Get matchups for a specific week
 */
export async function getMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  return sleeperFetch<SleeperMatchup[]>(
    `/league/${leagueId}/matchups/${week}`
  )
}

/**
 * Get all NFL players
 * WARNING: This is a large response (~7MB). Cache aggressively.
 */
export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  return sleeperFetch<Record<string, SleeperPlayer>>('/players/nfl')
}

/**
 * Get current season string (e.g., "2024")
 */
export async function getCurrentSeason(): Promise<string> {
  const state = await getNFLState()
  return state.season
}
```

### 3. `src/lib/sleeper/index.ts`

Barrel export for clean imports.

```typescript
// Types
export type {
  SleeperUser,
  SleeperLeague,
  SleeperLeagueSettings,
  SleeperRoster,
  SleeperRosterSettings,
  SleeperMatchup,
  SleeperPlayer,
  SleeperNFLState,
  SleeperAPIError,
} from './types'

export { isSleeperAPIError } from './types'

// Client methods
export {
  getNFLState,
  getUserByUsername,
  getUserById,
  getUserLeagues,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  getMatchups,
  getAllPlayers,
  getCurrentSeason,
} from './client'
```

---

## Success Criteria

- [ ] All Sleeper API endpoints are typed correctly
- [ ] Rate limiter prevents exceeding 1000 req/min
- [ ] 404 errors return null (not throw) for user/league lookups
- [ ] Other HTTP errors throw with statusCode
- [ ] Network errors are caught and wrapped
- [ ] Debug logging works in development
- [ ] TypeScript compiles without errors

---

## Testing

### Manual Testing

```typescript
// In a test file or REPL
import { getUserByUsername, getUserLeagues, getNFLState } from '@/lib/sleeper'

// Test 1: Get NFL state
const state = await getNFLState()
console.log('Current season:', state.season, 'Week:', state.week)

// Test 2: Valid username
const user = await getUserByUsername('your_sleeper_username')
console.log('User:', user?.username, user?.user_id)

// Test 3: Invalid username (should return null)
const notFound = await getUserByUsername('this_user_definitely_does_not_exist_12345')
console.log('Not found:', notFound) // null

// Test 4: Get user leagues
if (user) {
  const leagues = await getUserLeagues(user.user_id, state.season)
  console.log('Leagues:', leagues.length)
}
```

### Rate Limit Test

```typescript
// Fire many requests rapidly - should not error
const promises = Array(50).fill(null).map(() => getNFLState())
await Promise.all(promises)
console.log('Rate limiting works!')
```

---

## Notes

- The `getAllPlayers()` endpoint returns ~7MB of data. Always cache this response.
- The caching layer (Plan 02) will wrap these methods to provide Supabase caching.
- Error handling is designed for consumer convenience: null for not-found, throw for errors.

---

## Related Plans

- **Next:** [phase-1-impl-02-caching-layer.md](./phase-1-impl-02-caching-layer.md)
- **Uses this:** Plans 02, 03, 04, 05
