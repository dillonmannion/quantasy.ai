# Implementation Plan 02: Caching Layer

> **Phase:** 1 - Data Layer
> **Complexity:** High
> **Dependencies:** Plan 01 (Sleeper Client)
> **Estimated Time:** 6-8 hours

---

## Objective

Implement a cache-through pattern using Supabase tables with TTL management. The pattern: Check cache -> If stale, fetch from Sleeper -> Update cache -> Return data.

---

## Context

### TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Players list | 24 hours | Changes rarely, large dataset |
| League settings | 1 hour | Might change pre-season |
| Rosters | 15 minutes | Changes during waivers/trades |
| Matchups | 5 minutes | Live during games |

### Database Tables Used

From `supabase/migrations/001_initial_schema.sql`:
- `leagues` - Cached league data
- `rosters` - Cached roster data
- `players` - Player master list
- `matchups` - Weekly matchup data
- `user_leagues` - User-league associations (not cached, user data)

---

## Files to Create

### 1. `src/lib/sleeper/cache.ts`

Cache management with TTL logic.

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import * as SleeperAPI from './client'
import type {
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
} from './types'

// ============ Types ============

type Tables = Database['public']['Tables']
type LeagueRow = Tables['leagues']['Row']
type RosterRow = Tables['rosters']['Row']
type MatchupRow = Tables['matchups']['Row']
type PlayerRow = Tables['players']['Row']

type CacheStatus = 'fresh' | 'stale' | 'missing'

// ============ TTL Configuration ============

const TTL = {
  PLAYERS: 24 * 60 * 60 * 1000,  // 24 hours
  LEAGUE: 60 * 60 * 1000,        // 1 hour
  ROSTERS: 15 * 60 * 1000,       // 15 minutes
  MATCHUPS: 5 * 60 * 1000,       // 5 minutes
} as const

// ============ Helpers ============

function getCacheStatus(cachedAt: string | null, ttl: number): CacheStatus {
  if (!cachedAt) return 'missing'
  
  const cacheTime = new Date(cachedAt).getTime()
  const age = Date.now() - cacheTime
  
  return age > ttl ? 'stale' : 'fresh'
}

function leagueRowToSleeper(row: LeagueRow): SleeperLeague {
  return {
    league_id: row.id,
    name: row.name,
    season: row.season,
    status: row.status as SleeperLeague['status'],
    sport: 'nfl',
    settings: (row.settings ?? {}) as SleeperLeague['settings'],
    scoring_settings: (row.scoring_settings ?? {}) as Record<string, number>,
    roster_positions: (row.roster_positions ?? []) as string[],
    total_rosters: row.total_rosters ?? 0,
    previous_league_id: null,
    draft_id: '',
  }
}

function rosterRowToSleeper(row: RosterRow): SleeperRoster {
  const settings = (row.settings ?? {}) as Record<string, number>
  return {
    roster_id: row.roster_id,
    owner_id: row.owner_id,
    league_id: row.league_id,
    players: row.players,
    starters: row.starters,
    reserve: row.reserve,
    taxi: null,
    co_owners: null,
    settings: {
      wins: settings.wins ?? 0,
      losses: settings.losses ?? 0,
      ties: settings.ties ?? 0,
      fpts: settings.fpts ?? 0,
      fpts_decimal: settings.fpts_decimal,
      fpts_against: settings.fpts_against ?? 0,
      fpts_against_decimal: settings.fpts_against_decimal,
    },
    metadata: null,
  }
}

// ============ League Cache ============

/**
 * Get league data with caching
 * Fresh cache: return immediately
 * Stale/missing: fetch from Sleeper, update cache, return
 */
