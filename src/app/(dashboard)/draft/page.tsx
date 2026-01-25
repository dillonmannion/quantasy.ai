import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { DraftShell } from '@/components/draft/draft-shell'
import { DraftRankings } from '@/components/draft/draft-rankings'
import { MockDraftControls } from '@/components/draft/mock-draft-controls'
import { MyTeamSidebar } from '@/components/draft/my-team-sidebar'
import { KeeperSection } from '@/components/draft/keeper-section'
import { AuctionBanner } from '@/components/draft/auction-banner'
import { getCachedLeague } from '@/lib/sleeper/cache'
import { getActiveDraft } from '@/lib/sleeper/draft'
import { getLeagueRosters, getAllPlayers } from '@/lib/sleeper'

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
  const league = await getCachedLeague(leagueId)
  const draft = await getActiveDraft(leagueId)
  
  const leagueType = (league.settings as { type?: number }).type ?? 0
  const isAuction = draft?.type === 'auction'
  
  let keepers: string[] = []
  let keeperInfo: Array<{
    playerId: string
    playerName: string
    position: string
    team: string | null
    rosterId: number
    ownerName?: string
  }> = []

  if (leagueType === 1 || leagueType === 2) {
    const rosters = await getLeagueRosters(leagueId)
    const allPlayers = await getAllPlayers()
    
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
  
  const vbdResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/algorithms/vbd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId, limit: 500 }),
    cache: 'no-store'
  })
  
  const vbdData = vbdResponse.ok ? await vbdResponse.json() : { rankings: [] }
  const players = vbdData.rankings || []
  
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
             <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
               <DraftRankings players={players} />
               <MyTeamSidebar />
             </div>
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
