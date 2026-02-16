import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWaiversForLeague, type WaiverOutput } from '@/lib/algorithms'

interface WaiverRequest {
  leagueId: string
  rosterId: number
  week: number
  faabBudget?: {
    total: number
    remaining: number
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<WaiverOutput | { error: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as WaiverRequest
  const { leagueId, rosterId, week, faabBudget } = body

  // Validate leagueId
  if (!leagueId || typeof leagueId !== 'string') {
    return NextResponse.json(
      { error: 'leagueId is required and must be a string' },
      { status: 400 }
    )
  }

  // Validate rosterId
  if (
    rosterId === undefined ||
    typeof rosterId !== 'number' ||
    !Number.isInteger(rosterId) ||
    rosterId < 1
  ) {
    return NextResponse.json(
      { error: 'rosterId is required and must be a positive integer' },
      { status: 400 }
    )
  }

  // Validate week
  if (
    week === undefined ||
    typeof week !== 'number' ||
    !Number.isInteger(week) ||
    week < 1 ||
    week > 18
  ) {
    return NextResponse.json(
      { error: 'week is required and must be an integer between 1-18' },
      { status: 400 }
    )
  }

  // Validate faabBudget (if present)
  if (faabBudget !== undefined) {
    if (typeof faabBudget !== 'object' || faabBudget === null) {
      return NextResponse.json(
        {
          error:
            'faabBudget must be an object with total and remaining fields',
        },
        { status: 400 }
      )
    }

    if (
      typeof faabBudget.total !== 'number' ||
      typeof faabBudget.remaining !== 'number'
    ) {
      return NextResponse.json(
        {
          error:
            'faabBudget.total and faabBudget.remaining must be numbers',
        },
        { status: 400 }
      )
    }

    if (faabBudget.total < 0 || faabBudget.remaining < 0) {
      return NextResponse.json(
        { error: 'faabBudget values must be non-negative' },
        { status: 400 }
      )
    }

    if (faabBudget.remaining > faabBudget.total) {
      return NextResponse.json(
        { error: 'faabBudget.remaining cannot exceed total' },
        { status: 400 }
      )
    }
  }

  // Call orchestrator
  const { data, error } = await calculateWaiversForLeague({
    leagueId,
    rosterId,
    week,
    faabBudget,
    userId: user.id,
  })

  // Return response
  if (error) {
    const status = error.includes('not found') ? 404 : 500
    return NextResponse.json({ error }, { status })
  }

  return NextResponse.json(data!)
}
