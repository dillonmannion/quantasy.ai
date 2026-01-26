import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

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

// In development, allow local Supabase; in production, only remote
const connectSrc = isDev
  ? "connect-src 'self' http://127.0.0.1:54321 https://*.supabase.co https://api.sleeper.app https://api.groq.com"
  : "connect-src 'self' https://*.supabase.co https://api.sleeper.app https://api.groq.com"

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
      "style-src 'self' 'unsafe-inline'", // Required for Tailwind
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      connectSrc,
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

export default withPWA(nextConfig)
