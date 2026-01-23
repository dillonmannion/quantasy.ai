# Implementation Plan 03: Connect League Flow

> **Phase:** 1 - Data Layer
> **Complexity:** Medium
> **Dependencies:** Plans 01, 02
> **Estimated Time:** 4-6 hours

---

## Objective

Build a multi-step UI wizard for users to connect their Sleeper fantasy leagues. The flow: Enter username -> Display leagues -> Select league -> Confirm & sync.

---

## Context

### Existing Components Available

- `<Card>` - UI card component
- `<Button>` - Button with variants
- `<Input>`, `<Label>` - Form components
- `<Shimmer>` - Loading animation
- `<Kaching>` - Celebration popup
- `<StaggerList>`, `<StaggerItem>` - Animated lists
- `useCelebration` - Hook for triggering Kaching

### User Flow

1. **Enter Username** - User enters their Sleeper username
2. **Select League** - Show list of user's leagues for current season
3. **Syncing** - Show loading state while syncing data
4. **Complete** - Celebrate success, redirect to dashboard

### Data Operations

1. Look up Sleeper user by username
2. Fetch user's leagues for current season
3. Save Sleeper user info to profile
4. Cache league data
5. Cache roster data
6. Create user_leagues association

---

## Files to Create

### 1. `src/app/(dashboard)/connect/page.tsx`

Main connect league page with step wizard.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Shimmer } from '@/components/animation/shimmer'
import { Kaching } from '@/components/animation/kaching'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { FadeIn } from '@/components/animation/fade-in'
import { useCelebration } from '@/hooks/use-celebration'
import { searchSleeperUser, connectLeague } from './actions'
import type { SleeperLeague, SleeperUser } from '@/lib/sleeper/types'
import { ArrowLeft, Users, Trophy, Check, AlertCircle } from 'lucide-react'

type Step = 'username' | 'select' | 'syncing' | 'complete'

interface SearchResult {
  user: SleeperUser
  leagues: SleeperLeague[]
}

