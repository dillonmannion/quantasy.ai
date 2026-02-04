import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    
    if (process.env.ENABLE_MSW === 'true') {
      const { server } = await import('../tests/mocks/server')
      server.listen({ onUnhandledRequest: 'bypass' })
      console.log('[MSW] Mock server started for E2E tests')
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
