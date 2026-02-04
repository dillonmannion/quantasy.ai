import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const FeedbackSchema = z.object({
  feature: z.enum(['draft', 'roster', 'trade', 'waivers', 'other']),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional(),
})

interface FeedbackResponse {
  id: string
}

interface ErrorResponse {
  error: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<FeedbackResponse | ErrorResponse>> {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate body
    const body = await request.json()
    const validatedData = FeedbackSchema.parse(body)

    // 3. Rate limiting check (query last 24h, count submissions)
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString()
    const { count } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo)

    if (count && count >= 10) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 submissions per day.' },
        { status: 429 }
      )
    }

    // 4. Insert feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        feature: validatedData.feature,
        rating: validatedData.rating,
        text: validatedData.text || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[FeedbackAPI] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[FeedbackAPI] Validation error:', error.issues)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    console.error('[FeedbackAPI] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
