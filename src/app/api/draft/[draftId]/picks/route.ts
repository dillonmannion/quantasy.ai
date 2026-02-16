import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDraftPicks } from '@/lib/sleeper/draft'
import { isSleeperAPIError } from '@/lib/sleeper/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { draftId } = await params

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 })
    }

    const picks = await getDraftPicks(draftId)

    return NextResponse.json({ picks })
  } catch (error) {
    console.error('[API] Draft picks fetch error:', error)

    if (isSleeperAPIError(error)) {
      if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
      }
      if (error.statusCode === 429) {
        return NextResponse.json(
          { error: 'Rate limited', retryAfterMs: 5000 },
          { status: 429 }
        )
      }
    }

    const isNetworkError = error instanceof Error && error.message.includes('fetch')
    if (isNetworkError) {
      return NextResponse.json(
        { error: 'Upstream service unavailable' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch draft picks' },
      { status: 500 }
    )
  }
}
