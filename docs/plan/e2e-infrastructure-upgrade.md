# E2E Testing Infrastructure Upgrade

**Created:** 2026-01-26
**Status:** Planning
**Priority:** High
**Effort:** Medium
**Depends On:** `supabase-dev-setup.md` (Phase 1-2 required first)

## Executive Summary

Upgrade E2E testing infrastructure to leverage:
1. **Supabase MCP server** for direct database operations
2. **Local Supabase** for CI testing against real RLS policies
3. **agent-browser** for debugging failed tests

**Why Now:** Security advisors found **4 RLS errors** that CI doesn't catch because E2E uses MSW mocks. CI doesn't even run E2E tests.

## Current State Analysis

### What Works
| Component | Status | Notes |
|-----------|--------|-------|
| Playwright config | Good | Chromium + Mobile Safari, parallel execution |
| MSW handlers | Good | Sleeper API + VBD mocks in `tests/mocks/` |
| E2E tests | Good | 4 spec files with solid coverage |
| Auth setup | Bloated | 179 lines, mixes auth + seeding |

### What's Broken

| Issue | Impact | Evidence |
|-------|--------|----------|
| **No E2E in CI** | Tests run locally only | `.github/workflows/ci.yml` has no `test:e2e` |
| **No RLS testing** | 4 tables exposed | `mcp_supabase_get_advisors` found errors |
| **No seed.sql** | Manual seeding required | `supabase/config.toml` references missing file |
| **Duplicate seeding** | Maintenance burden | `global-setup.ts` duplicates what should be in seed.sql |
| **No DB scripts** | Poor DX | package.json missing `db:*` commands |

### Security Advisors Report (4 Errors, 2 Warnings)

```
ERRORS (must fix):
- Table `public.leagues` is public, but RLS has not been enabled
- Table `public.rosters` is public, but RLS has not been enabled  
- Table `public.players` is public, but RLS has not been enabled
- Table `public.matchups` is public, but RLS has not been enabled

WARNINGS:
- Function `public.handle_updated_at` has mutable search_path
- Leaked password protection disabled (Auth config)
```

## Architecture Decision

### Keep MSW for External APIs

MSW will continue to mock **external APIs** (Sleeper):
- Rate limiting protection
- Deterministic test data
- No dependency on external service availability

### Use Real Supabase for Database

Switch from MSW database mocks to real local Supabase:
- **Validates RLS policies** in tests
- **Catches schema drift** before production
- **Tests real auth flows** with actual tokens

### Layered Testing Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    E2E Test Flow                        │
├─────────────────────────────────────────────────────────┤
│  Browser (Playwright)                                   │
│     │                                                   │
│     ▼                                                   │
│  Next.js App ──────► Sleeper API (MSW mock)            │
│     │                                                   │
│     ▼                                                   │
│  Supabase Client ──► Local Supabase (real)             │
│                          │                              │
│                          ▼                              │
│                      PostgreSQL (with RLS)              │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 0: Prerequisites (from supabase-dev-setup.md)

**Complete these first** (see `supabase-dev-setup.md`):

- [ ] Create `supabase/seed.sql` with test data
- [ ] Add `db:*` scripts to package.json
- [ ] Generate types and verify they match

### Phase 1: Fix RLS Errors (Security Critical)

**Goal:** Fix 4 RLS errors before enabling real Supabase testing.

#### 1.1 Create RLS Migration

**File:** `supabase/migrations/005_missing_rls_policies.sql`

```sql
-- Enable RLS on tables missing it
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;

-- Players table: Read-only for authenticated users (cached data)
CREATE POLICY "Players are readable by authenticated users"
ON public.players FOR SELECT
TO authenticated
USING (true);

-- Leagues table: Users can read leagues they're members of
CREATE POLICY "Users can read their leagues"
ON public.leagues FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT league_id FROM public.user_leagues 
    WHERE user_id = auth.uid()
  )
);

-- Leagues table: Service role can insert/update (for caching)
CREATE POLICY "Service role manages leagues"
ON public.leagues FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Rosters table: Users can read rosters from their leagues
CREATE POLICY "Users can read rosters from their leagues"
ON public.rosters FOR SELECT
TO authenticated
USING (
  league_id IN (
    SELECT league_id FROM public.user_leagues 
    WHERE user_id = auth.uid()
  )
);

-- Rosters table: Service role can insert/update (for caching)
CREATE POLICY "Service role manages rosters"
ON public.rosters FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Matchups table: Users can read matchups from their leagues  
CREATE POLICY "Users can read matchups from their leagues"
ON public.matchups FOR SELECT
TO authenticated
USING (
  league_id IN (
    SELECT league_id FROM public.user_leagues 
    WHERE user_id = auth.uid()
  )
);

-- Matchups table: Service role can insert/update (for caching)
CREATE POLICY "Service role manages matchups"
ON public.matchups FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix function search_path warning
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
```

