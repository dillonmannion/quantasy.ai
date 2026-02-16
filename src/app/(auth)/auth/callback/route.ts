import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Allowlist of valid redirect paths after OAuth callback
const ALLOWED_REDIRECTS = [
  '/dashboard',
  '/draft',
  '/roster',
  '/trade',
  '/waivers',
  '/connect',
] as const

/**
 * Validates redirect path to prevent open redirect attacks.
 * Rejects absolute URLs and paths not in allowlist.
 */
function isValidRedirect(path: string | null): string {
  if (!path) return '/dashboard'

  // Reject absolute URLs (http://, https://)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return '/dashboard'
  }

  // Check if path is in allowlist
  if (ALLOWED_REDIRECTS.includes(path as typeof ALLOWED_REDIRECTS[number])) {
    return path
  }

  // Default fallback for any other path
  return '/dashboard'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = isValidRedirect(searchParams.get('next'))

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
