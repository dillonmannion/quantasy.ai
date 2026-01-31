import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { getNFLState } from '@/lib/sleeper'
import { TradeClient } from './trade-client'

interface RosterPlayer {
  id: string
  full_name: string | null
  position: string | null
  team: string | null
  projected_points: number | null
}

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
  
  const { data: rosters } = await supabase
    .from('rosters')
    .select('players')
    .eq('league_id', leagueId)
    .eq('roster_id', rosterId ?? 0)
    .single()
  
  const rosterPlayerIds: string[] = (rosters?.players as string[]) || []
  
  let rosterPlayers: RosterPlayer[] = []
  if (rosterPlayerIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('id, full_name, position, team, projected_points')
      .in('id', rosterPlayerIds)
    
    rosterPlayers = (players || []) as RosterPlayer[]
  }
  
  const nflState = await getNFLState()
  const currentWeek = nflState.week || 1
  
  return (
    <PageContainer>
      <TradeClient 
        leagueId={leagueId}
        rosterId={rosterId || 0}
        defaultWeek={currentWeek}
        initialRosterPlayers={rosterPlayers}
      />
    </PageContainer>
  )
}
