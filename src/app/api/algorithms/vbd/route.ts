import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { calculateVBDForLeague, type VBDForLeagueResult } from '@/lib/algorithms'

interface VBDRequest {
  leagueId: string
  limit?: number
  offset?: number
  positions?: string[]
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VBDForLeagueResult | { error: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as VBDRequest
  const { leagueId, limit, offset, positions } = body

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

   return Sentry.startSpan(
     { op: 'algorithm.vbd', name: 'Calculate VBD Rankings' },
     async () => {
       const { data, error } = await calculateVBDForLeague({
         leagueId,
         limit,
         offset,
         positions,
       })

       if (error) {
         const status = error.includes('not found') ? 404 : error.includes('No projections') ? 400 : 500
         return NextResponse.json({ error }, { status })
       }

       return NextResponse.json(data!)
     }
   )
}
