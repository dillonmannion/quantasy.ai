'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function PosthogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    
    // Privacy-first: respect user preferences
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dnt = navigator.doNotTrack === '1'
    
    if (key && !reducedMotion && !dnt) {
      posthog.init(key, {
        api_host: 'https://app.posthog.com',
        capture_pageview: false, // Manual page view tracking
        autocapture: false, // Explicit event tracking only
        disable_session_recording: true, // Privacy-first: no session recording
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug()
          }
        },
      })
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}

/**
 * Hook for automatic page view tracking in App Router
 * Usage: Call in layout.tsx or page.tsx components
 */
export function usePosthogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      const url = `${pathname}${searchParams ? `?${searchParams}` : ''}`
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])
}
