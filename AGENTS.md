# QUANTASY - PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-25
**Commit:** caf9ffd
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
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── animation/          # Balatro-inspired primitives (see ./animation/AGENTS.md)
│   │   ├── ui/                 # shadcn/ui (New York style) - DO NOT MODIFY
│   │   ├── draft/              # Draft Assistant UI (see ./draft/AGENTS.md)
│   │   ├── layout/             # Responsive nav (mobile-first)
│   │   ├── players/            # Player cards/lists
│   │   └── providers/          # AuthProvider context
│   ├── lib/
│   │   ├── algorithms/         # VBD + planned algorithms (see ./algorithms/AGENTS.md)
│   │   ├── sleeper/            # Sleeper API client (see ./sleeper/AGENTS.md)
│   │   ├── supabase/           # Auth + DB (client.ts, server.ts, middleware.ts)
│   │   ├── draft/              # Draft state (Context + reducer)
│   │   ├── projections/        # Projection data layer (CSV upload)
│   │   └── ai/                 # Groq AI integration
│   ├── hooks/                  # use-celebration, use-draft-sync, use-connection-status, use-reduced-motion
│   └── tests/                  # Vitest setup + unit tests
├── tests/e2e/                  # Playwright E2E tests
├── supabase/migrations/        # SQL migrations
└── docs/plan/                  # Phase planning (00-overview.md is index)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new page | `src/app/(dashboard)/[feature]/page.tsx` | Copy existing structure |
| Add UI component | `src/components/ui/` | Use `npx shadcn@latest add [component]` |
| Add animation | `src/components/animation/` | Export from index.ts, see AGENTS.md |
| Sleeper API call | `src/lib/sleeper/client.ts` | Rate-limited, see sleeper/AGENTS.md |
| DB query | `src/lib/supabase/server.ts` | Use `createClient()` in server |
| Auth check | `src/app/(dashboard)/layout.tsx` | Layout redirects to /login |
| VBD algorithm | `src/lib/algorithms/vbd.ts` | See algorithms/AGENTS.md |
| Draft state | `src/lib/draft/state.tsx` | React Context + reducer |
| Add unit test | `src/tests/unit/*.test.tsx` | Vitest + Testing Library |
| Add E2E test | `tests/e2e/*.spec.ts` | Playwright |
| Planning docs | `docs/plan/00-overview.md` | Start here for project context |

## CONVENTIONS

### TypeScript
- Strict mode enabled
- Path aliases: `@/*` → `./src/*`
- No `as any`, `@ts-ignore`, `@ts-expect-error`

### File Naming
- kebab-case: `player-card.tsx`, `use-celebration.ts`
- PascalCase exports: `PlayerCard`, `FadeIn`
- Barrel exports via `index.ts` in feature directories

### Components
- Server Components by default
- `'use client'` only when needed (hooks, events, browser APIs)
- shadcn/ui in `components/ui/` - do not modify directly
- Motion library (not framer-motion)

### App Router
- Route groups: `(auth)` = public, `(dashboard)` = protected
- Server Actions in `actions.ts` files
- API routes return `NextResponse.json()`

### Styling
- Tailwind CSS v4 with CSS variables
- `cn()` from `@/lib/utils` for conditional classes
- Mobile-first: base = mobile, `md:` = desktop

## ANTI-PATTERNS

- **DO NOT** call Sleeper API from components - use `src/lib/sleeper/client.ts`
- **DO NOT** create Supabase clients manually - use `createClient()` helpers
- **DO NOT** skip auth in dashboard routes - layout handles it
- **DO NOT** add animations without checking `src/components/animation/index.ts`
- **DO NOT** hardcode NFL season - use `getCurrentSeason()`
- **DO NOT** bypass rate limiter for Sleeper API (16 req/sec)
- **DO NOT** fetch all players on every request - cache 24h minimum

## SECURITY

### Dependency Updates
- Security patches: Apply immediately via `pnpm audit fix` or manual upgrade
- Run `npx fix-react2shell-next --dry-run` after any React/Next.js updates
- Framework versions (next, react) are pinned to exact versions
- Dependabot configured in `.github/dependabot.yml` for weekly updates

### CSP Policy
- Configured in `next.config.ts` headers
- Allows: Supabase (`*.supabase.co`), Sleeper API (`api.sleeper.app`), Groq (`api.groq.com`)
- Blocks framing (`X-Frame-Options: DENY`) and restricts form submissions

### Environment Variables
- Server-only secrets: No `NEXT_PUBLIC_` prefix (e.g., `GROQ_API_KEY`)
- Client-safe values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Anon key is designed for client use with Row Level Security (RLS)

### Rate Limiting
- Sleeper API: 16 req/sec (enforced in `src/lib/sleeper/client.ts`)
- AI API: 30 req/min (enforced in `src/lib/ai/rate-limiter.ts`)

## DATABASE

Tables (Supabase Postgres):
- `profiles` - User profile + Sleeper connection
- `leagues` - Cached league data
- `user_leagues` - User-league associations
- `rosters` - Cached roster data
- `players` - Player data with projections
- `matchups` - Weekly matchup data
- `algorithm_outputs` - Saved algorithm results

Migrations in `supabase/migrations/`. Types in `src/lib/supabase/types.ts`.

## COMMANDS

```bash
pnpm dev              # Dev server (Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm type-check       # TypeScript check
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright E2E
```

## TESTING

| Type | Framework | Location | Pattern |
|------|-----------|----------|---------|
| Unit | Vitest + Testing Library | `src/tests/unit/` | `*.test.tsx` |
| E2E | Playwright | `tests/e2e/` | `*.spec.ts` |

- VBD algorithm: 100% coverage required (functions/lines/statements)
- E2E: Chromium + Mobile Safari (iPhone 13)
- MSW for API mocking in E2E

## DEPLOYMENT

- **Platform:** Fly.io (not Vercel)
- **Output:** Standalone Next.js
- **CI:** GitHub Actions - type-check → lint → test → build
- **Deploy:** Push to `main` triggers `fly deploy`

## NOTES

- React 19 + Next.js 16
- pnpm required (v10.28.1)
- Turbopack in dev
- Player sync: 60s timeout
- Sleeper: 16 req/sec rate limit