#### 1.2 Verify RLS with MCP

After applying migration, run security advisors again:

```typescript
// Use Supabase MCP to verify
mcp_supabase_get_advisors({ type: "security" })
// Expected: No more RLS errors
```

### Phase 2: Simplify global-setup.ts

**Goal:** Reduce from 179 lines to ~50 lines (auth only).

#### 2.1 Updated global-setup.ts

```typescript
// tests/e2e/global-setup.ts
import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TEST_EMAIL = 'e2e-test@quantasy.test'
const TEST_PASSWORD = 'test-password-123!'

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'

  if (!supabaseUrl || !secretKey || !publishableKey) {
    console.log('[E2E Setup] Skipping - missing Supabase credentials')
    return
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Create test user (or verify exists)
  console.log('[E2E Setup] Creating test user...')
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let testUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL)

  if (!testUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`Failed to create test user: ${error.message}`)
    testUser = data.user
  }

  // Link test user to seeded league (from seed.sql)
  await supabase.from('profiles').upsert({
    id: testUser.id,
    sleeper_user_id: 'test-sleeper-user-123',
    sleeper_username: 'testuser',
  }, { onConflict: 'id' })

  await supabase.from('user_leagues').upsert({
    user_id: testUser.id,
    league_id: '987654321',  // Matches seed.sql
    roster_id: 1,
    is_owner: true,
  }, { onConflict: 'user_id,league_id' })

  // Generate auth session
  console.log('[E2E Setup] Generating session...')
  const anonClient = createClient(supabaseUrl, publishableKey)
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInError) throw new Error(`Failed to sign in: ${signInError.message}`)

  // Store auth state for Playwright
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(baseURL)

  await context.addCookies([{
    name: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
    value: JSON.stringify({
      access_token: signInData.session!.access_token,
      refresh_token: signInData.session!.refresh_token,
      expires_at: signInData.session!.expires_at,
      expires_in: signInData.session!.expires_in,
      token_type: 'bearer',
      user: signInData.session!.user,
    }),
    domain: new URL(baseURL).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }])

  await context.storageState({ path: 'tests/e2e/.auth/user.json' })
  await browser.close()

  console.log('[E2E Setup] Complete!')
}
```

**Changes:**
- Removed player seeding (now in seed.sql)
- Removed league seeding (now in seed.sql)
- Kept user profile + user_leagues (requires auth.uid())
- ~70 lines vs 179 lines (61% reduction)

### Phase 3: Add E2E to CI with Real Supabase

**Goal:** Run E2E tests in CI against real Supabase (not MSW).

#### 3.1 Update CI Workflow

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10.28.1
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'
      
      # NEW: Setup Supabase CLI
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      # NEW: Start local Supabase (lightweight)
      - name: Start Supabase
        run: |
          supabase start --exclude studio,inbucket,imgproxy
          supabase db reset  # Applies migrations + seed.sql
      
       # NEW: Set environment variables
       - name: Set Supabase Environment
         run: |
           echo "NEXT_PUBLIC_SUPABASE_URL=$(supabase status -o json | jq -r '.API_URL')" >> $GITHUB_ENV
           echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | jq -r '.ANON_KEY')" >> $GITHUB_ENV
           SERVICE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY')
           echo "SUPABASE_SECRET_KEY=$SERVICE_KEY" >> $GITHUB_ENV
           echo "::add-mask::$SERVICE_KEY"
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      # NEW: Verify types match schema
      - name: Check Types Match Schema
        run: pnpm types:check
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Run unit tests
        run: pnpm test:run
      
      - name: Build
        run: pnpm build
      
      # NEW: Install Playwright browsers
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium
      
      # NEW: Run E2E tests (no MSW for Supabase)
      - name: Run E2E tests
        run: pnpm test:e2e --project=chromium
        env:
          ENABLE_MSW: 'true'  # Still mock Sleeper API
      
      # NEW: Upload test artifacts on failure
      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

