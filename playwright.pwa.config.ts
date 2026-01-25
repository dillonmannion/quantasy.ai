import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/pwa-*.spec.ts',
  webServer: {
    command: 'pnpm build --webpack && pnpm start',
    port: 3000,
    reuseExistingServer: false,
  },
})
