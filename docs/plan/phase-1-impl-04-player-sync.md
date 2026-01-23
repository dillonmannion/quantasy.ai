# Implementation Plan 04: Player Sync & Search

> **Phase:** 1 - Data Layer
> **Complexity:** Medium
> **Dependencies:** Plans 01, 02
> **Estimated Time:** 4-6 hours

---

## Objective

Sync the NFL player database from Sleeper, implement player search functionality, and create a reusable player card component.

---

## Context

### Player Data Characteristics

- Sleeper's `/players/nfl` endpoint returns ~7MB of data
- Contains ~10,000+ players (active, inactive, retired)
- Should sync once and refresh weekly (24-hour TTL)
- Players have: name, team, position, age, status, injury

### Use Cases

1. **Roster Display** - Show player names/info for roster positions
2. **Player Search** - Find players by name for trades, waivers
3. **Draft Rankings** - Display player info with VBD scores (Phase 2)

---

## Files to Create

### 1. `src/lib/sleeper/player-search.ts`

Player lookup and search utilities.

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

export interface PlayerSearchOptions {
  position?: string | string[]
  team?: string
  limit?: number
  includeInjured?: boolean
}

/**
 * Search players by name (fuzzy match)
 */
export async function searchPlayers(
  query: string, 
  options: PlayerSearchOptions = {}
): Promise<PlayerRow[]> {
  const supabase = await createClient()
  const { position, team, limit = 20, includeInjured = true } = options
  
  // Build query
  let queryBuilder = supabase
    .from('players')
    .select('*')

  // Name search (case-insensitive, partial match)
  if (query.trim()) {
    const searchTerm = `%${query.trim()}%`
    queryBuilder = queryBuilder.or(
      `full_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`
    )
  }

  // Position filter
  if (position) {
    if (Array.isArray(position)) {
      queryBuilder = queryBuilder.in('position', position)
    } else {
      queryBuilder = queryBuilder.eq('position', position)
    }
  }

  // Team filter
  if (team) {
    queryBuilder = queryBuilder.eq('team', team)
  }

  // Exclude severely injured if requested
  if (!includeInjured) {
    queryBuilder = queryBuilder.or('injury_status.is.null,injury_status.neq.Out')
  }

  // Only active players with teams by default for search
  queryBuilder = queryBuilder.not('team', 'is', null)

  const { data, error } = await queryBuilder
    .limit(limit)
    .order('full_name')

  if (error) {
    console.error('[PlayerSearch] Error:', error)
    throw error
  }

  return data ?? []
}

/**
 * Get a single player by ID
 */
export async function getPlayerById(playerId: string): Promise<PlayerRow | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('[PlayerSearch] Error getting player:', error)
    throw error
  }

  return data
}

/**
 * Get multiple players by IDs (batch lookup)
 * Returns a Map for O(1) lookup by ID
 */
export async function getPlayersByIds(
  playerIds: string[]
): Promise<Map<string, PlayerRow>> {
  if (playerIds.length === 0) return new Map()
  
  const supabase = await createClient()
  
  // Deduplicate IDs
  const uniqueIds = [...new Set(playerIds)]
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .in('id', uniqueIds)

  if (error) {
    console.error('[PlayerSearch] Error getting players:', error)
    throw error
  }

  // Convert to Map for easy lookup
  const playerMap = new Map<string, PlayerRow>()
  for (const player of data ?? []) {
    playerMap.set(player.id, player)
  }

  return playerMap
}

/**
 * Get all players for a specific team
 */
export async function getPlayersByTeam(
  team: string,
  position?: string
): Promise<PlayerRow[]> {
  const supabase = await createClient()
  
  let queryBuilder = supabase
    .from('players')
    .select('*')
    .eq('team', team)

  if (position) {
    queryBuilder = queryBuilder.eq('position', position)
  }

  const { data, error } = await queryBuilder
    .order('position')
    .order('full_name')

  if (error) {
    console.error('[PlayerSearch] Error getting team players:', error)
    throw error
  }

  return data ?? []
}

/**
 * Get player count (for sync status display)
 */
export async function getPlayerCount(): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('[PlayerSearch] Error getting count:', error)
    return 0
  }

  return count ?? 0
}

/**
 * NFL Teams list for filtering
 */
export const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
] as const

/**
 * Fantasy-relevant positions
 */
export const FANTASY_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
```

### 2. `src/components/players/player-card.tsx`

Reusable player display component.

```tsx
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface PlayerCardProps {
  player: PlayerRow
  variant?: 'default' | 'compact' | 'detailed'
  showStats?: boolean
  showTeam?: boolean
  className?: string
  onClick?: () => void
}

const positionColors: Record<string, string> = {
  QB: 'text-red-400 bg-red-400/20',
  RB: 'text-green-400 bg-green-400/20',
  WR: 'text-blue-400 bg-blue-400/20',
  TE: 'text-yellow-400 bg-yellow-400/20',
  K: 'text-purple-400 bg-purple-400/20',
  DEF: 'text-orange-400 bg-orange-400/20',
}

