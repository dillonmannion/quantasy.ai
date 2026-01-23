# Final File Structure

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete project layout reference for implementation

---

## Directory Structure

```
qai/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── auth/
│   │   │       └── callback/
│   │   │           └── route.ts
│   │   ├── (dashboard)/              # Protected routes
│   │   │   ├── layout.tsx            # Dashboard layout with nav
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── draft/
│   │   │   │   ├── page.tsx
│   │   │   │   └── assistant/
│   │   │   │       └── page.tsx
│   │   │   ├── roster/
│   │   │   │   └── page.tsx
│   │   │   ├── trade/
│   │   │   │   └── page.tsx
│   │   │   └── waivers/
│   │   │       └── page.tsx
│   │   ├── api/                      # API routes
│   │   │   ├── sleeper/
│   │   │   │   └── sync/
│   │   │   │       └── route.ts
│   │   │   └── algorithms/
│   │   │       ├── vbd/
│   │   │       │   └── route.ts
│   │   │       ├── lineup/
│   │   │       │   └── route.ts
│   │   │       └── trade/
│   │   │           └── route.ts
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   └── globals.css               # Global styles + CSS variables
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── animation/                # Animation primitives
│   │   │   ├── fade-in.tsx
│   │   │   ├── stagger-list.tsx
│   │   │   ├── card-flip.tsx
│   │   │   ├── kaching.tsx
│   │   │   ├── score-counter.tsx
│   │   │   └── shimmer.tsx
│   │   ├── layout/                   # Layout components
│   │   │   ├── mobile-nav.tsx
│   │   │   ├── desktop-sidebar.tsx
│   │   │   ├── page-header.tsx
│   │   │   └── page-container.tsx
│   │   ├── players/                  # Player-related components
│   │   │   ├── player-card.tsx
│   │   │   ├── player-list.tsx
│   │   │   └── player-picker.tsx
│   │   ├── draft/
│   │   │   ├── rankings-table.tsx
│   │   │   ├── vbd-badge.tsx
│   │   │   └── draft-board.tsx
│   │   ├── roster/
│   │   │   ├── lineup-comparison.tsx
│   │   │   └── roster-grid.tsx
│   │   ├── trade/
│   │   │   ├── trade-builder.tsx
│   │   │   ├── fairness-meter.tsx
│   │   │   └── trade-explanation.tsx
│   │   ├── waivers/
│   │   │   ├── waiver-list.tsx
│   │   │   └── faab-slider.tsx
│   │   └── transparency/             # "Show Your Work" components
│   │       ├── explanation-panel.tsx
│   │       ├── calculation-step.tsx
│   │       └── methodology-card.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   ├── middleware.ts         # Auth middleware
│   │   │   └── types.ts              # Generated types
│   │   ├── sleeper/
│   │   │   ├── client.ts             # Sleeper API client
│   │   │   ├── types.ts              # Sleeper response types
│   │   │   ├── sync.ts               # Sync functions
│   │   │   └── cache.ts              # Cache management
│   │   ├── algorithms/
│   │   │   ├── vbd.ts
│   │   │   ├── lineup.ts
│   │   │   ├── trade.ts
│   │   │   ├── waivers.ts
│   │   │   └── types.ts              # Shared algorithm types
│   │   └── utils/
│   │       ├── cn.ts                 # classNames utility
│   │       └── format.ts             # Number/date formatting
│   │
│   └── hooks/
│       ├── use-celebration.ts
│       ├── use-league.ts
│       └── use-roster.ts
│
├── supabase/
│   ├── migrations/                   # Database migrations
│   │   └── 001_initial_schema.sql
│   └── functions/                    # Edge functions (if needed)
│       └── sync-players/
│           └── index.ts
│
├── docs/
│   ├── PLAN.md                       # Original plan (preserved)
│   ├── PLAN-v2.md                    # Full monolithic plan
│   ├── PLAN-comments.md              # Critiques of v1
│   ├── init-roadmap.md               # Stage overview
│   ├── plan/                         # Sectioned plan documents
│   │   ├── 00-overview.md
│   │   ├── 01-tech-stack.md
│   │   ├── 02-database-schema.md
│   │   ├── 03-animation-system.md
│   │   ├── 04-file-structure.md
│   │   ├── 05-deferred-risks.md
│   │   ├── phase-0-foundation.md
│   │   ├── phase-1-data-layer.md
│   │   ├── phase-2-draft-assistant.md
│   │   ├── phase-3-roster-trade.md
│   │   ├── phase-4-waivers-polish.md
│   │   └── phase-5-alpha-testing.md
│   └── algorithms/                   # User-facing algorithm docs
│       ├── vbd.md
│       ├── lineup.md
│       ├── trade.md
│       └── waivers.md
│
├── tests/
│   ├── unit/
│   │   ├── algorithms/
│   │   │   ├── vbd.test.ts
│   │   │   ├── lineup.test.ts
│   │   │   └── trade.test.ts
│   │   └── components/
│   │       └── animation.test.tsx
│   └── e2e/
│       ├── auth.spec.ts
│       ├── connect-league.spec.ts
│       ├── draft-assistant.spec.ts
│       └── trade-calculator.spec.ts
│
├── public/
│   └── (static assets)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Run tests on PR
│       └── deploy.yml                # Deploy on merge to main
│
├── fly.toml                          # Fly.io configuration
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## Directory Purposes

### `/src/app`
Next.js App Router pages and API routes. Route groups `(auth)` and `(dashboard)` separate public and protected routes.

### `/src/components`
React components organized by domain:
- `ui/` - shadcn/ui base components
- `animation/` - Framer Motion animation primitives
- `layout/` - Page structure components
- `players/`, `draft/`, `roster/`, `trade/`, `waivers/` - Feature-specific components
- `transparency/` - "Show Your Work" explanation components

### `/src/lib`
Shared utilities and business logic:
- `supabase/` - Database client and auth helpers
- `sleeper/` - External API integration
- `algorithms/` - Core algorithm implementations
- `utils/` - General utilities

### `/src/hooks`
Custom React hooks for state management and side effects.

### `/supabase`
Supabase-specific configuration:
- `migrations/` - SQL migration files
- `functions/` - Edge functions (if needed)

### `/docs`
Project documentation including this plan and algorithm explanations.

### `/tests`
Test files organized by type:
- `unit/` - Vitest unit tests
- `e2e/` - Playwright end-to-end tests

---

## Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Usage:
```typescript
import { Button } from '@/components/ui/button';
import { calculateVBD } from '@/lib/algorithms/vbd';
import { useCelebration } from '@/hooks/use-celebration';
```

---

## Related Documents

- [phase-0-foundation.md](./phase-0-foundation.md) - Initial scaffolding
- [01-tech-stack.md](./01-tech-stack.md) - Technology decisions
