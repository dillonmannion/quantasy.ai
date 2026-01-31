import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { getNFLState } from '@/lib/sleeper'
import { TradeClient } from './trade-client'
import type { Database } from '@/lib/supabase/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

export default async function TradePage() {
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
  
  const { data: players } = await supabase
    .from('players')
    .select('*')
    
  const allPlayers = (players || []) as PlayerRow[]
  
  return (
    <PageContainer>
      <TradeClient 
        leagueId={leagueId}
        rosterId={rosterId || 0}
        defaultWeek={currentWeek}
        initialPlayers={allPlayers}
      />
    </PageContainer>
  )
}
