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

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
}

export default withPWA(nextConfig)