const injuryBadges: Record<string, { label: string; color: string }> = {
  Out: { label: 'OUT', color: 'bg-red-500 text-white' },
  Doubtful: { label: 'D', color: 'bg-orange-500 text-white' },
  Questionable: { label: 'Q', color: 'bg-yellow-500 text-black' },
  IR: { label: 'IR', color: 'bg-red-700 text-white' },
  PUP: { label: 'PUP', color: 'bg-red-600 text-white' },
  Sus: { label: 'SUSP', color: 'bg-gray-600 text-white' },
}

function PlayerAvatar({ player, size = 'md' }: { player: PlayerRow; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  }

  const initials = `${player.first_name?.[0] ?? ''}${player.last_name?.[0] ?? ''}`
  const posColor = positionColors[player.position ?? ''] ?? 'text-gray-400 bg-gray-400/20'

  return (
    <div className={cn(
      'rounded-lg flex items-center justify-center font-bold shrink-0',
      posColor,
      sizeClasses[size]
    )}>
      {initials || '??'}
    </div>
  )
}

function InjuryBadge({ status }: { status: string | null }) {
  if (!status) return null
  
  const badge = injuryBadges[status]
  if (!badge) return null

  return (
    <span className={cn(
      'text-xs px-1.5 py-0.5 rounded font-bold shrink-0',
      badge.color
    )}>
      {badge.label}
    </span>
  )
}

function PositionBadge({ position }: { position: string | null }) {
  if (!position) return null
  
  const color = positionColors[position] ?? 'text-gray-400 bg-gray-400/20'

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-semibold', color)}>
      {position}
    </span>
  )
}

