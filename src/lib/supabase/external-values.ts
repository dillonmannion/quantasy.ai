import { createClient } from './server'
import type { Database } from './types'

type ExternalPlayerValue = Database['public']['Tables']['player_external_values']['Row']
type ExternalPlayerValueInsert = Database['public']['Tables']['player_external_values']['Insert']

export async function getExternalValuesForPlayer(
  sleeperId: string
): Promise<{ data: ExternalPlayerValue[]; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('player_external_values')
      .select('*')
      .eq('sleeper_id', sleeperId)
      .order('source', { ascending: true })

    if (error) {
      console.error('[ExternalValues] Get player values error:', error)
      return { data: [], error: new Error(error.message) }
    }

    return { data: data ?? [], error: null }
  } catch (err) {
    console.error('[ExternalValues] Get player values exception:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

export async function getExternalValuesForPlayers(
  sleeperIds: string[]
): Promise<{ data: Record<string, ExternalPlayerValue[]>; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('player_external_values')
      .select('*')
      .in('sleeper_id', sleeperIds)
      .order('source', { ascending: true })

    if (error) {
      console.error('[ExternalValues] Get players values error:', error)
      return { data: {}, error: new Error(error.message) }
    }

    const grouped = (data ?? []).reduce(
      (acc, value) => {
        if (!acc[value.sleeper_id]) {
          acc[value.sleeper_id] = []
        }
        acc[value.sleeper_id].push(value)
        return acc
      },
      {} as Record<string, ExternalPlayerValue[]>
    )

    return { data: grouped, error: null }
  } catch (err) {
    console.error('[ExternalValues] Get players values exception:', err)
    return {
      data: {},
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

export async function upsertExternalValues(
  values: ExternalPlayerValueInsert[]
): Promise<{ error: Error | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('player_external_values')
      .upsert(values, {
        onConflict: 'sleeper_id,source',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error('[ExternalValues] Upsert error:', error)
      return { error: new Error(error.message) }
    }

    return { error: null }
  } catch (err) {
    console.error('[ExternalValues] Upsert exception:', err)
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}
