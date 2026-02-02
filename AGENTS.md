# QUANTASY - PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-30
**Commit:** afc0534
**Branch:** dev

## OVERVIEW

Fantasy football tools with algorithmic transparency ("Show Your Work"). Integrates with Sleeper API. Mobile-first, Balatro-inspired animations.

## STRUCTURE

```
qai/
├── src/
│   ├── app/                    # Next.js 16 App Router
│   │   ├── (auth)/             # Public routes (login, callback)
│   │   ├── (dashboard)/        # Protected routes (dashboard, draft, roster, trade, waivers, connect)
│   │   ├── (sandbox)/          # Public sandbox (draft-sandbox)
│   │   └── api/                # API routes (algorithms, ai, players, projections, draft)
│   ├── components/
│   │   ├── animation/          # Balatro-inspired primitives (see ./animation/AGENTS.md)
│   │   ├── ui/                 # shadcn/ui (New York style) - DO NOT MODIFY
│   │   ├── draft/              # Draft Assistant UI (see ./draft/AGENTS.md)
│   │   ├── layout/             # Responsive nav (mobile-first)
│   │   ├── players/            # Player cards/lists (has index.ts barrel)
│   │   └── providers/          # AuthProvider context
│   ├── lib/
│   │   ├── algorithms/         # VBD + algorithms (see ./algorithms/AGENTS.md)
│   │   │   └── monte-carlo/    # Draft simulation (see ./monte-carlo/AGENTS.md)
│   │   ├── sleeper/            # Sleeper API client (see ./sleeper/AGENTS.md)
│   │   ├── supabase/           # Auth + DB (see ./supabase/AGENTS.md)
│   │   ├── draft/              # Draft state (Context + reducer)
│   │   ├── projections/        # Projection data layer (CSV upload)
│   │   ├── ai/                 # Groq AI (llama-3.3-70b-versatile, 30 req/min)
│   │   └── adp/                # ADP from FantasyFootballCalculator
│   ├── hooks/                  # Custom hooks (see ./hooks/AGENTS.md)
│   └── tests/                  # Vitest setup + unit tests
├── tests/e2e/                  # Playwright E2E tests (see ./tests/e2e/AGENTS.md)
├── supabase/migrations/        # SQL migrations
└── docs/plan/                  # Phase planning (00-overview.md is index)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new page | `src/app/(dashboard)/[feature]/page.tsx` | Copy existing structure |
| Add UI component | `src/components/ui/` | Use `npx shadcn@latest add [component]` |
| Add animation | `src/components/animation/` | Export from index.ts, see AGENTS.md |
| Sleeper API call | `src/lib/sleeper/client.ts` | Rate-limited (16 req/sec), see AGENTS.md |
| DB query | `src/lib/supabase/server.ts` | Use `createClient()` in server |
| Auth check | `src/app/(dashboard)/layout.tsx` | Layout redirects to /login |
| VBD algorithm | `src/lib/algorithms/vbd.ts` | Pure function, see AGENTS.md |
| Monte Carlo sim | `src/lib/algorithms/monte-carlo/` | See monte-carlo/AGENTS.md |
| Draft state | `src/lib/draft/state.tsx` | React Context + reducer |
| Add unit test | `src/tests/unit/*.test.tsx` | Vitest + Testing Library |
| Add E2E test | `tests/e2e/*.spec.ts` | Playwright, see AGENTS.md |
| Planning docs | `docs/plan/00-overview.md` | Start here for project context |
| Server action | `src/app/(dashboard)/*/actions.ts` | `'use server'` files |
| API route | `src/app/api/*/route.ts` | Returns `NextResponse.json()` |

## DATA FLOW

```
CLIENT → API ROUTES → [Sleeper API | Supabase | Groq AI]

Caching (3-tier):
  Tier 1 - Supabase TTL:
    Players: 24h | League: 1h | Rosters: 15m | Matchups: 5m | Draft: 0 (real-time)
  Tier 2 - React cache():
    Request deduplication for RSC (src/lib/sleeper/dedup.ts)
  Tier 3 - Algorithm cache:
    SHA256 key with projection version, 1h TTL
    
AI Explanations: Cached indefinitely (SHA256 of inputs)
```

## CONVENTIONS

### TypeScript
- Strict mode enabled
- Path aliases: `@/*` → `./src/*`
- No `as any`, `@ts-ignore`, `@ts-expect-error` in production code
- Types in `types.ts` files, never inline

### File Naming
- kebab-case: `player-card.tsx`, `use-celebration.ts`
- PascalCase exports: `PlayerCard`, `FadeIn`
- Barrel exports via `index.ts` in lib modules

### Components
- Server Components by default
- `'use client'` only when needed (hooks, events, browser APIs)
- shadcn/ui in `components/ui/` - do not modify directly
- `motion/react` library (not framer-motion)
- Named exports only (no default exports)
- **Performance**: Use `next/dynamic` for lazy loading heavy client components (Builder, Optimizer) with `Skeleton` fallbacks.
- **Animations**: Avoid `motion.div` in virtualized lists or LCP elements.

### App Router
- Route groups: `(auth)` = public, `(dashboard)` = protected, `(sandbox)` = public demo
- Server Actions in `actions.ts` files (`'use server'`)
- API routes return `NextResponse.json()`
- Dynamic route params: use `await params` (Next.js 15+ pattern)

### Styling
- Tailwind CSS v4 with `@theme` in globals.css (no tailwind.config.ts)
- OKLch colors (Balatro-inspired dark theme)
- `cn()` from `@/lib/utils` for conditional classes
- Mobile-first: base = mobile, `md:` = desktop

### Testing
- VBD algorithm: 100% coverage required (97% branches, 100% functions/lines/statements)
- Mock factories: `createMock*()` functions for test data
- MSW for E2E API mocking (via `ENABLE_MSW=true`)
- E2E browsers: Chromium + Mobile Safari (iPhone 13)
- **E2E Pattern**: Use `data-testid` for all interactive elements and lists.
- **Mobile E2E**: Use `dispatchEvent('click')` instead of `click()` in tests to avoid interception by fixed navigation elements.
- **Wait Strategies**: Use 300-500ms waits after interactions that trigger debounced state changes.

### State Management
- Complex state: Context + useReducer (DraftStateProvider)
- Simple state: Context + useState (AuthProvider)
- Encapsulated logic: Custom hooks in `src/hooks/`
- SSR safety: Check `typeof window !== 'undefined'`

## ANTI-PATTERNS

- **DO NOT** call Sleeper API from components - use `src/lib/sleeper/client.ts`
- **DO NOT** create Supabase clients manually - use `createClient()` helpers
- **DO NOT** skip auth in dashboard routes - layout handles it
- **DO NOT** add animations without checking `src/components/animation/index.ts`
- **DO NOT** hardcode NFL season - use `getCurrentSeason()`
- **DO NOT** bypass rate limiter for Sleeper API (16 req/sec)
- **DO NOT** fetch all players on every request - cache 24h minimum
- **DO NOT** use `framer-motion` - use `motion/react`
- **DO NOT** use deep imports (`@/lib/sleeper/client`) - use barrel (`@/lib/sleeper`)
- **DO NOT** skip `await` on server client creation
- **DO NOT** use default exports - use named exports only

## SECURITY

### Rate Limiting
- Sleeper API: 16 req/sec (enforced in `src/lib/sleeper/client.ts`)
- AI API: 30 req/min (enforced in `src/lib/ai/rate-limiter.ts`)

### CSP Policy
- Configured in `next.config.ts` headers
- Dev: allows local Supabase (`http://127.0.0.1:54321`)
- Prod: only remote (`https://*.supabase.co`)
- Allows: Sleeper API (`api.sleeper.app`), Groq (`api.groq.com`)
- Blocks framing (`X-Frame-Options: DENY`)

### Environment Variables
- Server-only secrets: No `NEXT_PUBLIC_` prefix (e.g., `GROQ_API_KEY`)
- Client-safe values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## DATABASE

Tables (Supabase Postgres):
- `profiles` - User profile + Sleeper connection
- `leagues` - Cached league data (1h TTL)
- `user_leagues` - User-league associations
- `rosters` - Cached roster data (15m TTL)
- `players` - Player data with projections (24h TTL)
- `matchups` - Weekly matchup data (5m TTL)
- `algorithm_outputs` - Saved algorithm results + AI explanations

Migrations in `supabase/migrations/`. Types in `src/lib/supabase/types.ts`.

## COMMANDS

### Development
```bash
pnpm dev                    # Dev server (Turbopack) at localhost:3000
pnpm build                  # Production build (standalone output)
pnpm start                  # Start production server
pnpm lint                   # ESLint check
pnpm lint:fix               # Auto-fix ESLint issues
pnpm type-check             # TypeScript strict mode check
pnpm validate               # type-check + lint + test:run (CI pipeline)
```

### Testing
```bash
pnpm test                   # Vitest watch mode
pnpm test:run               # Vitest single run
pnpm test:coverage          # Coverage report (VBD: 97% branches, 100% func/lines)
pnpm test:e2e               # Playwright (Chromium + Mobile Safari)
pnpm test:e2e --project=chromium      # Chromium only
pnpm test:e2e --project="Mobile Safari"  # Mobile only
pnpm test:e2e --debug       # Debug mode with browser visible
pnpm test:e2e:ui            # Playwright UI mode
```

### Database (Supabase)
```bash
pnpm db:start               # Start local Supabase (required before dev)
pnpm db:stop                # Stop local Supabase
pnpm db:reset               # Reset DB + apply migrations
pnpm db:push                # Push migrations to remote
pnpm db:diff                # Generate migration from schema changes
pnpm types:generate         # Generate TypeScript types from schema
```

### UI Components (shadcn)
```bash
npx shadcn@latest add button     # Add shadcn component (New York style)
npx shadcn@latest add card       # Components go to src/components/ui/
npx shadcn@latest add dialog     # DO NOT modify generated files
```

### Environment Setup
```bash
# Required before first run:
pnpm install                # Install dependencies (pnpm 10.28.1+ required)
cp .env.example .env.local  # Create local env file
pnpm db:start               # Start Supabase
pnpm types:generate         # Generate DB types
pnpm dev                    # Start dev server
```

## TESTING

| Type | Framework | Location | Pattern |
|------|-----------|----------|---------|
| Unit | Vitest + Testing Library | `src/tests/unit/` | `*.test.tsx` |
| E2E | Playwright | `tests/e2e/` | `*.spec.ts` |

- VBD algorithm: 100% coverage required
- Mock factories: `createMock*()` functions for test data
- MSW for E2E API mocking (via `ENABLE_MSW=true`)
- E2E browsers: Chromium + Mobile Safari (iPhone 13)
- **E2E Pattern**: Use `data-testid` for all interactive elements and lists.
- **Mobile E2E**: Use `dispatchEvent('click')` instead of `click()` in tests to avoid interception by fixed navigation elements.
- **Wait Strategies**: Use 300-500ms waits after interactions that trigger debounced state changes.

## DEPLOYMENT

- **Platform:** Fly.io (not Vercel)
- **Output:** Standalone Next.js
- **CI:** GitHub Actions - type-check → lint → test → build → E2E
- **Deploy:** Push to `main` triggers `fly deploy`
- **Region:** San Jose (sjc), shared-cpu-1x, 256MB
- **PWA:** Enabled with Workbox runtime caching

## ARCHITECTURE PATTERNS

### Algorithm Layer
- **Pure functions**: `vbd.ts`, `lineup.ts`, `trade.ts`, `waivers.ts` (no side effects)
- **Orchestrators**: `calculate-*-for-league.ts` (fetch data → call pure fn → cache)
- **Sub-modules**: `monte-carlo/` has own barrel + types

### API Routes
- Auth check first: `supabase.auth.getUser()` → 401 if unauthorized
- Typed request body: `const body = (await request.json()) as RequestBody`
- Console logging: `[RouteName]` prefix for filtering

### Component Organization
- Barrel exports: `index.ts` in animation, players, trade, roster, waiver
- No barrel in: draft (page-specific), layout, providers, ui (shadcn)

## NOTES

- React 19 + Next.js 16
- pnpm required (v10.28.x)
- Node 22+ required
- Turbopack in dev
- Player sync: 60s timeout
- Sleeper: 16 req/sec rate limit
- AI: llama-3.3-70b-versatile via Groq
- PWA: offline support with route-specific caching strategies
