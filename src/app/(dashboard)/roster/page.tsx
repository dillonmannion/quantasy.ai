import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { getCachedLeague, getCachedRosters, getNFLState } from '@/lib/sleeper'
import { RosterOptimizerClient } from './roster-optimizer-client'

export default async function RosterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const { data: userLeagues } = await supabase
    .from('user_leagues')
    .select('league_id')
    .eq('user_id', user.id)
    .limit(1)
  
  const typedUserLeagues = userLeagues as { league_id: string }[] | null
  
  if (!typedUserLeagues || typedUserLeagues.length === 0) {
    redirect('/connect')
  }
  
  const leagueId = typedUserLeagues[0].league_id
  
  const league = await getCachedLeague(leagueId)
  const rosters = await getCachedRosters(leagueId)
  
  const nflState = await getNFLState()
  const currentWeek = nflState.week || 1
  
  const userRoster = rosters.find(
    (roster) => roster.owner_id === user.id
  )
  
  if (!userRoster) {
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
        rosterId={userRoster.roster_id}
        currentWeek={currentWeek}
      />
    </PageContainer>
  )
}
