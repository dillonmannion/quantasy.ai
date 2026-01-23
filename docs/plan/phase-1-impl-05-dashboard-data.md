# Implementation Plan 05: Dashboard Data Display

> **Phase:** 1 - Data Layer
> **Complexity:** Low
> **Dependencies:** Plans 01, 02, 03, 04
> **Estimated Time:** 3-4 hours

---

## Objective

Update the dashboard to display real league data from connected Sleeper leagues. Show league overview, user's record/stats, and enable manual data refresh.

---

## Context

### Current Dashboard State

The existing dashboard at `src/app/(dashboard)/dashboard/page.tsx`:
- Shows tool grid (Draft, Roster, Trade, Waivers) - all locked
- Has placeholder "No leagues connected yet" message
- Has disabled "Connect League (Coming Soon)" button

### Target Dashboard State

After implementation:
- Shows connected league overview (name, season, team count)
- Shows user's stats (record, points for/against, roster size)
- Has working "Connect League" link
- Has manual "Refresh" button to force data sync
- Shows "Last synced" timestamp
- Tools remain locked but show appropriate messaging

---

## Files to Modify/Create

### 1. `src/app/(dashboard)/dashboard/page.tsx`

Complete rewrite of dashboard with real data.

```tsx
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/page-container'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { FadeIn } from '@/components/animation/fade-in'
import { getCachedLeague, getCachedRosters } from '@/lib/sleeper'
import { 
  BarChart3, 
  Users, 
  ArrowLeftRight, 
  TrendingUp, 
  Trophy,
  Link as LinkIcon,
} from 'lucide-react'
import Link from 'next/link'
import { RefreshButton } from './refresh-button'
import { LeagueCard } from './league-card'

// Tool definitions
const tools = [
  {
    href: '/draft',
    icon: BarChart3,
    title: 'Draft Assistant',
    description: 'Value-Based Drafting rankings',
    color: 'text-accent',
    bgColor: 'bg-accent/20',
    phase: 2,
  },
  {
    href: '/roster',
    icon: Users,
    title: 'Roster Optimizer',
    description: 'Optimize your starting lineup',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20',
    phase: 3,
  },
  {
    href: '/trade',
    icon: ArrowLeftRight,
    title: 'Trade Calculator',
    description: 'Evaluate trade fairness',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    phase: 3,
  },
  {
    href: '/waivers',
    icon: TrendingUp,
    title: 'Waiver Wire',
    description: 'FAAB and priority optimization',
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    phase: 4,
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's connected leagues
  const { data: userLeagues } = await supabase
    .from('user_leagues')
    .select('league_id, roster_id')
    .eq('user_id', user?.id ?? '')

  const hasLeagues = userLeagues && userLeagues.length > 0

  // Fetch league data if user has leagues
  let leagueData = null
  let rosterData = null
  let userRoster = null

  if (hasLeagues) {
    try {
      const leagueId = userLeagues[0].league_id
      const rosterId = userLeagues[0].roster_id

      leagueData = await getCachedLeague(leagueId)
      rosterData = await getCachedRosters(leagueId)
      
      if (rosterId) {
        userRoster = rosterData.find(r => r.roster_id === rosterId) ?? null
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching league data:', error)
      // Continue rendering without league data
    }
  }

  // Calculate user's standing
  let standing = null
  if (rosterData && userRoster) {
    const sorted = [...rosterData].sort((a, b) => {
      // Sort by wins desc, then points desc
      if (b.settings.wins !== a.settings.wins) {
        return b.settings.wins - a.settings.wins
      }
      return (b.settings.fpts ?? 0) - (a.settings.fpts ?? 0)
    })
    standing = sorted.findIndex(r => r.roster_id === userRoster?.roster_id) + 1
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Header */}
        <FadeIn>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back{user?.email && `, ${user.email.split('@')[0]}`}!
              </h1>
              <p className="text-muted-foreground">
                {hasLeagues ? 'Your fantasy dashboard' : 'Connect a league to get started'}
              </p>
            </div>
            {hasLeagues && (
              <Button asChild variant="outline" size="sm">
                <Link href="/connect">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Add League
                </Link>
              </Button>
            )}
          </div>
        </FadeIn>

        {/* League Overview or Connect CTA */}
        {hasLeagues && leagueData ? (
          <FadeIn delay={0.1}>
            <LeagueCard 
              league={leagueData}
              userRoster={userRoster}
              standing={standing}
              totalTeams={rosterData?.length ?? 0}
            />
          </FadeIn>
        ) : (
          <FadeIn delay={0.1}>
            <Card className="card-balatro p-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-3">No leagues connected</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your Sleeper fantasy league to unlock powerful analysis tools 
                and optimize your team all season long.
              </p>
              <Button asChild size="lg">
                <Link href="/connect">Connect Your League</Link>
              </Button>
            </Card>
          </FadeIn>
        )}

        {/* Tools Grid */}
        <div>
          <FadeIn delay={0.2}>
            <h2 className="text-xl font-bold mb-4">Analysis Tools</h2>
          </FadeIn>
          
          <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => {
              const Icon = tool.icon
              const isLocked = !hasLeagues || tool.phase > 1 // Only Phase 1 tools unlocked

              return (
                <StaggerItem key={tool.href}>
                  <Link href={isLocked ? '#' : tool.href}>
                    <Card className={`
                      card-balatro p-6 h-full relative
                      ${isLocked 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'cursor-pointer hover:border-primary transition-colors'
                      }
                    `}>
                      <div className="flex items-start gap-4">
                        <div className={`
                          w-12 h-12 rounded-lg shrink-0
                          ${tool.bgColor} 
                          flex items-center justify-center
                        `}>
                          <Icon className={`w-6 h-6 ${tool.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold mb-1">{tool.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                          {isLocked && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {!hasLeagues 
                                ? 'Connect a league first' 
                                : `Coming in Phase ${tool.phase}`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </StaggerItem>
              )
            })}
          </StaggerList>
        </div>
      </div>
    </PageContainer>
  )
}
```

### 2. `src/app/(dashboard)/dashboard/league-card.tsx`

Dedicated league overview card component.

```tsx
'use client'

