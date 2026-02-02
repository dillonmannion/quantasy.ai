import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findTradePartners } from '@/lib/algorithms/trade-partners'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const leagueId = searchParams.get('leagueId')
  const rosterIdParam = searchParams.get('rosterId')

  if (!leagueId || !rosterIdParam) {
    return NextResponse.json(
      { error: 'Missing required parameters: leagueId, rosterId' },
      { status: 400 }
    )
  }

  const rosterId = parseInt(rosterIdParam, 10)
  if (isNaN(rosterId)) {
    return NextResponse.json(
      { error: 'Invalid rosterId' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await findTradePartners({
    leagueId,
    rosterId,
    userId: user.id
  })

  if (result.error) {
    const status = result.error.includes('not found') ? 404 : 500
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json(result)
}
