import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'

export type AlgorithmType = 'vbd' | 'trade' | 'waivers' | 'lineup'

const DEFAULT_TTL_MS = 60 * 60 * 1000

export interface CacheOptions {
  skipCache?: boolean
  userId?: string
  ttlMs?: number
}

export interface VBDCacheParams {
  leagueId: string
  scoringSettings: Record<string, number>
  rosterPositions: string[]
  totalRosters: number
}

export interface TradeCacheParams {
  leagueId: string
  rosterId: number
  week: number
  givingIds: string[]
  receivingIds: string[]
}

export interface WaiversCacheParams {
  leagueId: string
  rosterId: number
  week: number
  faabBudget?: { total: number; remaining: number }
}

export interface LineupCacheParams {
  leagueId: string
  rosterId: number
  week: number
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex').substring(0, 16)
}

function hashObject(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort()
  const stableString = sortedKeys.map((k) => `${k}:${JSON.stringify(obj[k])}`).join('|')
  return sha256(stableString)
}

export async function getProjectionVersion(): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'projection_version')
    .single()

   if (error) {
     logger.error('AlgorithmCache', 'Error reading projection_version', { error })
     return 1
   }

  const value = data?.value as { version?: number } | null
  return value?.version ?? 1
}

export async function incrementProjectionVersion(): Promise<number> {
  const serviceClient = createServiceClient()

  const { data: current } = await serviceClient
    .from('app_settings')
    .select('value')
    .eq('key', 'projection_version')
    .single()

  const currentVersion = (current?.value as { version?: number })?.version ?? 1
  const newVersion = currentVersion + 1

  const { error } = await serviceClient
    .from('app_settings')
    .update({
      value: { version: newVersion } as never,
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'projection_version')

   if (error) {
     logger.error('AlgorithmCache', 'Error incrementing projection_version', { error })
     throw new Error('Failed to increment projection version')
   }

   logger.info('AlgorithmCache', `Projection version incremented: ${currentVersion} -> ${newVersion}`)
   return newVersion
}

export async function generateVBDCacheKey(params: VBDCacheParams): Promise<string> {
  const version = await getProjectionVersion()
  const scoringHash = hashObject(params.scoringSettings)
  const rosterConfigHash = hashObject({
    roster_positions: params.rosterPositions,
    total_rosters: params.totalRosters,
  })

  return `vbd:${params.leagueId}:${scoringHash}:${rosterConfigHash}:${version}`
}

export async function generateTradeCacheKey(params: TradeCacheParams): Promise<string> {
  const version = await getProjectionVersion()
  const sortedGivingIds = [...params.givingIds].sort().join(',')
  const sortedReceivingIds = [...params.receivingIds].sort().join(',')

  return `trade:${params.leagueId}:${params.rosterId}:${params.week}:${sortedGivingIds}:${sortedReceivingIds}:${version}`
}

export async function generateWaiversCacheKey(params: WaiversCacheParams): Promise<string> {
  const version = await getProjectionVersion()
  const faabHash = params.faabBudget
    ? sha256(JSON.stringify({ total: params.faabBudget.total, remaining: params.faabBudget.remaining }))
    : 'none'

  return `waivers:${params.leagueId}:${params.rosterId}:${params.week}:${faabHash}:${version}`
}

export async function generateLineupCacheKey(params: LineupCacheParams): Promise<string> {
  const version = await getProjectionVersion()
  return `lineup:${params.leagueId}:${params.rosterId}:${params.week}:${version}`
}

interface CacheLookupResult<T> {
  hit: boolean
  data: T | null
  cacheKey: string
}

async function lookupCache<T>(cacheKey: string): Promise<CacheLookupResult<T>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('algorithm_outputs')
    .select('output_data, expires_at')
    .eq('cache_key', cacheKey)
    .single()

  if (error || !data) {
    return { hit: false, data: null, cacheKey }
  }

  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at)
    if (expiresAt <= new Date()) {
      return { hit: false, data: null, cacheKey }
    }
  }

  return {
    hit: true,
    data: data.output_data as T,
    cacheKey,
  }
}

async function writeSharedCache<T>(
  algorithmType: AlgorithmType,
  cacheKey: string,
  leagueId: string,
  inputParams: Record<string, unknown>,
  outputData: T,
  ttlMs: number
): Promise<void> {
  const serviceClient = createServiceClient()
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()

  await serviceClient.from('algorithm_outputs').delete().eq('cache_key', cacheKey)

  const { error } = await serviceClient.from('algorithm_outputs').insert({
    algorithm_type: algorithmType,
    cache_key: cacheKey,
    league_id: leagueId,
    user_id: null,
    input_params: inputParams as never,
    output_data: outputData as never,
    explanation: {} as never,
    expires_at: expiresAt,
  } as never)

   if (error) {
     logger.error('AlgorithmCache', `Error writing shared cache for ${algorithmType}`, { error })
   }
}

async function writeUserCache<T>(
  algorithmType: AlgorithmType,
  cacheKey: string,
  leagueId: string,
  userId: string,
  inputParams: Record<string, unknown>,
  outputData: T,
  ttlMs: number
): Promise<void> {
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()

  await supabase.from('algorithm_outputs').delete().eq('cache_key', cacheKey)

  const { error } = await supabase.from('algorithm_outputs').insert({
    algorithm_type: algorithmType,
    cache_key: cacheKey,
    league_id: leagueId,
    user_id: userId,
    input_params: inputParams as never,
    output_data: outputData as never,
    explanation: {} as never,
    expires_at: expiresAt,
  } as never)

   if (error) {
     logger.error('AlgorithmCache', `Error writing user cache for ${algorithmType}`, { error })
   }
}

export async function getOrComputeAlgorithm<T>(
  type: AlgorithmType,
  cacheKey: string,
  leagueId: string,
  inputParams: Record<string, unknown>,
  computeFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const { skipCache = false, userId, ttlMs = DEFAULT_TTL_MS } = options ?? {}

   if (skipCache) {
     logger.debug('AlgorithmCache', `Skipping cache for ${type} (skipCache=true)`)
     return computeFn()
   }

  const cacheResult = await lookupCache<T>(cacheKey)

   if (cacheResult.hit && cacheResult.data !== null) {
     logger.debug('AlgorithmCache', `Cache HIT for ${type}: ${cacheKey}`)
     return cacheResult.data
   }

   logger.debug('AlgorithmCache', `Cache MISS for ${type}: ${cacheKey}`)

  const result = await computeFn()

  const isSharedCache = type === 'vbd'

  if (isSharedCache) {
    await writeSharedCache(type, cacheKey, leagueId, inputParams, result, ttlMs)
   } else if (userId) {
     await writeUserCache(type, cacheKey, leagueId, userId, inputParams, result, ttlMs)
   } else {
     logger.warn('AlgorithmCache', `User-scoped algorithm ${type} called without userId, skipping cache write`)
   }

  return result
}
