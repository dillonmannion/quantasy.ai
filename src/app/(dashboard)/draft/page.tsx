import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { DraftShell } from '@/components/draft/draft-shell'
import { DraftViewTabs } from '@/components/draft/draft-view-tabs'
import { MockDraftControls } from '@/components/draft/mock-draft-controls'
import { KeeperSection } from '@/components/draft/keeper-section'
import { getActiveDraft } from '@/lib/sleeper/draft'
import { getLeagueRosters, getDedupedPlayers, getDedupedLeague } from '@/lib/sleeper'
import { calculateVBDForLeague } from '@/lib/algorithms'

export default async function DraftPage() {
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
  
  // Phase A: Parallel fetch league + draft + players
  const [league, draft, allPlayers] = await Promise.all([
    getDedupedLeague(leagueId),
    getActiveDraft(leagueId),
    getDedupedPlayers(),
  ])
  
  // Phase B: Determine keeper status, conditionally fetch rosters
  const leagueType = (league.settings as { type?: number }).type ?? 0
  const isAuction = draft?.type === 'auction'
  const isKeeperLeague = leagueType === 1 || leagueType === 2
  
  let keepers: string[] = []
  let keeperInfo: Array<{
    playerId: string
    playerName: string
    position: string
    team: string | null
    rosterId: number
    ownerName?: string
  }> = []

  if (isKeeperLeague) {
    const rosters = await getLeagueRosters(leagueId)
    
    keepers = rosters.flatMap(roster => roster.keepers ?? [])
    
    keeperInfo = rosters.flatMap(roster => 
      (roster.keepers ?? []).map(playerId => {
        const player = allPlayers[playerId]
        return {
          playerId,
          playerName: player?.full_name || 'Unknown Player',
          position: player?.position || 'N/A',
          team: player?.team || null,
          rosterId: roster.roster_id,
          ownerName: undefined
        }
      })
    )
  }
  
  // Pass prefetched data to VBD to avoid N+1 fetches
  const { data: vbdData } = await calculateVBDForLeague({
    leagueId,
    limit: 500,
    prefetchedLeague: league,
    prefetchedPlayers: allPlayers,
    skipCache: draft?.status === 'drafting',
  })
  const players = vbdData?.rankings || []
  
  return (
    <PageContainer>
      <DraftShell
        keepers={keepers}
        draftId={draft?.draft_id}
        status={draft?.status || 'mock'}
        isAuction={isAuction}
      >
         <div className="space-y-6">
           <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Draft Assistant</h1>
                <p className="text-muted-foreground">
                  {league.name} - {draft?.status === 'drafting' ? 'Live Draft' : 'Mock Draft'}
                </p>
              </div>
              <MockDraftControls />
            </div>

            {(leagueType === 1 || leagueType === 2) && (
              <KeeperSection keepers={keeperInfo} leagueType={leagueType} />
            )}
          
           {players.length > 0 ? (
             <DraftViewTabs players={players} />
           ) : (
             <div className="card-balatro p-8 text-center">
               <p className="text-muted-foreground">
                 No rankings available. Upload projections to get started.
               </p>
             </div>
           )}
        </div>
      </DraftShell>
    </PageContainer>
  )
}
