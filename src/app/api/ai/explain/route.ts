import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { generateExplanation, aiRateLimiter, GROQ_MODEL } from '@/lib/ai'

interface ExplainRequest {
  playerId: string
  leagueId: string
  playerName: string
  position: string
  vbd: number
  projectedPoints: number
  baselinePlayerName: string
  baselinePoints: number
  scoringFormat: string
  scoringSettings: Record<string, number>
  projectionSource: string
  projectionUpdatedAt: string
}

interface ExplainResponse {
  explanation: string
  cached: boolean
  generatedAt: string
}

interface ErrorResponse {
  error: string
  retryAfterMs?: number
}

function computeAICacheKey(params: {
  playerId: string
  leagueId: string
  scoringSettings: Record<string, number>
  projectionSource: string
  projectionUpdatedAt: string
}): string {
  const hashInput = JSON.stringify({
    player_id: params.playerId,
    league_id: params.leagueId,
    scoring_settings: params.scoringSettings,
    projection_source: params.projectionSource,
    projection_updated_at: params.projectionUpdatedAt,
  })
  return crypto.createHash('sha256').update(hashInput).digest('hex')
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExplainResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as ExplainRequest
    const {
      playerId,
      leagueId,
      playerName,
      position,
      vbd,
      projectedPoints,
      baselinePlayerName,
      baselinePoints,
      scoringFormat,
      scoringSettings,
      projectionSource,
      projectionUpdatedAt,
    } = body

    if (
      !playerId ||
      !leagueId ||
      !playerName ||
      !position ||
      vbd === undefined ||
      projectedPoints === undefined ||
      !baselinePlayerName ||
      baselinePoints === undefined ||
      !scoringFormat ||
      !scoringSettings ||
      !projectionSource ||
      !projectionUpdatedAt
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const cacheKeyHash = computeAICacheKey({
      playerId,
      leagueId,
      scoringSettings,
      projectionSource,
      projectionUpdatedAt,
    })

    const { data: existingCache } = await supabase
      .from('algorithm_outputs')
      .select('explanation')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('algorithm_type', 'vbd_explanation')
      .eq('input_params->>player_id', playerId)
      .maybeSingle()

    if (existingCache?.explanation) {
      const explanation = existingCache.explanation as {
        ai_text?: string
        cache_key_hash?: string
        generated_at?: string
      }
      if (
        explanation.cache_key_hash === cacheKeyHash &&
        explanation.ai_text &&
        explanation.generated_at
      ) {
        return NextResponse.json({
          explanation: explanation.ai_text,
          cached: true,
          generatedAt: explanation.generated_at,
        })
      }
    }

    const limitCheck = aiRateLimiter.checkLimit()
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limited', retryAfterMs: limitCheck.retryAfterMs },
        { status: 429 }
      )
    }

    const explanation = await generateExplanation({
      playerName,
      position,
      vbd,
      projectedPoints,
      baselinePlayerName,
      baselinePoints,
      scoringFormat,
    })

    const generatedAt = new Date().toISOString()

    await supabase.from('algorithm_outputs').upsert(
      {
        user_id: user.id,
        league_id: leagueId,
        algorithm_type: 'vbd_explanation',
        input_params: { player_id: playerId },
        output_data: {},
        explanation: {
          ai_text: explanation,
          cache_key_hash: cacheKeyHash,
          generated_at: generatedAt,
          groq_model: GROQ_MODEL,
        },
      },
      {
        onConflict: 'user_id,league_id,algorithm_type,input_params',
      }
    )

    return NextResponse.json({
      explanation,
      cached: false,
      generatedAt,
    })
  } catch (error) {
    console.error('[AI Explain] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `AI explanation failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
