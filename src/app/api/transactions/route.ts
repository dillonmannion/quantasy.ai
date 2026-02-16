import { NextRequest, NextResponse } from 'next/server'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getLeagueTransactions, getNFLState, getAllPlayers } from '@/lib/sleeper'
import type { SleeperTransaction, SleeperPlayer } from '@/lib/sleeper'

/**
 * Request-level deduplication for transactions
 * Multiple calls with same params in a single render pass execute once
 */
const getCachedTransactions = cache(
  async (leagueId: string, week: number): Promise<SleeperTransaction[]> => {
    return getLeagueTransactions(leagueId, week)
  }
)

/**
 * Request-level deduplication for players
 * Multiple calls in a single render pass execute once
 */
const getCachedPlayers = cache(async () => {
  return getAllPlayers()
})

interface ResolvedPlayer extends Partial<SleeperPlayer> {
  rosterId: number
  name: string
  full_name: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const leagueId = searchParams.get('leagueId')

  if (!leagueId) {
    return NextResponse.json(
      { error: 'Missing required parameter: leagueId' },
      { status: 400 }
    )
  }

  try {
    let week: number
    const weekParam = searchParams.get('week')
    
    if (weekParam) {
      week = parseInt(weekParam, 10)
      if (isNaN(week) || week < 1 || week > 18) {
        return NextResponse.json(
          { error: 'Invalid week parameter. Must be between 1 and 18.' },
          { status: 400 }
        )
      }
    } else {
      const nflState = await getNFLState()
      week = nflState.week
    }

    const [transactions, players] = await Promise.all([
      getCachedTransactions(leagueId, week),
      getCachedPlayers(),
    ])

    const transactionsWithNames = transactions.map((transaction) => {
      const resolvedAdds: Record<string, ResolvedPlayer> = {}
      const resolvedDrops: Record<string, ResolvedPlayer> = {}

      if (transaction.adds) {
        for (const [playerId, rosterId] of Object.entries(transaction.adds)) {
          const player = players[playerId]
          resolvedAdds[playerId] = {
            ...player,
            rosterId,
            name: player?.full_name ?? `Unknown Player (${playerId})`,
            full_name: player?.full_name ?? `Unknown Player (${playerId})`,
          }
        }
      }

      if (transaction.drops) {
        for (const [playerId, rosterId] of Object.entries(transaction.drops)) {
          const player = players[playerId]
          resolvedDrops[playerId] = {
            ...player,
            rosterId,
            name: player?.full_name ?? `Unknown Player (${playerId})`,
            full_name: player?.full_name ?? `Unknown Player (${playerId})`,
          }
        }
      }

      return {
        ...transaction,
        resolved_adds: Object.keys(resolvedAdds).length > 0 ? resolvedAdds : null,
        resolved_drops: Object.keys(resolvedDrops).length > 0 ? resolvedDrops : null,
      }
    })

    return NextResponse.json({
      transactions: transactionsWithNames,
      week,
    })
  } catch (error) {
    console.error('[Transactions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
