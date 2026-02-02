import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateTradeForLeague, type TradeOutput } from '@/lib/algorithms'
import type { TradeableAsset } from '@/lib/algorithms/types'

interface TradeRequest {
  leagueId: string
  rosterId: number
  givingPlayerIds?: string[] // Legacy
  receivingPlayerIds?: string[] // Legacy
  giving?: TradeableAsset[]
  receiving?: TradeableAsset[]
  week: number
  format?: 'dynasty' | 'redraft'
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
  const { leagueId, rosterId, week, format } = body

  // Validate required parameters
  if (!leagueId || rosterId === undefined || !week) {
    return NextResponse.json(
      { error: 'Missing required parameters: leagueId, rosterId, week' },
      { status: 400 }
    )
  }

  // Normalize input to TradeableAsset[]
  let giving: TradeableAsset[] = []
  let receiving: TradeableAsset[] = []

  if (body.giving && body.receiving) {
    giving = body.giving
    receiving = body.receiving
  } else if (body.givingPlayerIds && body.receivingPlayerIds) {
    // Backward compatibility - will be handled by calculateTradeForLeague if we pass legacy IDs
    // But we prefer to normalize here if possible, or just pass everything to orchestrator
  } else {
    return NextResponse.json(
      { error: 'Missing required parameters: giving/receiving or givingPlayerIds/receivingPlayerIds' },
      { status: 400 }
    )
  }

  // Validate non-empty
  if ((giving.length === 0 && (!body.givingPlayerIds || body.givingPlayerIds.length === 0)) ||
      (receiving.length === 0 && (!body.receivingPlayerIds || body.receivingPlayerIds.length === 0))) {
    return NextResponse.json(
      { error: 'Trade must include at least one asset on each side' },
      { status: 400 }
    )
  }

  // Call orchestrator
  const { data, error } = await calculateTradeForLeague({
    leagueId,
    rosterId,
    givingPlayerIds: body.givingPlayerIds || [],
    receivingPlayerIds: body.receivingPlayerIds || [],
    giving,
    receiving,
    week,
    userId: user.id,
    format: format || 'dynasty'
  })

  // Return response
  if (error) {
    const status = error.includes('not found') ? 404 : error.includes('No projections') ? 400 : 500
    return NextResponse.json({ error }, { status })
  }

  return NextResponse.json(data!)
}
