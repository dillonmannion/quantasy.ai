# Supabase Local Development Setup Improvements

**Created:** 2026-01-26
**Status:** Planning
**Priority:** Medium
**Effort:** Low-Medium

## Overview

Improve the Supabase local development experience by adding missing seed data, standardizing DB management scripts, auto-generating TypeScript types, and optionally integrating Supabase into CI for integration testing.

## Current State

### What's Working Well
- **Supabase Clients**: Properly configured with `@supabase/ssr` for browser/server/middleware
- **Migrations**: 4 well-structured migrations with proper RLS policies
- **config.toml**: Correctly configured for local development (ports, auth, services)
- **Environment Files**: `.env.local` properly configured for local Supabase

### Identified Gaps

| Gap | Impact | Effort to Fix |
|-----|--------|---------------|
| Missing `supabase/seed.sql` | `db reset` doesn't seed test data | Low |
| No DB scripts in package.json | Poor DX for common operations | Low |
| Manual type maintenance | Risk of schema/type drift | Low |
| CI doesn't run Supabase | RLS policies untested until deploy | Medium |
| Duplicate seed logic in E2E | Maintenance burden | Low |

## Proposed Changes

### Phase 1: Quick Wins (Low Effort)

#### 1.1 Create `supabase/seed.sql`

**Rationale**: config.toml already references `./seed.sql` but file doesn't exist. E2E global-setup manually seeds this same data.

**File**: `supabase/seed.sql`
```sql
-- Seed data for local development and testing
-- Run with: supabase db reset (includes migrations + seed)

-- Test league
INSERT INTO public.leagues (id, name, season, status, total_rosters, settings, scoring_settings, roster_positions)
VALUES (
  '987654321', 
  'Test Fantasy League', 
  '2025', 
  'in_season', 
  12, 
  '{"type": 0, "playoff_week_start": 15, "num_teams": 12, "playoff_teams": 6, "leg": 1}',
  '{"rec": 1}',
  '["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"]'
) ON CONFLICT (id) DO NOTHING;

-- Test players (top fantasy options for 2025)
INSERT INTO public.players (id, full_name, position, team, projected_points, sleeper_data) VALUES
  ('4046', 'Patrick Mahomes', 'QB', 'KC', 380, '{"player_id": "4046"}'),
  ('5850', 'Josh Allen', 'QB', 'BUF', 370, '{"player_id": "5850"}'),
  ('4866', 'Saquon Barkley', 'RB', 'PHI', 310, '{"player_id": "4866"}'),
  ('6797', 'Jonathan Taylor', 'RB', 'IND', 290, '{"player_id": "6797"}'),
  ('6786', 'CeeDee Lamb', 'WR', 'DAL', 280, '{"player_id": "6786"}'),
  ('4035', 'Ja''Marr Chase', 'WR', 'CIN', 275, '{"player_id": "4035"}'),
  ('4034', 'Travis Kelce', 'TE', 'KC', 250, '{"player_id": "4034"}'),
  ('6794', 'Justin Herbert', 'QB', 'LAC', 340, '{"player_id": "6794"}'),
  ('7564', 'Breece Hall', 'RB', 'NYJ', 270, '{"player_id": "7564"}'),
  ('4199', 'Tyreek Hill', 'WR', 'MIA', 265, '{"player_id": "4199"}')
ON CONFLICT (id) DO NOTHING;

-- Note: Test user profile is created automatically via auth trigger (migration 004)
-- To create a test user, use: supabase auth admin create-user
```

#### 1.2 Add DB Management Scripts to package.json

**Rationale**: Standardize common operations for better developer experience.

**Changes to `package.json`**:
```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop", 
    "db:reset": "supabase db reset",
    "db:migrate": "supabase migration up",
    "db:diff": "supabase db diff --local -f",
    "db:status": "supabase status",
    "types:generate": "supabase gen types typescript --local > src/lib/supabase/types.ts",
    "types:check": "supabase gen types typescript --local | diff - src/lib/supabase/types.ts"
  }
}
```

