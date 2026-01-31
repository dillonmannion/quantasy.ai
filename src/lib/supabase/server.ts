import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isDevModeEnabled, getDevUser } from '@/lib/dev-mode'
import type { Database } from './types'

function createDevClient() {
  const devUser = getDevUser()
  
  const mockResponse = {
    data: null,
    error: null,
    count: null,
  }
  
  const mockChain = {
    select: () => mockChain,
    insert: () => mockChain,
    update: () => mockChain,
    delete: () => mockChain,
    upsert: () => mockChain,
    eq: () => mockChain,
    neq: () => mockChain,
    gt: () => mockChain,
    gte: () => mockChain,
    lt: () => mockChain,
    lte: () => mockChain,
    like: () => mockChain,
    ilike: () => mockChain,
    is: () => mockChain,
    in: () => mockChain,
    contains: () => mockChain,
    containedBy: () => mockChain,
    rangeGt: () => mockChain,
    rangeGte: () => mockChain,
    rangeLt: () => mockChain,
    rangeLte: () => mockChain,
    rangeAdjacent: () => mockChain,
    overlaps: () => mockChain,
    textSearch: () => mockChain,
    match: () => mockChain,
    not: () => mockChain,
    or: () => mockChain,
    filter: () => mockChain,
    limit: () => mockChain,
    offset: () => mockChain,
    order: () => mockChain,
    single: async () => mockResponse,
    maybeSingle: async () => mockResponse,
    data: null,
    error: null,
    count: null,
  } as unknown as ReturnType<typeof createServerClient<Database>>['from']
  
  return {
    auth: {
      getUser: async () => ({
        data: { user: devUser },
        error: null,
      }),
      exchangeCodeForSession: async () => mockResponse,
      verifyOtp: async () => mockResponse,
    },
    from: () => mockChain,
  } as unknown as ReturnType<typeof createServerClient<Database>>
}

export async function createClient() {
  if (isDevModeEnabled()) {
    return createDevClient()
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component - can't set cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Component - can't remove cookies
          }
        },
      },
    }
  )
}
