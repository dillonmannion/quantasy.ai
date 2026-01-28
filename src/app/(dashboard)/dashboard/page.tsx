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
import { LeagueCard } from './league-card'

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userLeagues } = await supabase
    .from('user_leagues')
    .select('league_id, roster_id')
    .eq('user_id', user?.id ?? '')

  const typedUserLeagues = userLeagues as
    | { league_id: string; roster_id: number | null }[]
    | null
  const hasLeagues = typedUserLeagues && typedUserLeagues.length > 0

  let leagueData = null
  let rosterData = null
  let userRoster = null

  if (hasLeagues) {
    try {
      const leagueId = typedUserLeagues[0].league_id
      const rosterId = typedUserLeagues[0].roster_id

      leagueData = await getCachedLeague(leagueId)
      rosterData = await getCachedRosters(leagueId)

      if (rosterId) {
        userRoster = rosterData.find((r) => r.roster_id === rosterId) ?? null
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching league data:', error)
    }
  }

  let standing = null
  if (rosterData && userRoster) {
    const sorted = [...rosterData].sort((a, b) => {
      if (b.settings.wins !== a.settings.wins) {
        return b.settings.wins - a.settings.wins
      }
      return (b.settings.fpts ?? 0) - (a.settings.fpts ?? 0)
    })
    standing = sorted.findIndex((r) => r.roster_id === userRoster?.roster_id) + 1
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <FadeIn>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back{user?.email && `, ${user.email.split('@')[0]}`}!
              </h1>
              <p className="text-muted-foreground">
                {hasLeagues
                  ? 'Your fantasy dashboard'
                  : 'Connect a league to get started'}
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
                Connect your Sleeper fantasy league to unlock powerful analysis
                tools and optimize your team all season long.
              </p>
              <Button asChild size="lg">
                <Link href="/connect">Connect Your League</Link>
              </Button>
            </Card>
          </FadeIn>
        )}

        <div>
          <FadeIn delay={0.2}>
            <h2 className="text-xl font-bold mb-4">Analysis Tools</h2>
          </FadeIn>

          <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => {
              const Icon = tool.icon
              const isLocked = !hasLeagues || tool.phase > 1

              return (
                <StaggerItem key={tool.href}>
                  <Link href={isLocked ? '#' : tool.href}>
                    <Card
                      className={`
                      card-balatro p-6 h-full relative
                      ${
                        isLocked
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer hover:border-primary transition-colors'
                      }
                    `}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`
                          w-12 h-12 rounded-lg shrink-0
                          ${tool.bgColor} 
                          flex items-center justify-center
                        `}
                        >
                          <Icon className={`w-6 h-6 ${tool.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <h3 className={`text-lg font-bold mb-1 ${isLocked ? 'text-foreground/80' : ''}`}>{tool.title}</h3>
                           <p className={`text-sm ${isLocked ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                             {tool.description}
                           </p>
                           {isLocked && (
                             <p className="text-xs text-foreground/70 mt-2">
                               {!hasLeagues
                                 ? 'Connect a league first'
                                 : `Coming in Phase ${tool.phase}`}
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