export async function getCachedLeague(leagueId: string): Promise<SleeperLeague> {
  const supabase = await createClient()
  
  // Check cache
  const { data: cached, error: cacheError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single()

  if (cacheError && cacheError.code !== 'PGRST116') {
    // PGRST116 = not found, anything else is a real error
    console.error('[Cache] Error reading league cache:', cacheError)
  }

  const status = getCacheStatus(cached?.cached_at ?? null, TTL.LEAGUE)

  if (status === 'fresh' && cached) {
    return leagueRowToSleeper(cached)
  }

  // Fetch from Sleeper
  const fresh = await SleeperAPI.getLeague(leagueId)

  // Update cache (upsert)
  const { error: upsertError } = await supabase.from('leagues').upsert({
    id: fresh.league_id,
    name: fresh.name,
    season: fresh.season,
    status: fresh.status,
    settings: fresh.settings as Record<string, unknown>,
    scoring_settings: fresh.scoring_settings,
    roster_positions: fresh.roster_positions as unknown as Record<string, unknown>,
    total_rosters: fresh.total_rosters,
    cached_at: new Date().toISOString(),
  })

  if (upsertError) {
    console.error('[Cache] Error updating league cache:', upsertError)
    // Don't throw - return fresh data anyway
  }

  return fresh
}

// ============ Rosters Cache ============

/**
 * Get all rosters for a league with caching
 */
export async function getCachedRosters(leagueId: string): Promise<SleeperRoster[]> {
  const supabase = await createClient()
  
  // Check cache
  const { data: cached, error: cacheError } = await supabase
    .from('rosters')
    .select('*')
    .eq('league_id', leagueId)
    .order('roster_id')

  if (cacheError) {
    console.error('[Cache] Error reading rosters cache:', cacheError)
  }

  // Check if any roster exists and is fresh
  const status = getCacheStatus(
    cached?.[0]?.cached_at ?? null,
    TTL.ROSTERS
  )

  if (status === 'fresh' && cached && cached.length > 0) {
    return cached.map(rosterRowToSleeper)
  }

  // Fetch from Sleeper
  const fresh = await SleeperAPI.getLeagueRosters(leagueId)

  // Update cache: delete old, insert new
  const { error: deleteError } = await supabase
    .from('rosters')
    .delete()
    .eq('league_id', leagueId)

  if (deleteError) {
    console.error('[Cache] Error deleting old rosters:', deleteError)
  }

  if (fresh.length > 0) {
    const { error: insertError } = await supabase.from('rosters').insert(
      fresh.map(r => ({
        league_id: leagueId,
        roster_id: r.roster_id,
        owner_id: r.owner_id,
        players: r.players,
        starters: r.starters,
        reserve: r.reserve,
        settings: r.settings as Record<string, unknown>,
        cached_at: new Date().toISOString(),
      }))
    )

    if (insertError) {
      console.error('[Cache] Error inserting rosters:', insertError)
    }
  }

  return fresh
}

// ============ Matchups Cache ============

/**
 * Get matchups for a specific week with caching
 */
export async function getCachedMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  const supabase = await createClient()
  
  // Check cache
  const { data: cached, error: cacheError } = await supabase
    .from('matchups')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week', week)
    .order('matchup_id')

  if (cacheError) {
    console.error('[Cache] Error reading matchups cache:', cacheError)
  }

  const status = getCacheStatus(
    cached?.[0]?.cached_at ?? null,
    TTL.MATCHUPS
  )

  if (status === 'fresh' && cached && cached.length > 0) {
    return cached.map(m => ({
      roster_id: m.roster_id,
      matchup_id: m.matchup_id,
      points: m.points ?? 0,
      custom_points: null,
      starters: m.starters,
      starters_points: m.starters_points,
      players: m.players,
      players_points: m.players_points as Record<string, number> | null,
    }))
  }

  // Fetch from Sleeper
  const fresh = await SleeperAPI.getMatchups(leagueId, week)

  // Update cache
  const { error: deleteError } = await supabase
    .from('matchups')
    .delete()
    .eq('league_id', leagueId)
    .eq('week', week)

  if (deleteError) {
    console.error('[Cache] Error deleting old matchups:', deleteError)
  }

  if (fresh.length > 0) {
    const { error: insertError } = await supabase.from('matchups').insert(
      fresh.map(m => ({
        league_id: leagueId,
        week,
        matchup_id: m.matchup_id,
        roster_id: m.roster_id,
        points: m.points,
        starters: m.starters,
        starters_points: m.starters_points,
        players: m.players,
        players_points: m.players_points,
        cached_at: new Date().toISOString(),
      }))
    )

    if (insertError) {
      console.error('[Cache] Error inserting matchups:', insertError)
    }
  }

  return fresh
}

// ============ Players Sync ============

/**
 * Sync all NFL players from Sleeper to database
 * This is expensive (~7MB download) - call sparingly
 * @returns Number of players synced
 */
