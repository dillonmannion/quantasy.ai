import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { getNFLState } from '@/lib/sleeper'
import { WaiversClient } from './waivers-client'

export default async function WaiversPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
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
  
  const nflState = await getNFLState()
  const currentWeek = nflState.week || 1
  
  return (
    <PageContainer>
      <WaiversClient 
        leagueId={leagueId}
        rosterId={rosterId || 0}
        defaultWeek={currentWeek}
      />
    </PageContainer>
  )
}
