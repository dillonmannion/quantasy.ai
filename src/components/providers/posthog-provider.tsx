'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function PosthogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!posthog.__loaded) return

    const dnt = navigator.doNotTrack === '1'
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (dnt || reducedMotion) {
      posthog.opt_out_capturing()
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}

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
