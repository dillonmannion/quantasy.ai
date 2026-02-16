import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { getCachedLeague, getNFLState } from '@/lib/sleeper'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'

const RosterOptimizerClient = dynamic(
  () => import('./roster-optimizer-client').then((mod) => mod.RosterOptimizerClient),
  { loading: () => <Skeleton className="h-[600px] w-full" /> }
)

export default async function RosterPage() {
  const supabase = await createClient()
  
  const [userResult, nflState] = await Promise.all([
    supabase.auth.getUser(),
    getNFLState()
  ])
  
  const user = userResult.data.user
  
  if (!user) {
    redirect('/login')
  }
  
  const { data: userLeagues } = await supabase
    .from('user_leagues')
    .select('league_id, roster_id')
    .eq('user_id', user.id)
    .limit(1)
  
  const typedUserLeagues = userLeagues as { league_id: string; roster_id: number | null }[] | null
  
  if (!typedUserLeagues || typedUserLeagues.length === 0) {
    redirect('/connect')
  }
  
  const { league_id: leagueId, roster_id: rosterId } = typedUserLeagues[0]
  
  const league = await getCachedLeague(leagueId)
  
  const currentWeek = nflState.week || 1
  
  if (!rosterId) {
    return (
      <PageContainer>
        <div className="card-balatro p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Roster Not Found</h1>
          <p className="text-muted-foreground">
            Could not find your roster in this league. Please check your league connection.
          </p>
        </div>
      </PageContainer>
    )
  }
  
  return (
    <PageContainer>
      <RosterOptimizerClient
        leagueId={leagueId}
        leagueName={league.name}
        rosterId={rosterId}
        currentWeek={currentWeek}
      />
    </PageContainer>
  )
}