#### 3.2 Update playwright.config.ts for Hybrid Mode

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['github'],  // Native GitHub Actions annotations
  ],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: 'tests/e2e/.auth/user.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'ENABLE_MSW=true pnpm dev',  // MSW for Sleeper only
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      ENABLE_MSW: 'true',
    },
  },
})
```

### Phase 4: Supabase MCP Test Helpers

**Goal:** Create helpers using MCP for dynamic test data.

#### 4.1 Test Data Helper Module

**File:** `tests/e2e/helpers/supabase-mcp.ts`

```typescript
// Note: These helpers demonstrate what could be done with MCP
// In practice, you'd call these from the planning/debugging context

/**
 * Dynamic test data via Supabase MCP
 * 
 * Use cases:
 * 1. Insert test-specific data before a test
 * 2. Clean up data after tests
 * 3. Verify database state in assertions
 * 4. Run security advisors as part of CI
 * 
 * Examples (in MCP context):
 * 
 * // Insert a test player
 * mcp_supabase_execute_sql({
 *   query: `
 *     INSERT INTO players (id, full_name, position, team, projected_points)
 *     VALUES ('test-123', 'Test Player', 'QB', 'KC', 400)
 *     ON CONFLICT (id) DO NOTHING
 *   `
 * })
 * 
 * // Verify RLS policy works
 * mcp_supabase_execute_sql({
 *   query: `
 *     SET LOCAL ROLE authenticated;
 *     SET LOCAL request.jwt.claims = '{"sub": "test-user-id"}';
 *     SELECT * FROM leagues;  -- Should only return user's leagues
 *   `
 * })
 * 
 * // Clean up after test
 * mcp_supabase_execute_sql({
 *   query: `DELETE FROM players WHERE id LIKE 'test-%'`
 * })
 * 
 * // Run security check
 * mcp_supabase_get_advisors({ type: "security" })
 */

export const MCP_PATTERNS = {
  // Documented for reference - actual calls made via MCP
  insertPlayer: (id: string, name: string, position: string) => `
    INSERT INTO players (id, full_name, position, team, projected_points, sleeper_data)
    VALUES ('${id}', '${name}', '${position}', 'KC', 300, '{"player_id": "${id}"}')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
  `,
  
  cleanupTestData: () => `
    DELETE FROM players WHERE id LIKE 'e2e-test-%';
    DELETE FROM algorithm_outputs WHERE league_id = '987654321';
  `,
  
  verifyUserCanAccessLeague: (userId: string, leagueId: string) => `
    SELECT EXISTS (
      SELECT 1 FROM user_leagues 
      WHERE user_id = '${userId}' AND league_id = '${leagueId}'
    ) as has_access
  `,
}
```

#### 4.2 Add Security Check to CI

**Add to `.github/workflows/ci.yml`** after tests:

```yaml
      # NEW: Security advisors check
      - name: Run Supabase Security Advisors
        run: |
          npx supabase inspection lint --level error --fail
```

### Phase 5: agent-browser Debug Helpers

**Goal:** Provide debugging workflows for failed tests.

#### 5.1 Debug Guide Document

**File:** `tests/e2e/DEBUG.md`

```markdown
# E2E Test Debugging Guide

## Using agent-browser for Failed Tests

When a Playwright test fails, use agent-browser for interactive debugging:

### Quick Diagnosis

```bash
# Get visual snapshot of current state
agent-browser snapshot -i

# Take screenshot
agent-browser screenshot --path debug.png

# Check for specific text
agent-browser wait --text "Error" --timeout 1000
```

### State Inspection

```bash
# Check authentication state
agent-browser cookies --domain localhost

# Check localStorage (auth tokens)
agent-browser storage local

# View network requests
agent-browser network log
```

### Interactive Debugging

```bash
# Start persistent session
agent-browser session start --name debug

# Navigate to failing page
agent-browser navigate http://localhost:3000/draft

# Get interactive element refs
agent-browser snapshot -i
# Output: @e1 = "button: Send Magic Link"
#         @e2 = "input: email"

# Interact with elements
agent-browser click @e1
agent-browser fill @e2 "test@example.com"
```

### Recording Failures

```bash
# Record session for analysis
agent-browser record --output failure.webm

# Stop recording
agent-browser record stop
```

### Common Issues

