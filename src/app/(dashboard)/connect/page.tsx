'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/error-alert'
import { Shimmer } from '@/components/animation/shimmer'
import { Kaching } from '@/components/animation/kaching'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { FadeIn } from '@/components/animation/fade-in'
import { useCelebration } from '@/hooks/use-celebration'
import { searchSleeperUser, connectLeague } from './actions'
import type { SleeperLeague, SleeperUser } from '@/lib/sleeper/types'
import { ArrowLeft, Users, Trophy, Check } from 'lucide-react'
import Image from 'next/image'

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
    } catch {
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
    } catch {
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
        <FadeIn>
          <div>
            <h1 className="text-4xl font-bold mb-2">Connect Your League</h1>
            <p className="text-muted-foreground">
              Link your Sleeper league to unlock all Quantasy tools
            </p>
          </div>
        </FadeIn>

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

        {error && (
          <FadeIn>
            <ErrorAlert message={error} />
          </FadeIn>
        )}

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
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your Sleeper username"
                    required
                    disabled={loading}
                    className="h-12 text-lg"
                    autoFocus
                    autoComplete="username"
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

        {step === 'select' && searchResult && (
          <div className="space-y-4">
            <FadeIn>
              <Button variant="ghost" onClick={handleGoBack} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Username
              </Button>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="card-balatro p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  {searchResult.user.avatar ? (
                    <Image
                      src={`https://sleepercdn.com/avatars/${searchResult.user.avatar}`}
                      alt={searchResult.user.username}
                      width={48}
                      height={48}
                      className="rounded-full"
                      unoptimized
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
                    Make sure you&apos;re in at least one Sleeper NFL league.
                  </p>
                </Card>
              </FadeIn>
            ) : (
              <StaggerList className="space-y-3">
                <p className="text-sm text-muted-foreground px-1">
                  Select a league to connect ({searchResult.leagues.length}{' '}
                  found)
                </p>
                {searchResult.leagues.map((league) => (
                  <StaggerItem key={league.league_id}>
                    <Card
                      role="button"
                      tabIndex={0}
                      aria-label={`Connect ${league.name}`}
                      className="card-balatro p-5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => handleSelectLeague(league)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelectLeague(league)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold mb-1">
                            {league.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{league.season} Season</span>
                            <span>{league.total_rosters} Teams</span>
                            <span className="capitalize">
                              {league.status.replace('_', ' ')}
                            </span>
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

        {step === 'complete' && selectedLeague && (
          <FadeIn>
            <Card className="card-balatro p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-2">League Connected!</h3>
              <p className="text-muted-foreground mb-6">
                <span className="font-semibold text-foreground">
                  {selectedLeague.name}
                </span>{' '}
                is now linked to your Quantasy account.
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
