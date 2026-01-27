import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateTradeForLeague, type TradeOutput } from '@/lib/algorithms'

interface TradeRequest {
  leagueId: string
  rosterId: number
  givingPlayerIds: string[]
  receivingPlayerIds: string[]
  week: number
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<TradeOutput | { error: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as TradeRequest
  const { leagueId, rosterId, givingPlayerIds, receivingPlayerIds, week } = body

  // Validate required parameters
  if (!leagueId || rosterId === undefined || !week) {
    return NextResponse.json(
      { error: 'Missing required parameters: leagueId, rosterId, week' },
      { status: 400 }
    )
  }

  // Validate player ID arrays
  if (!givingPlayerIds || !receivingPlayerIds) {
    return NextResponse.json(
      { error: 'Missing required parameters: givingPlayerIds, receivingPlayerIds' },
      { status: 400 }
    )
  }

  if (!Array.isArray(givingPlayerIds) || !Array.isArray(receivingPlayerIds)) {
    return NextResponse.json(
      { error: 'givingPlayerIds and receivingPlayerIds must be arrays' },
      { status: 400 }
    )
  }

  // Validate non-empty arrays
  if (givingPlayerIds.length === 0 || receivingPlayerIds.length === 0) {
    return NextResponse.json(
      { error: 'Trade must include at least one player on each side' },
      { status: 400 }
    )
  }

  // Call orchestrator
  const { data, error } = await calculateTradeForLeague({
    leagueId,
    rosterId,
    givingPlayerIds,
    receivingPlayerIds,
    week,
  })

  // Return response
  if (error) {
    const status = error.includes('not found') ? 404 : error.includes('No projections') ? 400 : 500
    return NextResponse.json({ error }, { status })
  }

  return NextResponse.json(data!)
}