import { Card } from '@/components/ui/card'
import { ScoreCounter } from '@/components/animation/score-counter'
import { RefreshButton } from './refresh-button'
import type { SleeperLeague, SleeperRoster } from '@/lib/sleeper/types'
import { Trophy, TrendingUp, TrendingDown, Users } from 'lucide-react'

interface LeagueCardProps {
  league: SleeperLeague
  userRoster: SleeperRoster | null
  standing: number | null
  totalTeams: number
}

function StatBox({ 
  label, 
  value, 
  subValue,
  icon: Icon,
  color = 'text-foreground',
}: { 
  label: string
  value: string | number
  subValue?: string
  icon?: React.ElementType
  color?: string
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {typeof value === 'number' ? (
          <ScoreCounter value={value} decimals={value % 1 !== 0 ? 1 : 0} duration={0.5} />
        ) : (
          value
        )}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
    </div>
  )
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function LeagueCard({ league, userRoster, standing, totalTeams }: LeagueCardProps) {
  const wins = userRoster?.settings.wins ?? 0
  const losses = userRoster?.settings.losses ?? 0
  const ties = userRoster?.settings.ties ?? 0
  const ptsFor = userRoster?.settings.fpts ?? 0
  const ptsAgainst = userRoster?.settings.fpts_against ?? 0
  const rosterSize = userRoster?.players?.length ?? 0
  
  // Calculate point differential
  const ptsDiff = ptsFor - ptsAgainst
  const ptsDiffColor = ptsDiff > 0 ? 'text-green-400' : ptsDiff < 0 ? 'text-red-400' : 'text-muted-foreground'

  // Format record string
  const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`

  return (
    <Card className="card-balatro p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">{league.name}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{league.season} Season</span>
            <span>•</span>
            <span>{league.total_rosters} Teams</span>
            <span>•</span>
            <span>{formatStatus(league.status)}</span>
          </div>
        </div>
        <RefreshButton leagueId={league.league_id} />
      </div>

      {/* Stats Grid */}
      {userRoster ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            label="Record"
            value={record}
            icon={Trophy}
            color={wins > losses ? 'text-green-400' : wins < losses ? 'text-red-400' : 'text-foreground'}
          />
          
          <StatBox
            label="Standing"
            value={standing ? getOrdinal(standing) : '-'}
            subValue={standing ? `of ${totalTeams}` : undefined}
            icon={Users}
            color={standing && standing <= 3 ? 'text-accent' : 'text-foreground'}
          />
          
          <StatBox
            label="Points For"
            value={ptsFor}
            icon={TrendingUp}
            color="text-green-400"
          />
          
          <StatBox
            label="Points Against"
            value={ptsAgainst}
            icon={TrendingDown}
            color="text-red-400"
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Could not find your roster in this league.</p>
          <p className="text-sm mt-2">
            This can happen if your Sleeper username differs from when you connected.
          </p>
        </div>
      )}

      {/* Point Differential */}
      {userRoster && (
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Point Differential</span>
          <span className={`font-bold ${ptsDiffColor}`}>
            {ptsDiff > 0 ? '+' : ''}{ptsDiff.toFixed(1)}
          </span>
        </div>
      )}
    </Card>
  )
}
```

### 3. `src/app/(dashboard)/dashboard/refresh-button.tsx`

Client component for manual refresh.

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { refreshLeagueData } from './actions'

interface RefreshButtonProps {
  leagueId: string
}

export function RefreshButton({ leagueId }: RefreshButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      await refreshLeagueData(leagueId)
      
      // Refresh the page to show new data
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Refresh error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const loading = isRefreshing || isPending

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={loading}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Refreshing...' : 'Refresh'}
    </Button>
  )
}
```

### 4. `src/app/(dashboard)/dashboard/actions.ts`

Server actions for dashboard operations.

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { 
  invalidateLeagueCache, 
  getCachedLeague, 
  getCachedRosters 
} from '@/lib/sleeper'

/**
 * Force refresh league data from Sleeper API
 */
export async function refreshLeagueData(leagueId: string): Promise<{ success: boolean }> {
  try {
    // Invalidate cache (forces fresh fetch)
    await invalidateLeagueCache(leagueId)
    
    // Fetch fresh data
    await getCachedLeague(leagueId)
    await getCachedRosters(leagueId)
    
    // Revalidate the dashboard page
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error) {
    console.error('[Dashboard] Refresh error:', error)
    return { success: false }
  }
}
```

---

## Success Criteria

- [ ] Dashboard shows league name and season
- [ ] Dashboard shows user's W-L(-T) record
- [ ] Dashboard shows user's standing (1st, 2nd, etc.)
- [ ] Dashboard shows Points For and Points Against
- [ ] Dashboard shows point differential with color coding
- [ ] Refresh button forces fresh data fetch
- [ ] Refresh button shows loading state
- [ ] "No leagues" state shows connect CTA
- [ ] "Add League" button visible when leagues exist
- [ ] Tools show appropriate locked/unlocked state
- [ ] ScoreCounter animates on first load
- [ ] Mobile layout works correctly
- [ ] TypeScript compiles without errors

---

## Testing

### With Connected League

1. Connect a league via `/connect` flow
2. Navigate to `/dashboard`
3. Verify league card shows correct data
4. Click Refresh and verify data updates
5. Check mobile responsive layout

### Without Connected League

1. Fresh user with no leagues
2. Navigate to `/dashboard`
3. See "No leagues connected" state
4. "Connect Your League" button works
5. Tools all show "Connect a league first"

### Edge Cases

1. **User not in league roster**: Should show helpful message
2. **Network error on refresh**: Should not crash
3. **Missing stats**: Should handle nulls gracefully

### Manual Verification

After testing, verify in Supabase:
- `leagues.cached_at` updates on refresh
- `rosters.cached_at` updates on refresh

---

## Notes

### Stats Calculations

- **Standing**: Calculated client-side by sorting rosters by wins (desc), then points (desc)
- **Point Differential**: Simple subtraction, color-coded (green positive, red negative)
- **Record Format**: Shows ties only if > 0 (e.g., "5-3" not "5-3-0")

### ScoreCounter Animation

The `<ScoreCounter>` component animates numbers on mount. Set `duration={0.5}` for snappy feel without being distracting.

### Multiple Leagues (Future)

Currently shows only the first connected league. Future enhancement:
- League selector dropdown
- Store "active league" in user preferences
- Show league switcher in sidebar

### Revalidation Strategy

Using `revalidatePath('/dashboard')` after refresh ensures:
- Next.js cache is invalidated
- Fresh data appears without full page reload (with `router.refresh()`)

---

## Related Plans

- **Previous:** [phase-1-impl-04-player-sync.md](./phase-1-impl-04-player-sync.md)
- **Overview:** [phase-1-impl-overview.md](./phase-1-impl-overview.md)
- **Next Phase:** [phase-2-draft-assistant.md](./phase-2-draft-assistant.md)