export function PlayerCard({ 
  player, 
  variant = 'default',
  showStats = false,
  showTeam = true,
  className,
  onClick,
}: PlayerCardProps) {
  const isClickable = !!onClick

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          'flex items-center gap-2 py-1',
          isClickable && 'cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2',
          className
        )}
        onClick={onClick}
      >
        <PositionBadge position={player.position} />
        <span className="font-medium truncate">{player.full_name}</span>
        {showTeam && player.team && (
          <span className="text-muted-foreground text-sm">{player.team}</span>
        )}
        <InjuryBadge status={player.injury_status} />
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div 
        className={cn(
          'card-balatro p-4',
          isClickable && 'cursor-pointer hover:border-primary transition-colors',
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-4">
          <PlayerAvatar player={player} size="lg" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">{player.full_name}</h3>
              <InjuryBadge status={player.injury_status} />
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <PositionBadge position={player.position} />
              {player.team && <span>{player.team}</span>}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              {player.age && (
                <div>
                  <span className="text-muted-foreground">Age:</span>{' '}
                  <span className="font-medium">{player.age}</span>
                </div>
              )}
              {player.years_exp !== null && (
                <div>
                  <span className="text-muted-foreground">Exp:</span>{' '}
                  <span className="font-medium">{player.years_exp} yrs</span>
                </div>
              )}
              {player.status && (
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="font-medium">{player.status}</span>
                </div>
              )}
            </div>

            {showStats && player.projected_points && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-accent font-bold text-lg">
                  {player.projected_points.toFixed(1)} pts
                </span>
                <span className="text-muted-foreground ml-2 text-sm">
                  projected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div 
      className={cn(
        'flex items-center gap-3 p-3',
        isClickable && 'cursor-pointer hover:bg-muted/50 rounded-lg',
        className
      )}
      onClick={onClick}
    >
      <PlayerAvatar player={player} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{player.full_name}</span>
          <InjuryBadge status={player.injury_status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PositionBadge position={player.position} />
          {showTeam && player.team && <span>{player.team}</span>}
        </div>
      </div>

      {showStats && player.projected_points && (
        <div className="text-right shrink-0">
          <div className="font-bold text-accent">
            {player.projected_points.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">pts</div>
        </div>
      )}
    </div>
  )
}

// Named exports for sub-components (useful for custom layouts)
export { PlayerAvatar, InjuryBadge, PositionBadge }
```

### 3. `src/components/players/player-list.tsx`

List component for displaying multiple players.

```tsx
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { PlayerCard } from './player-card'
import type { Database } from '@/lib/supabase/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface PlayerListProps {
  players: PlayerRow[]
  variant?: 'default' | 'compact' | 'detailed'
  showStats?: boolean
  showTeam?: boolean
  onPlayerClick?: (player: PlayerRow) => void
  emptyMessage?: string
  className?: string
}

export function PlayerList({
  players,
  variant = 'default',
  showStats = false,
  showTeam = true,
  onPlayerClick,
  emptyMessage = 'No players found',
  className,
}: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <StaggerList className={className}>
      {players.map((player) => (
        <StaggerItem key={player.id}>
          <PlayerCard
            player={player}
            variant={variant}
            showStats={showStats}
            showTeam={showTeam}
            onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
          />
        </StaggerItem>
      ))}
    </StaggerList>
  )
}
```

### 4. `src/components/players/index.ts`

Barrel export.

```typescript
export { PlayerCard, PlayerAvatar, InjuryBadge, PositionBadge } from './player-card'
export { PlayerList } from './player-list'
```

### 5. `src/app/api/players/sync/route.ts`

API endpoint to trigger player sync (admin/manual trigger).

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAllPlayers, shouldSyncPlayers } from '@/lib/sleeper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for large sync

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    // Check if sync is needed
    const needsSync = await shouldSyncPlayers()
    
    if (!needsSync) {
      return NextResponse.json({ 
        success: true, 
        skipped: true,
        message: 'Players are up to date' 
      })
    }

    // Perform sync
    const count = await syncAllPlayers()

    return NextResponse.json({ 
      success: true, 
      count,
      message: `Synced ${count} players` 
    })
  } catch (error) {
    console.error('[API] Player sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync players' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const needsSync = await shouldSyncPlayers()
    
    return NextResponse.json({
      needsSync,
      message: needsSync ? 'Players need syncing' : 'Players are current',
    })
  } catch (error) {
    console.error('[API] Player check error:', error)
    return NextResponse.json(
      { error: 'Failed to check player status' },
      { status: 500 }
    )
  }
}
```

### 6. Update `src/lib/sleeper/index.ts`

Add player search exports.

```typescript
// ... existing exports ...

// Player search utilities
export {
  searchPlayers,
  getPlayerById,
  getPlayersByIds,
  getPlayersByTeam,
  getPlayerCount,
  NFL_TEAMS,
  FANTASY_POSITIONS,
} from './player-search'
```

---

## Success Criteria

- [ ] `syncAllPlayers()` populates the players table
- [ ] `searchPlayers('mahomes')` finds Patrick Mahomes
- [ ] `searchPlayers('', { position: 'QB', team: 'KC' })` finds Chiefs QBs
- [ ] `getPlayersByIds(['4046', '6794'])` returns player map
- [ ] `PlayerCard` renders correctly for all positions
- [ ] `PlayerCard` shows injury badges correctly
- [ ] `PlayerCard` supports all three variants
- [ ] `PlayerList` animates with stagger
- [ ] API endpoint requires authentication
- [ ] API endpoint checks if sync is needed first
- [ ] TypeScript compiles without errors

---

## Testing

### Sync Test

```bash
# Check if sync needed
curl http://localhost:3000/api/players/sync

# Trigger sync (requires auth cookie)
curl -X POST http://localhost:3000/api/players/sync -H "Cookie: ..."
```

### Search Test

```typescript
import { searchPlayers, getPlayersByIds } from '@/lib/sleeper'

// Test 1: Name search
const results = await searchPlayers('mahomes')
console.log(results[0]?.full_name) // Patrick Mahomes

// Test 2: Position filter
const qbs = await searchPlayers('', { position: 'QB', limit: 5 })
console.log(qbs.length) // 5

// Test 3: Batch lookup
const map = await getPlayersByIds(['4046', '6794'])
console.log(map.get('4046')?.full_name) // Patrick Mahomes
```

### Component Test

```tsx
// In a test page or Storybook
import { PlayerCard, PlayerList } from '@/components/players'

// Mock player
const mockPlayer = {
  id: '4046',
  full_name: 'Patrick Mahomes',
  first_name: 'Patrick',
  last_name: 'Mahomes',
  team: 'KC',
  position: 'QB',
  age: 28,
  years_exp: 7,
  status: 'Active',
  injury_status: null,
  // ... other fields
}

<PlayerCard player={mockPlayer} variant="default" />
<PlayerCard player={mockPlayer} variant="compact" />
<PlayerCard player={mockPlayer} variant="detailed" showStats />
```

---

## Notes

### Sync Strategy

Player sync is expensive (7MB download, thousands of upserts). Strategy:
1. Check `shouldSyncPlayers()` before syncing
2. Sync only when cache is >24h stale or empty
3. Consider scheduling weekly sync via cron (Vercel/Supabase cron)

### Future Improvements

- Add player photos from Sleeper CDN
- Implement player autocomplete/typeahead
- Add player comparison view
- Cache player search results in memory

### Position Colors

Colors match fantasy football conventions:
- **QB** - Red (signal caller, primary)
- **RB** - Green (ground game)
- **WR** - Blue (passing game)
- **TE** - Yellow (hybrid)
- **K** - Purple (specialist)
- **DEF** - Orange (team defense)

---

## Related Plans

- **Previous:** [phase-1-impl-03-connect-league.md](./phase-1-impl-03-connect-league.md)
- **Next:** [phase-1-impl-05-dashboard-data.md](./phase-1-impl-05-dashboard-data.md)
- **Used by:** Roster display, Draft assistant (Phase 2), Trade calculator (Phase 3)