export async function syncAllPlayers(): Promise<number> {
  const supabase = await createClient()
  
  // Fetch all players from Sleeper
  const playersObj = await SleeperAPI.getAllPlayers()
  const players = Object.values(playersObj)

  // Filter to relevant players (active, with teams or recently active)
  const relevantPlayers = players.filter(p => 
    p.team || // Has a team
    p.status === 'Active' || // Active status
    (p.years_exp !== null && p.years_exp < 15) // Recent players
  )

  // Batch upsert (Supabase handles batching internally)
  const { error } = await supabase.from('players').upsert(
    relevantPlayers.map(p => ({
      id: p.player_id,
      full_name: p.full_name || `${p.first_name} ${p.last_name}`,
      first_name: p.first_name,
      last_name: p.last_name,
      team: p.team,
      position: p.position,
      age: p.age,
      years_exp: p.years_exp,
      status: p.status,
      injury_status: p.injury_status,
      sleeper_data: p,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[Cache] Error syncing players:', error)
    throw error
  }

  return relevantPlayers.length
}

/**
 * Check if players need syncing (no players or too old)
 */
export async function shouldSyncPlayers(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('players')
    .select('updated_at')
    .limit(1)
    .order('updated_at', { ascending: false })
    .single()

  if (error || !data) {
    return true // No players, need sync
  }

  const age = Date.now() - new Date(data.updated_at).getTime()
  return age > TTL.PLAYERS
}

// ============ Cache Invalidation ============

/**
 * Force cache to be stale for a league (triggers refresh on next access)
 */
export async function invalidateLeagueCache(leagueId: string): Promise<void> {
  const supabase = await createClient()
  const staleTime = new Date(0).toISOString() // Unix epoch = definitely stale

  // Invalidate league
  await supabase
    .from('leagues')
    .update({ cached_at: staleTime })
    .eq('id', leagueId)

  // Invalidate rosters
  await supabase
    .from('rosters')
    .update({ cached_at: staleTime })
    .eq('league_id', leagueId)

  // Invalidate matchups
  await supabase
    .from('matchups')
    .update({ cached_at: staleTime })
    .eq('league_id', leagueId)
}

/**
 * Completely remove a league and all associated cached data
 */
export async function purgeLeagueCache(leagueId: string): Promise<void> {
  const supabase = await createClient()

  // Delete in order (foreign key constraints)
  await supabase.from('matchups').delete().eq('league_id', leagueId)
  await supabase.from('rosters').delete().eq('league_id', leagueId)
  await supabase.from('user_leagues').delete().eq('league_id', leagueId)
  await supabase.from('leagues').delete().eq('id', leagueId)
}
```

### 2. Update `src/lib/sleeper/index.ts`

Add cache exports to barrel file.

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

// Client methods (direct API access)
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

// Cache methods (preferred for most use cases)
export {
  getCachedLeague,
  getCachedRosters,
  getCachedMatchups,
  syncAllPlayers,
  shouldSyncPlayers,
  invalidateLeagueCache,
  purgeLeagueCache,
} from './cache'
```

---

## Success Criteria

- [ ] `getCachedLeague` returns fresh cache without API call
- [ ] `getCachedLeague` fetches and updates stale cache
- [ ] `getCachedRosters` works with correct TTL (15 min)
- [ ] `getCachedMatchups` works with correct TTL (5 min)
- [ ] `syncAllPlayers` populates players table
- [ ] `shouldSyncPlayers` returns true when stale/empty
- [ ] `invalidateLeagueCache` forces next fetch to refresh
- [ ] All database errors are logged but don't crash
- [ ] TypeScript compiles without errors

---

## Testing

### Manual Cache Test

```typescript
import { getCachedLeague, invalidateLeagueCache } from '@/lib/sleeper'

// Test 1: First fetch (cache miss)
console.time('first')
const league1 = await getCachedLeague('your_league_id')
console.timeEnd('first') // Should be slow (API + DB write)

// Test 2: Second fetch (cache hit)
console.time('second')
const league2 = await getCachedLeague('your_league_id')
console.timeEnd('second') // Should be fast (DB read only)

// Test 3: Invalidate and refetch
await invalidateLeagueCache('your_league_id')
console.time('third')
const league3 = await getCachedLeague('your_league_id')
console.timeEnd('third') // Should be slow again (forced refresh)
```

### Player Sync Test

```typescript
import { syncAllPlayers, shouldSyncPlayers } from '@/lib/sleeper'

console.log('Need sync?', await shouldSyncPlayers())
console.log('Syncing...')
const count = await syncAllPlayers()
console.log(`Synced ${count} players`)
console.log('Need sync now?', await shouldSyncPlayers()) // Should be false
```

---

## Notes

### RLS Considerations

The `leagues`, `rosters`, `matchups`, and `players` tables do NOT have RLS enabled (per schema). They are public read/write for caching purposes. User-specific data is protected via `user_leagues` and `algorithm_outputs` tables.

### Error Handling Philosophy

Cache errors should NOT crash the application. If we can't read/write cache:
1. Log the error
2. Return fresh data anyway
3. Let the next request try cache again

### Future Improvements

- Add background refresh on page load if cache is >50% TTL
- Implement cache warming for connected leagues
- Add cache metrics/observability

---

## Related Plans

- **Previous:** [phase-1-impl-01-sleeper-client.md](./phase-1-impl-01-sleeper-client.md)
- **Next:** [phase-1-impl-03-connect-league.md](./phase-1-impl-03-connect-league.md)
