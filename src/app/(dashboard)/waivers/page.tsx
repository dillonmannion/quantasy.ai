import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { getNFLState } from '@/lib/sleeper'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'

const WaiversClient = dynamic(
  () => import('./waivers-client').then((mod) => mod.WaiversClient),
  { loading: () => <Skeleton className="h-[600px] w-full" /> }
)

export default async function WaiversPage() {
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
  
  if (!userLeagues || userLeagues.length === 0) {
    redirect('/connect')
  }
  
  const { league_id: leagueId, roster_id: rosterId } = userLeagues[0]
  
  const currentWeek = nflState.week || 1
  
  return (
    <PageContainer>
      <WaiversClient 
        leagueId={leagueId}
        rosterId={rosterId || 0}
        defaultWeek={currentWeek}
        initialRecommendations={null}
      />
    </PageContainer>
  )
}
