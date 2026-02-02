import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateLineupForWeek, type LineupOutput } from '@/lib/algorithms'

interface LineupRequest {
  leagueId: string
  rosterId: number
  week: number
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<LineupOutput | { error: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as LineupRequest
  const { leagueId, rosterId, week } = body

  if (!leagueId || rosterId === undefined || !week) {
    return NextResponse.json(
      { error: 'Missing required parameters: leagueId, rosterId, week' },
      { status: 400 }
    )
  }

  if (typeof rosterId !== 'number') {
    return NextResponse.json({ error: 'rosterId must be a number' }, { status: 400 })
  }

  if (typeof week !== 'number' || week < 1 || week > 18) {
    return NextResponse.json(
      { error: 'week must be a number between 1 and 18' },
      { status: 400 }
    )
  }

  const { data, error } = await calculateLineupForWeek({
    leagueId,
    rosterId,
    week,
    userId: user.id,
  })

  if (error) {
    const status = error.includes('not found') ? 404 : 500
    return NextResponse.json({ error }, { status })
  }

  return NextResponse.json(data!)
}
