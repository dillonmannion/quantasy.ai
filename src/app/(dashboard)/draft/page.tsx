import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { DraftShell } from '@/components/draft/draft-shell'
import { RankingsList } from '@/components/draft/rankings-list'
import { getCachedLeague } from '@/lib/sleeper/cache'
import { getActiveDraft } from '@/lib/sleeper/draft'

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
  
  const keepers: string[] = []
  
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
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Draft Assistant</h1>
              <p className="text-muted-foreground">
                {league.name} - {draft?.status === 'drafting' ? 'Live Draft' : 'Mock Draft'}
              </p>
            </div>
          </div>
          
          {players.length > 0 ? (
            <RankingsList players={players} />
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
