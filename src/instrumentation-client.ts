import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: !!SENTRY_DSN && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email
      delete event.user.username
      delete event.user.ip_address
    }
    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