| Symptom | Command | What to Look For |
|---------|---------|------------------|
| Auth redirect loop | `agent-browser cookies` | Missing auth token cookie |
| Page blank | `agent-browser snapshot -i` | JS errors, missing elements |
| API errors | `agent-browser network log` | 401/403/500 responses |
| State issues | `agent-browser storage local` | Stale or missing data |

### Integration with Playwright

For programmatic debugging in test files:

```typescript
test('failing test', async ({ page }) => {
  // ... test code ...
  
  // On failure, this uploads artifacts
  await page.screenshot({ path: 'debug-screenshot.png' })
})
```

Use `--debug` flag for headed mode:
```bash
pnpm test:e2e --debug --project=chromium
```
```

#### 5.2 VS Code Debug Configuration

**File:** `.vscode/launch.json` (addition)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug E2E Test",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": ["test", "--debug", "--project=chromium", "${file}"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Phase 6: Maintenance Automation

**Goal:** Keep infrastructure healthy with automated checks.

#### 6.1 Pre-commit Hook

**File:** `.husky/pre-commit` (if using husky)

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check types match schema (fast)
pnpm types:check || {
  echo "Types don't match schema. Run 'pnpm types:generate'"
  exit 1
}
```

#### 6.2 Scheduled Security Check

**File:** `.github/workflows/security.yml`

```yaml
name: Security Check

on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday 9am UTC
  workflow_dispatch:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      
      - name: Start Supabase
        run: supabase start --exclude studio,inbucket,imgproxy
      
      - name: Run Security Advisors
        run: npx supabase inspection lint --level warn
      
      - name: Check for Critical Issues
        run: |
          ERRORS=$(npx supabase inspection lint --level error --format json | jq length)
          if [ "$ERRORS" -gt 0 ]; then
            echo "::error::Found $ERRORS security errors"
            exit 1
          fi
```

## Implementation Order

```
Phase 0: Prerequisites (1 day)
├── Create supabase/seed.sql
├── Add db:* scripts to package.json  
└── Verify types:generate works

Phase 1: Fix RLS (0.5 day)
├── Create migration 005_missing_rls_policies.sql
├── Apply and verify with MCP advisors
└── Run existing tests to verify no breakage

Phase 2: Simplify global-setup.ts (0.5 day)
├── Remove seeding code
├── Keep auth-only setup
└── Verify E2E tests still pass

Phase 3: Add E2E to CI (1 day)
├── Update ci.yml with Supabase steps
├── Update playwright.config.ts
├── Verify full pipeline works
└── Monitor CI time impact

Phase 4: MCP Helpers (0.5 day)
├── Document MCP patterns
├── Add security check to CI
└── Test dynamic data insertion

Phase 5: Debug Helpers (0.5 day)
├── Write DEBUG.md
├── Add VS Code launch config
└── Test agent-browser workflow

Phase 6: Maintenance (0.5 day)
├── Add pre-commit hook
├── Add scheduled security check
└── Document in AGENTS.md
```

**Total Effort:** ~4-5 days

## Success Criteria

- [ ] `supabase db reset` seeds all test data
- [ ] `global-setup.ts` is < 80 lines (auth only)
- [ ] `mcp_supabase_get_advisors` returns 0 security errors
- [ ] E2E tests run in CI against real Supabase
- [ ] CI validates RLS policies work correctly
- [ ] Failed tests can be debugged with agent-browser
- [ ] All existing tests continue to pass
- [ ] CI time increase < 3 minutes

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RLS policies break app | Medium | High | Test in local env first, keep MSW fallback |
| CI time increases significantly | Low | Medium | Use `--exclude` flags, parallelize |
| Type generation differs | Low | Low | Diff check catches it, easy to regenerate |
| E2E flaky in CI | Medium | Medium | Retries configured, artifact upload on failure |

## Rollback Plan

If Phase 3 causes issues:
1. Revert ci.yml changes
2. Keep local Supabase improvements
3. E2E runs locally only (current state)

## References

- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Supabase CLI Testing](https://supabase.com/docs/guides/cli/testing)
- [Playwright CI Setup](https://playwright.dev/docs/ci-intro)
- [agent-browser CLI](https://github.com/anthropics/agent-browser)
- Existing plan: `docs/plan/supabase-dev-setup.md`
- E2E tests: `tests/e2e/*.spec.ts`
- MSW handlers: `tests/mocks/handlers.ts`