#### 1.3 Create `.env.example` Update

Add documentation for local vs remote setup:
```bash
# Supabase - Local Development (default)
# Start local Supabase with: pnpm db:start
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from supabase status ANON_KEY>
SUPABASE_SECRET_KEY=<from supabase status SERVICE_ROLE_KEY>

# Supabase - Remote/Production
# Uncomment and fill these for production deployment
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
# SUPABASE_SECRET_KEY=your-secret-key
```

### Phase 2: Type Safety (Low Effort)

#### 2.1 Auto-Generate Types

**Problem**: `src/lib/supabase/types.ts` is manually maintained (260 lines). Risk of drift.

**Solution**: 
1. Run `pnpm types:generate` to regenerate from local schema
2. Add `types:check` to CI to catch drift
3. Document workflow in AGENTS.md

**Workflow**:
```bash
# After changing migrations:
pnpm db:reset          # Apply migrations
pnpm types:generate    # Regenerate types
pnpm type-check        # Verify no type errors
```

### Phase 3: CI Integration (Medium Effort, Optional)

#### 3.1 Add Supabase to GitHub Actions

**Rationale**: Currently CI only runs with mocked Supabase. RLS policies are untested.

**Trade-off**: Adds ~2 minutes to CI time but validates:
- RLS policies work correctly
- Migrations apply cleanly
- Types match schema

**Changes to `.github/workflows/ci.yml`**:
```yaml
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
      
      # NEW: Start Supabase (lightweight mode)
      - name: Start Supabase
        run: supabase start --exclude studio,inbucket,imgproxy
      
       # NEW: Extract credentials for tests
       - name: Set Supabase Environment
         run: |
           echo "NEXT_PUBLIC_SUPABASE_URL=$(supabase status -o json | jq -r '.API_URL')" >> $GITHUB_ENV
           echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | jq -r '.ANON_KEY')" >> $GITHUB_ENV
           SERVICE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY')
           echo "SUPABASE_SECRET_KEY=$SERVICE_KEY" >> $GITHUB_ENV
           echo "::add-mask::$SERVICE_KEY"
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      # NEW: Verify types are up-to-date
      - name: Check Types Match Schema
        run: pnpm types:check
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Run tests
        run: pnpm test:run
      
      - name: Build
        run: pnpm build
```

### Phase 4: Cleanup (Low Effort)

#### 4.1 Simplify E2E Global Setup

After seed.sql exists, simplify `tests/e2e/global-setup.ts`:
- Remove manual league/player seeding (now in seed.sql)
- Keep only: test user creation + session generation

## Implementation Order

1. **Phase 1.1**: Create `supabase/seed.sql` 
2. **Phase 1.2**: Add package.json scripts
3. **Phase 2.1**: Auto-generate types, verify they match
4. **Phase 1.3**: Update `.env.example` documentation
5. **Phase 3.1**: (Optional) Add Supabase to CI
6. **Phase 4.1**: Simplify E2E setup

## Success Criteria

- [ ] `pnpm db:reset` seeds test data automatically
- [ ] `pnpm types:generate` produces identical output to current types.ts
- [ ] All existing tests continue to pass
- [ ] Developer can go from clone to running app with: `pnpm install && pnpm db:start && pnpm db:reset && pnpm dev`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Generated types differ from manual | Compare diff, update if schema has drifted |
| CI time increases significantly | Use `--exclude` flags, only run on PRs to main |
| Seed data conflicts with E2E | Use ON CONFLICT DO NOTHING for idempotency |

## References

- [Supabase CLI Docs](https://supabase.com/docs/guides/local-development/cli)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/local-development#testing)
- Current E2E setup: `tests/e2e/global-setup.ts`
- Current types: `src/lib/supabase/types.ts`
