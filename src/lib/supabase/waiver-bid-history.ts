import { createClient } from './server'
import type { Database } from './types'

type WaiverBidHistory = Database['public']['Tables']['waiver_bid_history']['Row']
type WaiverBidHistoryInsert = Database['public']['Tables']['waiver_bid_history']['Insert']

/**
 * Insert a new waiver bid history record
 */
export async function insertBidHistory(params: {
  userId: string
  leagueId: string
  week: number
  playerId: string
  recommendedBid: number
  actualBid: number
  won?: boolean
}): Promise<{ data: WaiverBidHistory | null; error: Error | null }> {
  try {
    const supabase = await createClient()

    const insertData: WaiverBidHistoryInsert = {
      user_id: params.userId,
      league_id: params.leagueId,
      week: params.week,
      player_id: params.playerId,
      recommended_bid: params.recommendedBid,
      actual_bid: params.actualBid,
      won: params.won ?? false,
    }

    const { data, error } = await supabase
      .from('waiver_bid_history')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[WaiverBidHistory] Insert error:', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('[WaiverBidHistory] Insert exception:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get all bid history for a user in a specific league
 */
export async function getBidHistoryForLeague(
  userId: string,
  leagueId: string
): Promise<{ data: WaiverBidHistory[]; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('waiver_bid_history')
      .select('*')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[WaiverBidHistory] Get league history error:', error)
      return { data: [], error: new Error(error.message) }
    }

    return { data: data ?? [], error: null }
  } catch (err) {
    console.error('[WaiverBidHistory] Get league history exception:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get all bid history for a user on a specific player
 */
export async function getBidHistoryForPlayer(
  userId: string,
  playerId: string
): Promise<{ data: WaiverBidHistory[]; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('waiver_bid_history')
      .select('*')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[WaiverBidHistory] Get player history error:', error)
      return { data: [], error: new Error(error.message) }
    }

    return { data: data ?? [], error: null }
  } catch (err) {
    console.error('[WaiverBidHistory] Get player history exception:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Update the 'won' status for a bid after waiver processing
 */
export async function updateBidWonStatus(
  bidId: string,
  won: boolean
): Promise<{ data: WaiverBidHistory | null; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('waiver_bid_history')
      .update({ won })
      .eq('id', bidId)
      .select()
      .single()

    if (error) {
      console.error('[WaiverBidHistory] Update won status error:', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('[WaiverBidHistory] Update won status exception:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}
