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

## Test Suites

| Suite | Coverage |
|-------|----------|
| `auth.spec.ts` | Login, logout, session handling |
| `connect-league.spec.ts` | Sleeper league connection |
| `draft-assistant.spec.ts` | Draft rankings, filters, mock draft |
| `roster-optimizer.spec.ts` | Lineup optimization |
| `trade-calculator.spec.ts` | Trade evaluation |
| `trade-with-picks.spec.ts` | Trade with draft picks |
| `waivers.spec.ts` | Waiver recommendations |
| `pick-value-board.spec.ts` | Draft pick value display |
| `pick-valuation.spec.ts` | Pick value algorithm |
| `pick-explanation.spec.ts` | Pick value explanations |
| `multi-source-values.spec.ts` | KTC/DP/FC value sources |
| `format-toggle.spec.ts` | Dynasty/redraft toggle |
| `p1-features.spec.ts` | Phase 1 feature smoke tests |
| `analytics.spec.ts` | PostHog analytics verification |
| `feedback.spec.ts` | Feedback form submission |
| `a11y.spec.ts` | Accessibility checks |
| `performance.spec.ts` | Core Web Vitals |
| `rls-policies.spec.ts` | Supabase RLS validation |
| `pwa-offline.spec.ts` | Offline/caching behavior |

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

E2E tests run in GitHub Actions CI using **3-shard parallelization** for faster execution.

### Architecture
- **quality** job: type-check → lint → unit tests → build (runs in parallel with e2e)
- **e2e** job: 3 parallel shards, each running ~61 tests (183 total, excluding perf/PWA)
- **report-merge** job: merges blob reports from all shards into unified HTML report

### Configuration
- **Shard count**: 3 (configured via matrix strategy)
- **Reporter**: blob in CI (for shard merging), html locally
- **Workers**: 1 per shard (serial within shard, parallel across shards)
- **Browsers**: Chromium only (Mobile Safari runs locally)
- **Retries**: 2 in CI, 0 locally
- **Excluded**: `performance.spec.ts`, `pwa-offline.spec.ts` (run in nightly workflow)

### Local Debugging of Shard-Specific Failures
If a test fails in CI shard 2/3 but passes locally:
```bash
# Run the same shard locally
CI=true ENABLE_MSW=true pnpm exec playwright test --project=chromium --shard=2/3

# Or run all shards sequentially
for i in 1 2 3; do
  CI=true ENABLE_MSW=true pnpm exec playwright test --project=chromium --shard=$i/3
done
```

### Sharding Safety
Tests can safely run in parallel shards because:
- Each shard has **isolated Supabase instance** (separate database)
- Each shard spawns **own dev server** (separate port)
- MSW mocks prevent external API calls

**Note**: `rls-policies.spec.ts` uses hardcoded UUIDs but is safe across shards due to per-shard database isolation.

### Nightly Workflow
Performance and PWA tests run in a separate nightly workflow:
- **Schedule**: Daily at 6am UTC
- **Manual trigger**: Available via `workflow_dispatch`
- **Tests**: `performance.spec.ts`, `pwa-offline.spec.ts`
- **Build**: Requires production build (`pnpm build --webpack`)
- **Failure handling**: Creates GitHub issue with `nightly-failure` label

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

**Wait patterns (condition-based, NOT fixed timeouts):**
```typescript
// DOM visibility
await expect(page.locator('[data-testid="player-card"]')).toBeVisible()
await expect(page.locator('[data-testid="modal"]')).not.toBeVisible()

// Content updates
await expect(page.locator('[data-testid="week-selector"]')).toHaveText('Week 1')

// Element state
await expect(page.locator('[data-testid="toggle"]')).toBeChecked()
await expect(page.locator('[data-testid="slider"]')).toHaveValue('20')

// Element count (for debounced search/filter)
await page.fill('[data-testid="search-input"]', 'Mahomes')
await expect(page.locator('[data-testid="player-row"]')).toHaveCount(1)

// Network events (analytics tests)
await page.waitForRequest(req => req.url().includes('posthog.com/e/'))

// Navigation
await page.waitForURL('/dashboard')
```

**DO NOT use `waitForTimeout()`.** It's unreliable and slower than condition-based waits.

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
