import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { DraftShell } from '@/components/draft/draft-shell'
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
          
          <div className="card-balatro p-8 text-center">
            <p className="text-muted-foreground">
              Rankings component coming in Task 15
            </p>
          </div>
        </div>
      </DraftShell>
    </PageContainer>
  )
}
