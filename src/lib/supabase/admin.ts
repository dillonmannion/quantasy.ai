import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './types'

let cachedClient: SupabaseClient<Database> | null = null

/**
 * Creates a Supabase client with service role credentials for admin operations.
 * This is a synchronous function that returns a cached client instance.
 *
 * @returns {SupabaseClient<Database>} Supabase client with service role auth
 * @throws {Error} If SUPABASE_SERVICE_ROLE_KEY environment variable is missing
 */
export function createServiceClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for admin operations')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return cachedClient
}
