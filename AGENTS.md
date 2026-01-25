# QUANTASY - PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-24
**Commit:** 20efb93
**Branch:** dev

## OVERVIEW

Fantasy football tools with algorithmic transparency ("Show Your Work"). Integrates with Sleeper API. Mobile-first, Balatro-inspired animations.

## STRUCTURE

```
qai/
├── src/
│   ├── app/                    # Next.js 16 App Router
│   │   ├── (auth)/             # Public auth routes (login, callback)
│   │   ├── (dashboard)/        # Protected routes (dashboard, draft, roster, trade, waivers, connect)
│   │   └── api/                # API routes (/players/sync, /algorithms/vbd, /ai/explain)
│   ├── components/
│   │   ├── animation/          # Balatro-inspired animation primitives
│   │   ├── ui/                 # shadcn/ui (New York style)
│   │   ├── layout/             # Responsive nav (mobile-first)
│   │   ├── players/            # Player cards/lists
│   │   ├── draft/              # Draft Assistant UI (rankings, filters, controls)
│   │   └── providers/          # AuthProvider context
│   ├── lib/
│   │   ├── sleeper/            # Sleeper API client (see ./src/lib/sleeper/AGENTS.md)
│   │   ├── supabase/           # Auth + DB (client.ts, server.ts, middleware.ts)
│   │   ├── algorithms/         # VBD (complete), lineup, trade, waivers (planned)
│   │   ├── draft/              # Draft state management (Context + reducer)
│   │   ├── projections/        # Projection data layer (CSV upload, storage)
│   │   └── ai/                 # Groq AI integration (explanations)
│   │   └── utils/              # cn(), formatters (planned)
│   ├── hooks/                  # use-celebration.ts, use-draft-sync.ts, use-connection-status.ts
│   └── tests/                  # Vitest setup + unit tests
├── tests/e2e/                  # Playwright E2E tests
├── supabase/migrations/        # SQL migrations
├── docs/
│   ├── plan/                   # Phase planning docs (00-overview.md is index)
│   └── algorithms/             # Algorithm documentation (vbd.md)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new page | `src/app/(dashboard)/[feature]/page.tsx` | Copy existing page structure |
| Add UI component | `src/components/ui/` | Use `npx shadcn@latest add [component]` |
| Add animation | `src/components/animation/` | Export from index.ts |
| Sleeper API call | `src/lib/sleeper/client.ts` | Rate-limited, see sleeper/AGENTS.md |
| DB query | `src/lib/supabase/server.ts` | Use `createClient()` in server components |
| Auth check | `src/app/(dashboard)/layout.tsx` | Layout handles redirect to /login |
| Add test | `src/tests/unit/*.test.tsx` or `tests/e2e/*.spec.ts` | Vitest vs Playwright |
| Planning docs | `docs/plan/00-overview.md` | Start here for project context |
| **Draft Assistant** | | |
| Add VBD calculation | `src/lib/algorithms/vbd.ts` | Core algorithm, see docs/algorithms/vbd.md |
| Add draft UI | `src/components/draft/` | Client components (rankings, filters, etc.) |
| Add draft API | `src/app/api/algorithms/vbd/route.ts` | VBD endpoint |
| Add draft tests | `tests/e2e/draft-assistant.spec.ts` | E2E tests |
| Draft state | `src/lib/draft/state.tsx` | React Context for draft state |
| Draft sync | `src/hooks/use-draft-sync.ts` | Live Sleeper draft polling |

## CONVENTIONS

### TypeScript
- Strict mode enabled
- Path aliases: `@/*` → `./src/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`
- No `as any`, `@ts-ignore`, `@ts-expect-error`

### File Naming
- kebab-case for files: `player-card.tsx`, `use-celebration.ts`
- PascalCase for components: `PlayerCard`, `FadeIn`
- Barrel exports via `index.ts` in feature directories

### Components
- Server Components by default (App Router)
- `'use client'` only when needed (hooks, events, browser APIs)
- shadcn/ui primitives in `components/ui/` - do not modify directly
- Motion library for animations (not framer-motion directly)

### App Router Patterns
- Route groups: `(auth)` = public, `(dashboard)` = protected
- Server Actions in `actions.ts` files (e.g., `dashboard/actions.ts`)
- API routes return `NextResponse.json()`

### Styling
- Tailwind CSS v4 with CSS variables
- `cn()` utility from `@/lib/utils` for conditional classes
- Mobile-first: base styles are mobile, `md:` for desktop

## ANTI-PATTERNS

- **DO NOT** call Sleeper API directly from components - use `src/lib/sleeper/client.ts`
- **DO NOT** create Supabase clients manually - use `createClient()` helpers
- **DO NOT** skip auth check in dashboard routes - layout handles it
- **DO NOT** add animations without checking `src/components/animation/index.ts` first
- **DO NOT** hardcode NFL season - use `getCurrentSeason()` from sleeper client

## DATABASE

Tables (Supabase Postgres):
- `profiles` - User profile + Sleeper connection
- `leagues` - Cached league data
- `user_leagues` - User-league associations  
- `rosters` - Cached roster data
- `players` - Player data with projections
- `matchups` - Weekly matchup data
- `algorithm_outputs` - Saved algorithm results with explanations

Migrations in `supabase/migrations/`. Types generated in `src/lib/supabase/types.ts`.

## COMMANDS

```bash
pnpm dev              # Dev server with Turbopack
pnpm build            # Production build
pnpm lint             # ESLint
pnpm type-check       # TypeScript check (separate from build)
pnpm test             # Vitest unit tests
pnpm test:ui          # Vitest with UI
pnpm test:e2e         # Playwright E2E
pnpm test:e2e:ui      # Playwright with UI
```

## TESTING

| Type | Framework | Location | Pattern | Run |
|------|-----------|----------|---------|-----|
| Unit | Vitest + Testing Library | `src/tests/unit/` | `*.test.tsx` | `pnpm test` |
| E2E | Playwright | `tests/e2e/` | `*.spec.ts` | `pnpm test:e2e` |

Setup file: `src/tests/setup.ts` - auto-cleanup after each test.
Playwright tests: Chromium + Mobile Safari (iPhone 13).

## DEPLOYMENT

- **Platform:** Fly.io (not Vercel)
- **Output:** Standalone Next.js (`output: 'standalone'` in next.config.ts)
- **CI:** GitHub Actions - type-check → lint → test → build
- **Deploy:** Push to `main` triggers `fly deploy`
- **Secrets:** `FLY_API_TOKEN`, Supabase env vars in Fly

## NOTES

- React 19 + Next.js 16 (latest)
- pnpm required (v10.28.1 pinned in CI/Docker)
- Turbopack enabled in dev (experimental but fast)
- Player sync has 60s timeout (`maxDuration` in route)
- Sleeper API: 16 req/sec rate limit (handled by client)
