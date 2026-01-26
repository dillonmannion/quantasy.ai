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
```

## CI Integration

E2E tests run in CI with:
- Local Supabase (started via `supabase start`)
- Chromium only (faster CI)
- Artifacts uploaded on failure (7-day retention)
- Retries: 2 in CI, 0 locally
- Workers: 1 in CI (serial), parallel locally

## Adding New Tests

1. Create `*.spec.ts` in `tests/e2e/`
2. Use `data-testid` attributes for selectors
3. Use `test.use({ storageState: ... })` for auth control
4. Add MSW handlers in `tests/mocks/handlers.ts` for new API endpoints

## Debugging Failed Tests

See `DEBUG.md` for troubleshooting workflows.
