import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePickValueForDraft, type PickValueOutput } from '@/lib/algorithms'

interface PickValueRequest {
  draftId: string
  pickNumber?: number
  allPicks?: boolean
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<PickValueOutput | PickValueOutput[] | { error: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as PickValueRequest
  const { draftId, pickNumber, allPicks } = body

  if (!draftId) {
    return NextResponse.json({ error: 'draftId is required' }, { status: 400 })
  }

  try {
    const result = await calculatePickValueForDraft(draftId, pickNumber, allPicks)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[PickValue API]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('No projections')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
