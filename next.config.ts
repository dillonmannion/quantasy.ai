import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: { cacheName: 'static-assets' }
      },
      {
        urlPattern: /\/api\/players\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'player-data', networkTimeoutSeconds: 5 }
      },
      {
        urlPattern: /\/api\/draft\/.*/i,
        handler: 'NetworkOnly'
      },
      {
        urlPattern: /\/api\/algorithms\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'algorithms', networkTimeoutSeconds: 10 }
      },
      {
        urlPattern: /\/(draft|dashboard)\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'pages' }
      }
    ]
  }
})

// Security headers for defense-in-depth
const isDev = process.env.NODE_ENV === 'development'

const connectSrc = isDev
  ? "connect-src 'self' http://localhost:54321 http://127.0.0.1:54321 https://*.supabase.co https://api.sleeper.app https://api.groq.com https://us.i.posthog.com https://us-assets.i.posthog.com https://app.posthog.com https://fantasyfootballcalculator.com"
  : "connect-src 'self' https://*.supabase.co https://api.sleeper.app https://api.groq.com https://us.i.posthog.com https://us-assets.i.posthog.com https://app.posthog.com https://fantasyfootballcalculator.com"

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com"
  : "'self' 'strict-dynamic' https://us-assets.i.posthog.com"

const styleSrc = isDev
  ? "'self' 'unsafe-inline'"
  : "'self'"

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      connectSrc,
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withSentryConfig(withAnalyzer(withPWA(nextConfig)), {
  org: 'quantasy-es',
  project: 'dev',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
