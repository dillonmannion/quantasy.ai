import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { generateTradeRecommendation, aiRateLimiter, GROQ_MODEL } from '@/lib/ai'

interface TradeRecommendationRequest {
  leagueId: string
  myRosterId: number
  myPlayers: Array<{ playerId: string; name: string; position: string; value: number }>
  targetRosterId: number
  targetPlayers: Array<{ playerId: string; name: string; position: string; value: number }>
  myNeeds: string[]
  theirNeeds: string[]
  scoringFormat: string
}

interface TradeRecommendationResponse {
  recommendation: string
  cached: boolean
  generatedAt: string
}

interface ErrorResponse {
  error: string
  retryAfterMs?: number
}

function computeAICacheKey(params: {
  leagueId: string
  myRosterId: number
  targetRosterId: number
  scoringFormat: string
}): string {
  const hashInput = JSON.stringify({
    league_id: params.leagueId,
    my_roster_id: params.myRosterId,
    target_roster_id: params.targetRosterId,
    scoring_format: params.scoringFormat,
  })
  return crypto.createHash('sha256').update(hashInput).digest('hex')
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<TradeRecommendationResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as TradeRecommendationRequest
    const {
      leagueId,
      myRosterId,
      myPlayers,
      targetRosterId,
      targetPlayers,
      myNeeds,
      theirNeeds,
      scoringFormat,
    } = body

    if (
      !leagueId ||
      myRosterId === undefined ||
      !myPlayers ||
      targetRosterId === undefined ||
      !targetPlayers ||
      !myNeeds ||
      !theirNeeds ||
      !scoringFormat
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const cacheKeyHash = computeAICacheKey({
      leagueId,
      myRosterId,
      targetRosterId,
      scoringFormat,
    })

    const { data: existingCache } = await supabase
      .from('algorithm_outputs')
      .select('explanation')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('algorithm_type', 'trade-recommendation')
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
          recommendation: explanation.ai_text,
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

    const recommendation = await generateTradeRecommendation({
      leagueId,
      myRosterId,
      myPlayers: myPlayers.map((p) => ({
        name: p.name,
        position: p.position,
        value: p.value,
      })),
      targetRosterId,
      targetPlayers: targetPlayers.map((p) => ({
        name: p.name,
        position: p.position,
        value: p.value,
      })),
      myNeeds,
      theirNeeds,
      scoringFormat,
    })

    const generatedAt = new Date().toISOString()

    await supabase.from('algorithm_outputs').upsert(
      {
        user_id: user.id,
        league_id: leagueId,
        algorithm_type: 'trade-recommendation',
        input_params: { my_roster_id: myRosterId, target_roster_id: targetRosterId },
        output_data: {},
        explanation: {
          ai_text: recommendation,
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
      recommendation,
      cached: false,
      generatedAt,
    })
  } catch (error) {
    console.error('[AI Trade Recommendation] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `AI trade recommendation failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
