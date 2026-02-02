# E2E Testing - Knowledge Base

## Overview

E2E tests use Playwright with hybrid mocking:
- **MSW** mocks external APIs (Sleeper)
- **Real Supabase** (local) validates RLS policies

## Test Architecture

```
Browser (Playwright)
    |
    v
Next.js App --> Sleeper API (MSW mock)
    |
    v
Supabase Client --> Local Supabase (real)
                        |
                        v
                    PostgreSQL (with RLS)
```

## Key Files

| File | Purpose |
|------|---------|
| `global-setup.ts` | Creates test user + session |
| `playwright.config.ts` | Browser config + reporters |
| `helpers/supabase-mcp.ts` | MCP SQL patterns |
| `.auth/user.json` | Stored auth state (generated) |

## Test Data

Test data comes from two sources:
1. **seed.sql** - Static data (leagues, players, rosters)
2. **global-setup.ts** - Dynamic data (test user, user_leagues)

The test league ID is `987654321` - matches both files.

## Running Tests

```bash
# All tests
pnpm test:e2e

# Specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project="Mobile Safari"

# Debug mode
pnpm test:e2e --debug

# UI mode
pnpm test:e2e:ui

# Single test file
pnpm test:e2e tests/e2e/auth.spec.ts

# Specific test
pnpm test:e2e -g "should redirect"
```

## CI Integration

E2E tests run in CI with:
- Local Supabase (started via `supabase start`)
- Chromium only (faster CI)
- Artifacts uploaded on failure (7-day retention)
- Retries: 2 in CI, 0 locally
- Workers: 1 in CI (serial), parallel locally

## Selector Patterns

**ALWAYS use `data-testid`:**
```typescript
// Component
<button data-testid="add-player-give">Add</button>
<div data-testid="player-card">...</div>
<ul data-testid="rankings-list">...</ul>

// Test
await page.locator('[data-testid="player-card"]').first()
await page.click('[data-testid="add-player-give"]')
await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible()
```

**Mobile-specific (avoid nav interception):**
```typescript
// WRONG - may be intercepted by fixed nav
await page.click('[data-testid="player-card"]')

// CORRECT - dispatches event directly
await page.dispatchEvent('[data-testid="player-card"]', 'click')
```

**Wait patterns for debounced state:**
```typescript
await page.fill('[data-testid="search-input"]', 'Mahomes')
await page.waitForTimeout(500)  // Wait for debounce
await expect(page.locator('[data-testid="player-row"]')).toHaveCount(1)
```

## Auth State Control

```typescript
// Unauthenticated test
test.use({ storageState: { cookies: [], origins: [] } })

// Authenticated test (uses global-setup state)
// Default: uses 'tests/e2e/.auth/user.json'
test('dashboard accessible', async ({ page }) => {
  await page.goto('/dashboard')
})
```

## MSW Handler Patterns

Add handlers in `tests/mocks/handlers.ts`:
```typescript
import { http, HttpResponse } from 'msw'

// Algorithm endpoint
export const myHandler = http.post('*/api/algorithms/my-algo', () => {
  return HttpResponse.json({ result: 'mocked' })
})

// Add to handlers array
export const handlers = [...existingHandlers, myHandler]
```

## Adding New Tests

1. Create `*.spec.ts` in `tests/e2e/`
2. Use `data-testid` attributes for selectors
3. Use `test.use({ storageState: ... })` for auth control
4. Add MSW handlers in `tests/mocks/handlers.ts` for new API endpoints

## Debugging Failed Tests

```bash
# Open Playwright inspector
pnpm test:e2e --debug

# Run with headed browser
pnpm test:e2e --headed

# Pause at specific point
await page.pause()

# View trace on failure (auto-generated)
npx playwright show-trace test-results/trace.zip
```

See `DEBUG.md` for troubleshooting workflows.
