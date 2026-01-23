# Phase 1: Data Layer & League Connection (Weeks 3-4)

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete implementation guide for Phase 1

---

## Objectives

- Sleeper API client with proper caching
- League connection flow ("Connect Your League")
- Player data synced from Sleeper/nflverse
- Data displayed in dashboard
- Cache invalidation strategy

---

## Week 3: Sleeper Integration

### Day 1-2: Sleeper API Client

- [ ] Create typed Sleeper API client (`lib/sleeper/client.ts`)
  ```typescript
  // Key endpoints needed:
  // GET /user/{username} - get user by username
  // GET /user/{user_id}/leagues/nfl/{season} - get user's leagues
  // GET /league/{league_id} - get league details
  // GET /league/{league_id}/rosters - get all rosters
  // GET /league/{league_id}/users - get league members
  // GET /league/{league_id}/matchups/{week} - get matchups
  // GET /players/nfl - get all players (large, cache aggressively)
  ```
- [ ] Implement rate limiting (stay under 1000/min)
- [ ] Add request logging for debugging
- [ ] Create TypeScript types matching Sleeper responses

### Day 3-4: Caching Layer

- [ ] Build cache-through pattern:
  ```
  Request -> Check Supabase cache -> If stale, fetch Sleeper -> Update cache -> Return
  ```
- [ ] Cache TTL strategy:

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Players list | 24 hours | Changes rarely |
| League settings | 1 hour | Might change pre-season |
| Rosters | 15 minutes | Changes during waivers |
| Matchups | 5 minutes | Live during games |

- [ ] Create Supabase Edge Functions for sync operations
- [ ] Implement background refresh (on page load if stale)

### Day 5: Connect League Flow

- [ ] Build "Connect League" UI:
  - [ ] Step 1: Enter Sleeper username
  - [ ] Step 2: Fetch and display user's leagues
  - [ ] Step 3: Select league(s) to connect
  - [ ] Step 4: Confirm and sync data
- [ ] Store user-league associations
- [ ] Show loading states with `<Shimmer>`
- [ ] Celebrate successful connection with `<Kaching>`

---

## Week 4: Player Data & Dashboard

### Day 1-2: Player Sync

- [ ] Fetch Sleeper's player database (one-time + weekly refresh)
- [ ] Enrich with nflverse projections (if available)
- [ ] Build player search/lookup:
  - [ ] By name (fuzzy search)
  - [ ] By team
  - [ ] By position
- [ ] Player card component with:
  - [ ] Photo (Sleeper avatar or placeholder)
  - [ ] Name, team, position
  - [ ] Injury status indicator

### Day 3-4: Dashboard Data Display

- [ ] League overview card:
  - [ ] League name, format, size
  - [ ] User's record (W-L)
  - [ ] Current week
  - [ ] Standings position
- [ ] Quick stats:
  - [ ] Points for/against
  - [ ] Roster value (placeholder for now)
- [ ] "Last synced" timestamp with refresh button
- [ ] Animate data load with `<StaggerList>`

### Day 5: Error Handling & Edge Cases

- [ ] Handle Sleeper API errors gracefully:
  - [ ] Rate limited -> Queue and retry
  - [ ] User not found -> Clear error message
  - [ ] League not found -> Suggest re-auth
- [ ] Offline handling:
  - [ ] Show cached data with "offline" badge
  - [ ] Queue actions for retry
- [ ] Create error boundary component
- [ ] Test with network throttling

---

## Testing Requirements

| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Sleeper client | Unit | All endpoints mocked |
| Cache logic | Unit | TTL, invalidation, race conditions |
| Connect flow | E2E | Happy path + error states |
| Player search | Unit | Fuzzy matching accuracy |

---

## Deliverables Checklist

- [ ] Sleeper API client with full typing
- [ ] Cache layer with TTL management
- [ ] "Connect League" flow complete
- [ ] Players table populated
- [ ] Dashboard shows real league data
- [ ] Error states and loading states polished
- [ ] Offline indicator

---

## API Contract: Sleeper -> Supabase

```typescript
// lib/sleeper/sync.ts

/**
 * Sync a user's leagues from Sleeper to Supabase
 * Called when: User connects, manual refresh, or cache expired
 */
async function syncUserLeagues(sleeperUserId: string, season: string): Promise<void> {
  // 1. Fetch leagues from Sleeper
  // 2. Upsert to leagues table
  // 3. Upsert to user_leagues junction
  // 4. For each league, sync rosters
}

/**
 * Sync rosters for a league
 * Called when: League synced, or roster cache expired
 */
async function syncLeagueRosters(leagueId: string): Promise<void> {
  // 1. Fetch rosters from Sleeper
  // 2. Upsert to rosters table
  // 3. Update league.cached_at
}

/**
 * Sync matchups for a specific week
 * Called when: Viewing matchups, or during live games
 */
async function syncMatchups(leagueId: string, week: number): Promise<void> {
  // 1. Fetch matchups from Sleeper
  // 2. Upsert to matchups table
}
```

---

## Sleeper API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/user/{username}` | GET | Get user by username |
| `/user/{user_id}/leagues/nfl/{season}` | GET | Get user's leagues |
| `/league/{league_id}` | GET | Get league details |
| `/league/{league_id}/rosters` | GET | Get all rosters |
| `/league/{league_id}/users` | GET | Get league members |
| `/league/{league_id}/matchups/{week}` | GET | Get matchups |
| `/players/nfl` | GET | Get all players (cache aggressively) |

**Rate Limit:** 1000 requests/minute (generous)

**Base URL:** `https://api.sleeper.app/v1`

---

## Related Documents

- [02-database-schema.md](./02-database-schema.md) - Database tables for caching
- [phase-0-foundation.md](./phase-0-foundation.md) - Prerequisites
- [phase-2-draft-assistant.md](./phase-2-draft-assistant.md) - Next phase