export default function ConnectLeaguePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('username')
  const [username, setUsername] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [selectedLeague, setSelectedLeague] = useState<SleeperLeague | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isShowing, value, label, celebrate } = useCelebration(2500)

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await searchSleeperUser(username.trim())
      
      if (!result.success) {
        setError(result.error ?? 'User not found')
        return
      }

      if (!result.user || !result.leagues) {
        setError('User not found')
        return
      }

      setSearchResult({
        user: result.user,
        leagues: result.leagues,
      })
      setStep('select')
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to fetch user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLeague = async (league: SleeperLeague) => {
    if (!searchResult) return
    
    setSelectedLeague(league)
    setStep('syncing')
    setLoading(true)
    setError(null)

    try {
      const result = await connectLeague({
        leagueId: league.league_id,
        sleeperUserId: searchResult.user.user_id,
        sleeperUsername: searchResult.user.username,
        sleeperAvatar: searchResult.user.avatar,
      })
      
      if (!result.success) {
        setError(result.error ?? 'Failed to connect league')
        setStep('select')
        return
      }

      celebrate('Connected!', league.name)
      setStep('complete')
    } catch (err) {
      console.error('Connect error:', err)
      setError('Failed to connect league. Please try again.')
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    if (step === 'select') {
      setStep('username')
      setSearchResult(null)
      setError(null)
    }
  }

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <FadeIn>
          <div>
            <h1 className="text-4xl font-bold mb-2">Connect Your League</h1>
            <p className="text-muted-foreground">
              Link your Sleeper league to unlock all Quantasy tools
            </p>
          </div>
        </FadeIn>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {['username', 'select', 'complete'].map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s || 
                (step === 'syncing' && s === 'select') ||
                (step === 'complete' && i < 2)
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <FadeIn>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Step 1: Enter Username */}
        {step === 'username' && (
          <FadeIn>
            <Card className="card-balatro p-8">
              <form onSubmit={handleSearchUser} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-lg">
                    Sleeper Username
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your Sleeper username"
                    required
                    disabled={loading}
                    className="h-12 text-lg"
                    autoFocus
                    autoComplete="off"
                  />
                  <p className="text-sm text-muted-foreground">
                    This is your username on the Sleeper app, not your email
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || !username.trim()} 
                  className="w-full h-12 text-lg"
                >
                  {loading ? 'Searching...' : 'Find My Leagues'}
                </Button>
              </form>
            </Card>
          </FadeIn>
        )}

        {/* Step 2: Select League */}
        {step === 'select' && searchResult && (
          <div className="space-y-4">
            <FadeIn>
              <Button
                variant="ghost"
                onClick={handleGoBack}
                className="mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Username
              </Button>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="card-balatro p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  {searchResult.user.avatar ? (
                    <img 
                      src={`https://sleepercdn.com/avatars/${searchResult.user.avatar}`}
                      alt={searchResult.user.username}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-bold">{searchResult.user.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    @{searchResult.user.username}
                  </p>
                </div>
                <Check className="w-5 h-5 text-green-500 ml-auto" />
              </Card>
            </FadeIn>

            {searchResult.leagues.length === 0 ? (
              <FadeIn delay={0.2}>
                <Card className="card-balatro p-8 text-center">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No Leagues Found</h3>
                  <p className="text-muted-foreground">
                    No NFL leagues found for this user in the current season.
                    Make sure you're in at least one Sleeper NFL league.
                  </p>
                </Card>
              </FadeIn>
            ) : (
              <StaggerList className="space-y-3">
                <p className="text-sm text-muted-foreground px-1">
                  Select a league to connect ({searchResult.leagues.length} found)
                </p>
                {searchResult.leagues.map((league) => (
                  <StaggerItem key={league.league_id}>
                    <Card
                      className="card-balatro p-5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => handleSelectLeague(league)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold mb-1">{league.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{league.season} Season</span>
                            <span>{league.total_rosters} Teams</span>
                            <span className="capitalize">{league.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </div>
        )}

        {/* Step 3: Syncing */}
        {step === 'syncing' && selectedLeague && (
          <FadeIn>
            <Card className="card-balatro p-12 text-center relative overflow-hidden">
              <Shimmer />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Syncing {selectedLeague.name}...
                </h3>
                <p className="text-muted-foreground">
                  Fetching rosters and league data. This may take a moment.
                </p>
              </div>
            </Card>
          </FadeIn>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && selectedLeague && (
          <FadeIn>
            <Card className="card-balatro p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-2">League Connected!</h3>
              <p className="text-muted-foreground mb-6">
                <span className="font-semibold text-foreground">{selectedLeague.name}</span>
                {' '}is now linked to your Quantasy account.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStep('select')
                    setSelectedLeague(null)
                  }}
                >
                  Connect Another League
                </Button>
              </div>
            </Card>
          </FadeIn>
        )}

        {/* Kaching Celebration */}
        <Kaching
          show={isShowing}
          value={value}
          label={label}
          variant="green"
        />
      </div>
    </PageContainer>
  )
}
```

### 2. `src/app/(dashboard)/connect/actions.ts`

Server actions for search and connect operations.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { 
  getUserByUsername, 
  getUserLeagues, 
  getCurrentSeason,
  getCachedLeague,
  getCachedRosters,
} from '@/lib/sleeper'
import type { SleeperLeague, SleeperUser } from '@/lib/sleeper/types'

interface SearchResult {
  success: boolean
  error?: string
  user?: SleeperUser
  leagues?: SleeperLeague[]
}

interface ConnectParams {
  leagueId: string
  sleeperUserId: string
  sleeperUsername: string
  sleeperAvatar: string | null
}

interface ConnectResult {
  success: boolean
  error?: string
}

/**
 * Search for a Sleeper user and return their leagues
 */
export async function searchSleeperUser(username: string): Promise<SearchResult> {
  try {
    // Look up user
    const sleeperUser = await getUserByUsername(username)
    
    if (!sleeperUser) {
      return { 
        success: false, 
        error: `No Sleeper user found with username "${username}"` 
      }
    }

    // Get current season
    const season = await getCurrentSeason()

    // Get user's NFL leagues
    const leagues = await getUserLeagues(sleeperUser.user_id, season)

    // Filter to only NFL leagues (should already be filtered, but be safe)
    const nflLeagues = leagues.filter(l => l.sport === 'nfl')

    return { 
      success: true, 
      user: sleeperUser,
      leagues: nflLeagues,
    }
  } catch (error) {
    console.error('[Connect] Search user error:', error)
    return { 
      success: false, 
      error: 'Failed to search for user. Please try again.' 
    }
  }
}

/**
 * Connect a league to the current user's account
 */
export async function connectLeague(params: ConnectParams): Promise<ConnectResult> {
  const { leagueId, sleeperUserId, sleeperUsername, sleeperAvatar } = params

  try {
    const supabase = await createClient()
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'You must be logged in to connect a league' }
    }

    // Update user profile with Sleeper info
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        sleeper_user_id: sleeperUserId,
        sleeper_username: sleeperUsername,
        sleeper_avatar: sleeperAvatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('[Connect] Profile update error:', profileError)
      // Don't fail - profile update is nice-to-have
    }

    // Fetch and cache league data
    const league = await getCachedLeague(leagueId)
    
    // Fetch and cache roster data
    const rosters = await getCachedRosters(leagueId)

    // Find user's roster in this league
    const userRoster = rosters.find(r => r.owner_id === sleeperUserId)

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('user_leagues')
      .select('league_id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single()

    if (existingConnection) {
      // Already connected - just update roster_id if needed
      await supabase
        .from('user_leagues')
        .update({ roster_id: userRoster?.roster_id ?? null })
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
    } else {
      // Create new connection
      const { error: connectError } = await supabase
        .from('user_leagues')
        .insert({
          user_id: user.id,
          league_id: leagueId,
          roster_id: userRoster?.roster_id ?? null,
          is_owner: false, // Could determine from league.created_by if needed
        })

      if (connectError) {
        console.error('[Connect] Insert user_league error:', connectError)
        return { success: false, error: 'Failed to save league connection' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Connect] Connect league error:', error)
    return { 
      success: false, 
      error: 'Failed to connect league. Please try again.' 
    }
  }
}
```

### 3. Update Dashboard Link

Add link to connect page in `src/app/(dashboard)/dashboard/page.tsx`.

The current dashboard already has a "Connect League (Coming Soon)" button. Update it to be a working link:

```tsx
// Change this:
<Button variant="outline" disabled>
  Connect League (Coming Soon)
</Button>

// To this:
<Button asChild>
  <Link href="/connect">Connect League</Link>
</Button>
```

---

## Success Criteria

- [ ] Username search finds valid Sleeper users
- [ ] Invalid username shows clear error message
- [ ] User's leagues are displayed with name, season, team count
- [ ] Selecting a league triggers data sync
- [ ] Loading state shows Shimmer animation
- [ ] Success shows Kaching celebration
- [ ] Profile is updated with Sleeper info
- [ ] user_leagues record is created
- [ ] League and roster data is cached
- [ ] User can go back to change username
- [ ] User can connect multiple leagues
- [ ] Works on mobile devices

---

## Testing

### Happy Path Test

1. Go to `/connect`
2. Enter a valid Sleeper username
3. See list of leagues
4. Click a league
5. Wait for sync
6. See success celebration
7. Navigate to dashboard
8. See league data displayed

### Error Cases

1. **Invalid username**: Enter "asdfasdfasdf12345" - should show "User not found"
2. **No leagues**: Find a user with no NFL leagues - should show "No Leagues Found"
3. **Network error**: Disconnect network, try search - should show error message
4. **Already connected**: Connect same league twice - should succeed (update not duplicate)

### Database Verification

After connecting, verify in Supabase:
- `profiles` table has sleeper_user_id, sleeper_username populated
- `leagues` table has the connected league
- `rosters` table has all rosters for that league
- `user_leagues` table has the user-league association

---

## Notes

### Profile Update on Connect

The first time a user connects a league, we also save their Sleeper profile info (user_id, username, avatar) to their Quantasy profile. This is used to:
- Identify the user's roster in their leagues
- Display Sleeper avatar (future feature)
- Link Sleeper identity across multiple leagues

### Multiple Leagues

Users can connect multiple leagues. Each league creates a new `user_leagues` record. The dashboard (Plan 05) will handle displaying multiple leagues or letting users switch between them.

### Season Handling

We use `getCurrentSeason()` from the Sleeper API to automatically get the current NFL season. This handles offseason correctly.

---

## Related Plans

- **Previous:** [phase-1-impl-02-caching-layer.md](./phase-1-impl-02-caching-layer.md)
- **Next:** [phase-1-impl-04-player-sync.md](./phase-1-impl-04-player-sync.md)
- **Uses:** Animation components, useCelebration hook
