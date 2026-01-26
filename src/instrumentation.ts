export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.ENABLE_MSW === 'true') {
    const { server } = await import('../tests/mocks/server')
    server.listen({ onUnhandledRequest: 'bypass' })
    console.log('[MSW] Mock server started for E2E tests')
  }
}
