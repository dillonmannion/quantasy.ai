# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Quantasy (`qai`) — fantasy football decision assistant with algorithmic transparency ("Show Your Work"). Integrates with Sleeper API for league data. Stage 1 alpha targeting 5-10 testers.

## Commands

```bash
pnpm dev              # Dev server (Turbopack) at localhost:3000
pnpm build            # Production build (standalone output)
pnpm validate         # type-check + lint + test (CI pipeline)
pnpm type-check       # tsc --noEmit (strict mode)
pnpm lint             # ESLint
pnpm lint:fix         # ESLint auto-fix
pnpm test             # Vitest watch mode
pnpm test:run         # Vitest single run
pnpm test:coverage    # Coverage report (algorithms only)
pnpm test:e2e         # Playwright (Chromium + Mobile Safari)
pnpm test:e2e:ui      # Playwright UI mode

# Database (Supabase)
pnpm db:start / db:stop / db:reset / db:push / db:diff
pnpm types:generate   # Generate TS types from schema
```

Run a single unit test: `pnpm vitest run src/tests/unit/some-file.test.tsx`
Run a single E2E test: `pnpm playwright test tests/e2e/some-file.spec.ts`

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · pnpm · Node 24 · Tailwind CSS v4 · shadcn/ui (New York) · motion/react · Supabase (Postgres + Auth) · Groq AI · Sentry · PostHog · Vitest · Playwright · Fly.io

## Architecture

**Route groups:** `(auth)` = public, `(dashboard)` = protected (auth check in layout), `(sandbox)` = public demo

**Algorithm layer** (`src/lib/algorithms/`):
- Pure functions: `vbd.ts`, `lineup.ts`, `trade.ts`, `waivers.ts` — no side effects, unit tested
- Orchestrators: `calculate-*-for-league.ts` — fetch data → call pure fn → cache result
- SHA256-keyed cache with 1h TTL

**3-tier caching:**
1. Supabase TTL cache (Players 24h, Leagues 1h, Rosters 15m, Matchups 5m)
2. React `cache()` for RSC request dedup (`src/lib/sleeper/dedup.ts`)
3. Algorithm output cache with SHA256 key + projection version

**Data flow:** Client → API routes → Sleeper API | Supabase | Groq AI

**API route pattern:** auth check → typed body parse → `[RouteName]` console logging → Sentry span

## Conventions

- **Named exports only** — no default exports
- **Server Components by default** — `'use client'` only when needed
- **Path alias:** `@/*` → `./src/*`
- **Barrel imports:** use `@/lib/sleeper`, not `@/lib/sleeper/client`
- **File naming:** kebab-case (`player-card.tsx`), PascalCase exports (`PlayerCard`)
- **Types:** in dedicated `types.ts` files per module
- **Styling:** Tailwind v4 with `@theme` in `globals.css` (no tailwind.config), `cn()` from `@/lib/utils`, mobile-first (`md:` = desktop)
- **Animation:** `motion/react` — NOT `framer-motion`
- **shadcn/ui:** lives in `src/components/ui/` — do not modify directly; add new via `npx shadcn@latest add [component]`
- **State:** Context + useReducer for complex (DraftStateProvider), Context + useState for simple (AuthProvider)
- **Commits:** Conventional Commits (`type(scope): description`), imperative mood, ≤72 chars, no period

## Anti-Patterns

- Don't call Sleeper API from components — use `src/lib/sleeper/client.ts`
- Don't create Supabase clients manually — use the helpers in `src/lib/supabase/`
- Don't skip `await` on server Supabase client creation
- Don't hardcode NFL season — use `getCurrentSeason()`
- Don't bypass rate limiters (Sleeper: 16 req/sec, AI: 30 req/min)
- Don't use `as any`, `@ts-ignore`, `@ts-expect-error`

## Testing

- **Unit tests:** `src/tests/unit/*.test.tsx`, Vitest + jsdom + Testing Library
- **VBD coverage:** 97% branches, 100% functions/lines/statements enforced
- **E2E:** `tests/e2e/*.spec.ts`, Playwright, Chromium + Mobile Safari (iPhone 13), MSW mocking via `ENABLE_MSW=true`
- **E2E selectors:** use `data-testid` for interactive elements
- **E2E mobile:** use `dispatchEvent('click')` to avoid nav interception; 300-500ms waits after debounced state changes

## Branching

- `prod` — production branch, push triggers Fly.io deploy
- `dev` — development branch
- PRs target `prod` or `dev`; CI runs type-check → lint → test → build → E2E (3 shards)

## Key Directories

- `src/lib/algorithms/` — pure algorithm functions + orchestrators
- `src/lib/sleeper/` — Sleeper API client with rate limiting + caching
- `src/lib/supabase/` — DB client helpers (server.ts, client.ts, admin.ts)
- `src/lib/ai/` — Groq integration with rate limiter
- `src/lib/external/` — Third-party values (KTC, Dynasty Process, FantasyCalc)
- `src/lib/gamification/` — Achievements, counters, streaks
- `src/lib/projections/` — Projection data (CSV upload + bundled JSON)
- `src/components/ui/` — shadcn/ui (auto-generated, don't edit)
- `supabase/migrations/` — consolidated initial schema
- `docs/` — planning, algorithm docs, feature refs
- `AGENTS.md` — comprehensive project knowledge base (detailed reference)
