import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/algorithms/**/*.ts'],
      exclude: [
        'src/lib/algorithms/types.ts',
        '**/*.test.ts',
        '**/index.ts',
      ],
      thresholds: {
        'src/lib/algorithms/vbd.ts': {
          branches: 97,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './src/tests/mocks/server-only.ts'),
      'playwright': path.resolve(__dirname, './src/tests/mocks/playwright.ts'),
    },
  },
})
