# 🏈 Quantasy Stage 1: MVP of the MVP (v2)
## REVISED IMPLEMENTATION PLAN

> **Revision Note:** This plan supersedes PLAN.md, addressing critiques in PLAN-comments.md
> and incorporating research on API reliability, realistic timelines, and optimal tech stack.

---

## 📋 Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | Original | Initial plan with Remix, ESPN API, 8-week timeline |
| v2.0 | Current | Next.js stack, Sleeper-only, 12-week timeline, mobile-first |

---

## 🎯 Stage 1 Vision

**Goal:** A proof-of-concept SSR website for testing draft, roster, waiver, and trade 
algorithms with friends and family who all use Sleeper.

**Success Criteria:**
- [ ] 5-10 alpha testers can connect their Sleeper leagues
- [ ] All 4 core tools functional (Draft, Roster, Trade, Waivers)
- [ ] Mobile experience is primary, desktop is enhanced
- [ ] "Show Your Work" transparency for all algorithm outputs
- [ ] Balatro-inspired animations make data feel rewarding
- [ ] Zero critical bugs during 2-week testing period

**Non-Goals for Stage 1:**
- ESPN/Yahoo league support (deferred to Stage 2)
- Python-based ML algorithms (deferred to Stage 2)
- Live real-time draft rooms (deferred to Stage 2)
- Monetization features (deferred to Stage 3)

---

## ✅ Confirmed Technology Decisions

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | Best ecosystem for animations + UI components; SSR by default; excellent Supabase/Vercel patterns |
| **Styling** | Tailwind CSS v4 | Mobile-first utilities; animation-friendly; fastest iteration speed |
| **UI Components** | shadcn/ui (Radix primitives) | Accessible, customizable, animation-friendly; copy-paste ownership |
| **Animations** | Framer Motion | Best React animation library for "juice"; variants, layout animations, gestures |
| **Database** | Supabase (Postgres) | Auth, DB, Realtime in one; generous free tier; excellent DX |
| **Hosting** | Fly.io | Global edge, simple deploys, predictable pricing |
| **Data Source** | Sleeper API | Official, documented, generous rate limits (1000/min), all testers use it |
| **Historical Data** | nflreadpy (nflverse) | Free NFL historical stats; MIT licensed; Python but pre-computed data |
| **Language** | TypeScript (strict mode) | Type safety prevents bugs; Stage 1 is TS-only |
| **Testing** | Vitest + Playwright | Fast unit tests + E2E for critical paths |
| **Auth** | Supabase Auth (or Clerk) | Evaluate during Phase 0; leaning Supabase for unified stack |

---

## 💰 Estimated Costs (Monthly)

| Service | Free Tier | Expected Cost | Notes |
|---------|-----------|---------------|-------|
| Fly.io | 3 shared VMs free | $0-5 | Single region, auto-stop when idle |
| Supabase | 500MB DB, 1GB storage | $0 | Free tier sufficient for alpha |
| Domain | N/A | $12/year | Optional for alpha |
| **Total** | — | **$0-5/mo** | Stage 1 can run entirely free |

**Cost Escalation Triggers:**
- Adding Python workers: +$5-10/mo (separate Fly machine)
- Supabase Pro (if > 500MB): $25/mo
- High traffic (unlikely in alpha): Variable

---

## 🎨 Design Philosophy

### Visual Identity: "Balatro Meets Fantasy Football"

**Core Aesthetic:**
- Dark purple-black backgrounds (#1a1a2e)
- Gold accents for wins/value (#ffd700)
- Card-based UI with subtle depth
- Satisfying micro-interactions on every action
- Data reveals feel like "loot drops"

**Animation Principles:**
1. **Purposeful** — Animations convey meaning (win = celebration, loss = subdued)
2. **Performant** — Prefer transform/opacity; respect `prefers-reduced-motion`
3. **Consistent** — Reusable primitives, not one-off effects
4. **Mobile-first** — Test on low-end devices; no heavy blur/shadows

**Responsive Strategy:**
- Mobile breakpoint: Default (< 768px)
- Tablet: md (768px+)
- Desktop: lg (1024px+)
- All layouts start mobile, enhance upward

---


## 🗄️ Supabase Schema Design

> **⚠️ Re-evaluate When Implementing:** This schema is a starting point. 
> Adjust based on actual Sleeper API response shapes and feature needs.

### Core Tables

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sleeper_user_id TEXT UNIQUE,
  sleeper_username TEXT,
  sleeper_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leagues (cached from Sleeper)
CREATE TABLE public.leagues (
  id TEXT PRIMARY KEY, -- Sleeper league_id
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  status TEXT, -- 'pre_draft', 'drafting', 'in_season', 'complete'
  settings JSONB, -- scoring settings, roster positions, etc.
  scoring_settings JSONB,
  roster_positions JSONB,
  total_rosters INTEGER,
  cached_at TIMESTAMPTZ DEFAULT now()
);

-- User-League associations
CREATE TABLE public.user_leagues (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER, -- user's roster number in this league
  is_owner BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, league_id)
);

-- Rosters (cached from Sleeper)
CREATE TABLE public.rosters (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER NOT NULL,
  owner_id TEXT, -- Sleeper user_id
  players TEXT[], -- array of player_ids
  starters TEXT[], -- array of player_ids in starting lineup
  reserve TEXT[], -- IR slots
  settings JSONB, -- wins, losses, points, etc.
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, roster_id)
);

-- Players (master list, synced from nflverse/Sleeper)
CREATE TABLE public.players (
  id TEXT PRIMARY KEY, -- Sleeper player_id
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  team TEXT, -- NFL team abbreviation
  position TEXT, -- QB, RB, WR, TE, K, DEF
  age INTEGER,
  years_exp INTEGER,
  status TEXT, -- Active, Inactive, IR, etc.
  injury_status TEXT,
  -- Projection data (updated weekly during season)
  projected_points DECIMAL(6,2),
  projection_source TEXT,
  projection_updated_at TIMESTAMPTZ,
  -- Metadata
  sleeper_data JSONB, -- raw Sleeper player object
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Matchups (cached from Sleeper, per week)
CREATE TABLE public.matchups (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  matchup_id INTEGER NOT NULL, -- Sleeper's matchup pairing ID
  roster_id INTEGER NOT NULL,
  points DECIMAL(8,2),
  starters TEXT[],
  starters_points DECIMAL(6,2)[],
  players TEXT[],
  players_points JSONB, -- {player_id: points}
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, week, roster_id)
);

-- Algorithm Results (for "Show Your Work" transparency)
CREATE TABLE public.algorithm_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  algorithm_type TEXT NOT NULL, -- 'vbd', 'trade_value', 'waiver_priority', 'lineup_optimizer'
  input_params JSONB NOT NULL, -- what was fed into the algorithm
  output_data JSONB NOT NULL, -- recommendations, scores, etc.
  explanation JSONB NOT NULL, -- step-by-step breakdown for transparency
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_rosters_league ON public.rosters(league_id);
CREATE INDEX idx_matchups_league_week ON public.matchups(league_id, week);
CREATE INDEX idx_players_team ON public.players(team);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_algorithm_outputs_user ON public.algorithm_outputs(user_id, algorithm_type);
```

### Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_outputs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see leagues they're in
CREATE POLICY "Users can view their leagues" ON public.user_leagues
  FOR SELECT USING (auth.uid() = user_id);

-- Algorithm outputs are private to user
CREATE POLICY "Users can view own algorithm outputs" ON public.algorithm_outputs
  FOR SELECT USING (auth.uid() = user_id);

-- Leagues, rosters, players, matchups are public read (cached data)
-- No RLS needed for read-only cached data
```

### Supabase Functions (Edge Functions)

supabase/functions/
├── sync-league/        # Fetch league data from Sleeper, update cache
├── sync-players/       # Bulk update players table (weekly cron)
├── calculate-vbd/      # VBD algorithm with transparency output
├── optimize-lineup/    # Greedy lineup optimizer
└── evaluate-trade/     # Trade value comparison
```

---


## 🎬 Animation System Specification

### Design Tokens (CSS Variables)

```css
/* app/globals.css */
:root {
  /* Balatro-inspired palette */
  --color-bg-primary: #1a1a2e;
  --color-bg-card: #2d2d44;
  --color-bg-elevated: #3d3d5c;
  
  --color-accent-gold: #ffd700;
  --color-accent-red: #ff6b6b;
  --color-accent-green: #4ade80;
  --color-accent-blue: #4facfe;
  --color-accent-purple: #a855f7;
  --color-accent-pink: #ec4899;
  
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0b0;
  --color-text-muted: #6b6b7b;
  
  /* Animation durations */
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-dramatic: 800ms;
  
  /* Spring configs (for Framer Motion) */
  --spring-bouncy: { stiffness: 400, damping: 25 };
  --spring-smooth: { stiffness: 300, damping: 30 };
  --spring-gentle: { stiffness: 200, damping: 20 };
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0ms;
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
    --duration-dramatic: 0ms;
  }
}
```

### Animation Primitive Components

#### 1. `<FadeIn>` — Basic entrance animation

```tsx
// components/animation/fade-in.tsx
'use client';

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

const variants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 0.3, className }: FadeInProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

#### 2. `<StaggerList>` — Staggered children animation

```tsx
// components/animation/stagger-list.tsx
'use client';

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

export function StaggerList({ children, className }: StaggerListProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
```

#### 3. `<CardFlip>` — Balatro-style card reveal

```tsx
// components/animation/card-flip.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { type ReactNode, useState } from 'react';

interface CardFlipProps {
  front: ReactNode;
  back: ReactNode;
  isFlipped?: boolean;
  onFlip?: () => void;
  className?: string;
}

export function CardFlip({ front, back, isFlipped = false, onFlip, className }: CardFlipProps) {
  return (
    <div 
      className={`relative cursor-pointer perspective-1000 ${className}`}
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 300, damping: 30 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden">
          {front}
        </div>
        {/* Back */}
        <div 
          className="absolute inset-0 backface-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
```

#### 4. `<Kaching>` — Score/value celebration popup

```tsx
// components/animation/kaching.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface KachingProps {
  show: boolean;
  value: number | string;
  label?: string;
  variant?: 'gold' | 'green' | 'purple';
  onComplete?: () => void;
}

const colorMap = {
  gold: 'from-yellow-400 to-yellow-600 text-black',
  green: 'from-green-400 to-green-600 text-white',
  purple: 'from-purple-400 to-purple-600 text-white',
};

export function Kaching({ show, value, label, variant = 'gold', onComplete }: KachingProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.2, y: -50 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 25,
            exit: { duration: 0.3 }
          }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <div className={`
            bg-gradient-to-br ${colorMap[variant]} 
            rounded-2xl px-8 py-6 shadow-2xl
            border-4 border-white/30
          `}>
            {/* Floating particles */}
            {[...Array(5)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: (i - 2) * 40,
                  y: -60 - Math.random() * 40,
                  opacity: 0,
                }}
                transition={{ delay: i * 0.05, duration: 0.8 }}
                className="absolute text-2xl"
              >
                {variant === 'gold' ? '🪙' : variant === 'green' ? '✓' : '⭐'}
              </motion.span>
            ))}
            
            <div className="text-5xl font-black text-center">
              +{value}
            </div>
            {label && (
              <div className="text-lg font-semibold text-center mt-1 opacity-80">
                {label}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### 5. `<ScoreCounter>` — Animated number ticker

```tsx
// components/animation/score-counter.tsx
'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

interface ScoreCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function ScoreCounter({ value, duration = 1, decimals = 1, className }: ScoreCounterProps) {
  const spring = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
}
```

#### 6. `<Shimmer>` — Loading/highlight effect

```tsx
// components/animation/shimmer.tsx
'use client';

import { motion } from 'framer-motion';

interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className }: ShimmerProps) {
  return (
    <motion.div
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent ${className}`}
      animate={{ x: ['-100%', '100%'] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
    />
  );
}
```

### Animation Hooks

```tsx
// hooks/use-celebration.ts
'use client';

import { useState, useCallback } from 'react';

export function useCelebration(autoHideMs = 2000) {
  const [isShowing, setIsShowing] = useState(false);
  const [value, setValue] = useState<number | string>(0);
  const [label, setLabel] = useState<string>();

  const celebrate = useCallback((newValue: number | string, newLabel?: string) => {
    setValue(newValue);
    setLabel(newLabel);
    setIsShowing(true);

    if (autoHideMs > 0) {
      setTimeout(() => setIsShowing(false), autoHideMs);
    }
  }, [autoHideMs]);

  const hide = useCallback(() => setIsShowing(false), []);

  return { isShowing, value, label, celebrate, hide };
}
```

---


## 📅 Phase 0: Foundation & Design System (Weeks 1-2)

### Objectives
- Project scaffolding with all tooling configured
- Design system with Balatro color palette
- Animation primitives library ready for use
- Authentication flow working
- Database schema deployed
- CI/CD pipeline to Fly.io
- Mobile-first responsive foundation

### Week 1: Project Setup & Core Infrastructure

#### Day 1-2: Scaffolding
- [ ] Initialize Next.js 15 with App Router
  ```bash
  npx create-next-app@latest qai --typescript --tailwind --eslint --app --src-dir
  ```
- [ ] Configure TypeScript strict mode
- [ ] Set up path aliases (`@/components`, `@/lib`, etc.)
- [ ] Install and configure:
  - [ ] Framer Motion
  - [ ] shadcn/ui (init + base components)
  - [ ] Supabase client (`@supabase/ssr`)
  - [ ] Vitest + Testing Library
  - [ ] Playwright

#### Day 3-4: Design System
- [ ] Create Tailwind config with Balatro palette
- [ ] Set up CSS variables for theming
- [ ] Create base layout components:
  - [ ] `<MobileNav>` — bottom navigation for mobile
  - [ ] `<DesktopSidebar>` — side navigation for desktop
  - [ ] `<PageContainer>` — consistent page wrapper
  - [ ] `<Card>` — Balatro-style card component
- [ ] Implement dark mode (default, no toggle needed for MVP)

#### Day 5: Animation Primitives
- [ ] Build animation components (see Animation System Spec):
  - [ ] `<FadeIn>`
  - [ ] `<StaggerList>` + `<StaggerItem>`
  - [ ] `<CardFlip>`
  - [ ] `<Kaching>`
  - [ ] `<ScoreCounter>`
  - [ ] `<Shimmer>`
- [ ] Create `useCelebration` hook
- [ ] Test on mobile device (or emulator)
- [ ] Verify `prefers-reduced-motion` behavior

### Week 2: Auth, Database & Deployment

#### Day 1-2: Supabase Setup
- [ ] Create Supabase project
- [ ] Deploy schema (see Schema Design section)
- [ ] Set up RLS policies
- [ ] Configure Supabase Auth (email + magic link)
- [ ] Create auth helpers for Next.js App Router
- [ ] Build auth UI:
  - [ ] `/login` page with Balatro styling
  - [ ] `/auth/callback` route handler
  - [ ] Auth state provider

#### Day 3-4: Core Pages
- [ ] Landing page (`/`)
  - [ ] Hero section with animated title
  - [ ] Feature preview cards (staggered entrance)
  - [ ] "Connect with Sleeper" CTA button
  - [ ] Mobile-responsive layout
- [ ] Dashboard shell (`/dashboard`)
  - [ ] Tool grid (Draft, Roster, Trade, Waivers)
  - [ ] Empty states for unconnected leagues
  - [ ] Protected route (redirect if not authed)

#### Day 5: CI/CD & Deployment
- [ ] Configure Fly.io
  - [ ] `fly.toml` configuration
  - [ ] Environment variables (Supabase URL, keys)
  - [ ] Auto-stop for cost savings
- [ ] Set up GitHub Actions:
  - [ ] Run tests on PR
  - [ ] Deploy to Fly.io on main merge
- [ ] Verify deployment works end-to-end
- [ ] **Milestone: Empty app deployed and accessible**

### Testing Requirements (Phase 0)
| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Animation primitives | Unit (Vitest) | 100% render without error |
| Auth flow | E2E (Playwright) | Login → Dashboard redirect |
| Landing page | E2E (Playwright) | Renders on mobile viewport |
| API routes | Integration | Auth middleware blocks unauthenticated |

### Deliverables Checklist
- [ ] Repository with clean folder structure
- [ ] All animation primitives documented in Storybook (optional) or README
- [ ] Supabase schema deployed with seed data script
- [ ] Working auth flow (login → dashboard → logout)
- [ ] Landing page with animations
- [ ] CI/CD deploying to Fly.io
- [ ] Mobile-responsive at all breakpoints

### Cost Check
- Fly.io: $0 (free tier, auto-stop)
- Supabase: $0 (free tier)
- **Total: $0/mo**

---


## 📅 Phase 1: Data Layer & League Connection (Weeks 3-4)

### Objectives
- Sleeper API client with proper caching
- League connection flow ("Connect Your League")
- Player data synced from Sleeper/nflverse
- Data displayed in dashboard
- Cache invalidation strategy

### Week 3: Sleeper Integration

#### Day 1-2: Sleeper API Client
- [ ] Create typed Sleeper API client (`lib/sleeper/client.ts`)
  ```typescript
  // Key endpoints needed:
  // GET /user/{username} - get user by username
  // GET /user/{user_id}/leagues/nfl/{season} - get user's leagues
  // GET /league/{league_id} - get league details
  // GET /league/{league_id}/rosters - get all rosters
  // GET /league/{league_id}/users - get league members
  // GET /league/{league_id}/matchups/{week} - get matchups
  // GET /players/nfl - get all players (large, cache aggressively)
  ```
- [ ] Implement rate limiting (stay under 1000/min)
- [ ] Add request logging for debugging
- [ ] Create TypeScript types matching Sleeper responses

#### Day 3-4: Caching Layer
- [ ] Build cache-through pattern:
  ```
  Request → Check Supabase cache → If stale, fetch Sleeper → Update cache → Return
  ```
- [ ] Cache TTL strategy:
  | Data Type | TTL | Rationale |
  |-----------|-----|-----------|
  | Players list | 24 hours | Changes rarely |
  | League settings | 1 hour | Might change pre-season |
  | Rosters | 15 minutes | Changes during waivers |
  | Matchups | 5 minutes | Live during games |
- [ ] Create Supabase Edge Functions for sync operations
- [ ] Implement background refresh (on page load if stale)

#### Day 5: Connect League Flow
- [ ] Build "Connect League" UI:
  - [ ] Step 1: Enter Sleeper username
  - [ ] Step 2: Fetch and display user's leagues
  - [ ] Step 3: Select league(s) to connect
  - [ ] Step 4: Confirm and sync data
- [ ] Store user-league associations
- [ ] Show loading states with `<Shimmer>`
- [ ] Celebrate successful connection with `<Kaching>`

### Week 4: Player Data & Dashboard

#### Day 1-2: Player Sync
- [ ] Fetch Sleeper's player database (one-time + weekly refresh)
- [ ] Enrich with nflverse projections (if available)
- [ ] Build player search/lookup:
  - [ ] By name (fuzzy search)
  - [ ] By team
  - [ ] By position
- [ ] Player card component with:
  - [ ] Photo (Sleeper avatar or placeholder)
  - [ ] Name, team, position
  - [ ] Injury status indicator

#### Day 3-4: Dashboard Data Display
- [ ] League overview card:
  - [ ] League name, format, size
  - [ ] User's record (W-L)
  - [ ] Current week
  - [ ] Standings position
- [ ] Quick stats:
  - [ ] Points for/against
  - [ ] Roster value (placeholder for now)
- [ ] "Last synced" timestamp with refresh button
- [ ] Animate data load with `<StaggerList>`

#### Day 5: Error Handling & Edge Cases
- [ ] Handle Sleeper API errors gracefully:
  - [ ] Rate limited → Queue and retry
  - [ ] User not found → Clear error message
  - [ ] League not found → Suggest re-auth
- [ ] Offline handling:
  - [ ] Show cached data with "offline" badge
  - [ ] Queue actions for retry
- [ ] Create error boundary component
- [ ] Test with network throttling

### Testing Requirements (Phase 1)
| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Sleeper client | Unit | All endpoints mocked |
| Cache logic | Unit | TTL, invalidation, race conditions |
| Connect flow | E2E | Happy path + error states |
| Player search | Unit | Fuzzy matching accuracy |

### Deliverables Checklist
- [ ] Sleeper API client with full typing
- [ ] Cache layer with TTL management
- [ ] "Connect League" flow complete
- [ ] Players table populated
- [ ] Dashboard shows real league data
- [ ] Error states and loading states polished
- [ ] Offline indicator

### API Contract: Sleeper → Supabase

```typescript
// lib/sleeper/sync.ts

/**
 * Sync a user's leagues from Sleeper to Supabase
 * Called when: User connects, manual refresh, or cache expired
 */
async function syncUserLeagues(sleeperUserId: string, season: string): Promise<void> {
  // 1. Fetch leagues from Sleeper
  // 2. Upsert to leagues table
  // 3. Upsert to user_leagues junction
  // 4. For each league, sync rosters
}

/**
 * Sync rosters for a league
 * Called when: League synced, or roster cache expired
 */
async function syncLeagueRosters(leagueId: string): Promise<void> {
  // 1. Fetch rosters from Sleeper
  // 2. Upsert to rosters table
  // 3. Update league.cached_at
}

/**
 * Sync matchups for a specific week
 * Called when: Viewing matchups, or during live games
 */
async function syncMatchups(leagueId: string, week: number): Promise<void> {
  // 1. Fetch matchups from Sleeper
  // 2. Upsert to matchups table
}
```

---


## 📅 Phase 2: Draft Assistant (Weeks 5-6)

### Objectives
- VBD (Value-Based Drafting) algorithm in TypeScript
- Draft assistant UI with player rankings
- "Show Your Work" transparency panel
- Balatro-style animations for picks
- Works for upcoming drafts (pre-season use case)

### Week 5: VBD Algorithm

#### Day 1-2: VBD Implementation
- [ ] Research and document VBD formula:
  ```
  VBD = Player's Projected Points - Baseline Player's Projected Points
  
  Baseline = The last starter at that position
  Example (12-team, 1QB): QB12 is baseline for QBs
  ```
- [ ] Create algorithm module (`lib/algorithms/vbd.ts`):
  ```typescript
  interface VBDInput {
    players: Player[];
    leagueSettings: {
      teams: number;
      rosterPositions: string[]; // ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', ...]
      scoringSettings: ScoringSettings;
    };
  }
  
  interface VBDOutput {
    rankings: PlayerRanking[];
    explanation: {
      baselines: Record<Position, { player: Player; points: number }>;
      methodology: string;
    };
  }
  
  function calculateVBD(input: VBDInput): VBDOutput;
  ```
- [ ] Handle edge cases:
  - [ ] FLEX positions (RB/WR/TE eligible)
  - [ ] SUPERFLEX leagues
  - [ ] Different scoring formats (PPR, Half-PPR, Standard)

#### Day 3-4: Projection Data
- [ ] Integrate projection sources:
  - [ ] Primary: FantasyPros public rankings (scrape or manual)
  - [ ] Fallback: nflverse historical averages
- [ ] Create projection update workflow:
  - [ ] Manual upload (CSV) for alpha
  - [ ] Automated fetch (future enhancement)
- [ ] Store projections in `players.projected_points`

#### Day 5: Algorithm Testing
- [ ] Unit tests for VBD calculation
- [ ] Test with known rankings (validate against expert consensus)
- [ ] Performance test (should handle 500+ players instantly)
- [ ] Document algorithm in `docs/algorithms/vbd.md`

### Week 6: Draft Assistant UI

#### Day 1-2: Rankings View
- [ ] Build draft assistant page (`/draft/assistant`)
- [ ] Player list with:
  - [ ] Rank, name, team, position
  - [ ] VBD score with color coding
  - [ ] Projected points
  - [ ] ADP comparison (if available)
- [ ] Filters:
  - [ ] By position
  - [ ] Hide drafted players
  - [ ] Search by name
- [ ] Sort options (VBD, projected points, ADP)

#### Day 3: "Show Your Work" Panel
- [ ] Expandable explanation for each player:
  ```
  Patrick Mahomes - VBD: +45.2
  
  How we calculated this:
  ├── Projected Points: 385.5
  ├── QB Baseline (QB12): 340.3 points
  ├── VBD = 385.5 - 340.3 = 45.2
  └── Scoring: 4pt passing TD, -2 INT, ...
  ```
- [ ] League settings display
- [ ] "Why is X ranked above Y?" comparison tool

#### Day 4: Draft Simulation
- [ ] Mock draft mode:
  - [ ] Mark players as "drafted" (removes from available)
  - [ ] Track user's picks
  - [ ] Recalculate recommendations after each pick
- [ ] "My Team" sidebar showing drafted players
- [ ] Undo last pick functionality

#### Day 5: Animations & Polish
- [ ] Player card hover effects
- [ ] `<Kaching>` when selecting a high-VBD player
- [ ] `<CardFlip>` reveal for recommendations
- [ ] Staggered list animation on filter change
- [ ] Mobile: swipe to mark as drafted
- [ ] Celebrate when draft is "complete"

### Testing Requirements (Phase 2)
| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| VBD calculation | Unit | 100% branch coverage |
| Position baselines | Unit | All position combos |
| Rankings display | E2E | Filter, sort, search |
| Mock draft flow | E2E | Draft 15 rounds |

### Deliverables Checklist
- [ ] VBD algorithm with full test coverage
- [ ] `/draft/assistant` page functional
- [ ] "Show Your Work" panel implemented
- [ ] Mock draft mode working
- [ ] Algorithm documentation in `/docs`
- [ ] Animations feel satisfying

### "Show Your Work" Data Structure

```typescript
// Stored in algorithm_outputs table
interface VBDExplanation {
  algorithm: 'vbd_v1';
  timestamp: string;
  inputs: {
    playerCount: number;
    leagueSize: number;
    scoringFormat: string;
    rosterConfig: string[];
    projectionSource: string;
  };
  baselines: {
    QB: { playerId: string; name: string; projectedPoints: number };
    RB: { playerId: string; name: string; projectedPoints: number };
    WR: { playerId: string; name: string; projectedPoints: number };
    TE: { playerId: string; name: string; projectedPoints: number };
    // ...
  };
  methodology: string; // Markdown explanation
  caveats: string[]; // Known limitations
}
```

---


## 📅 Phase 3: Roster Optimizer & Trade Calculator (Weeks 7-8)

### Objectives
- Lineup optimizer (greedy algorithm)
- Trade value calculator with fairness scoring
- Both tools with "Show Your Work" transparency
- Drag-and-drop trade builder UI

### Week 7: Roster/Lineup Optimizer

#### Day 1-2: Lineup Algorithm
- [ ] Implement greedy lineup optimizer (`lib/algorithms/lineup.ts`):
  ```typescript
  interface LineupInput {
    roster: Player[];
    rosterPositions: string[]; // ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
    week: number;
  }
  
  interface LineupOutput {
    starters: { position: string; player: Player }[];
    bench: Player[];
    projectedPoints: number;
    explanation: LineupExplanation;
  }
  ```
- [ ] Algorithm logic:
  1. Sort players by projected points (descending)
  2. Fill required positions first (QB, then skill positions)
  3. Fill FLEX with best remaining RB/WR/TE
  4. Handle bye weeks (exclude players on bye)
  5. Handle injuries (flag but allow override)

#### Day 3-4: Roster Optimizer UI
- [ ] Build roster page (`/roster`)
- [ ] Display current lineup vs. optimized lineup
- [ ] Side-by-side comparison:
  ```
  Current Lineup          Optimized Lineup
  QB: Mahomes (22.5)      QB: Mahomes (22.5)
  RB: Henry (18.2)        RB: Henry (18.2)
  RB: Swift (12.1)    →   RB: Gibbs (15.8) ✨ +3.7
  ...
  Total: 142.5            Total: 148.9 (+6.4)
  ```
- [ ] "Apply Optimization" button (shows instructions for Sleeper)
- [ ] Bye week warnings
- [ ] Injury indicators

#### Day 5: Roster "Show Your Work"
- [ ] Explanation panel:
  ```
  Why we suggest starting Gibbs over Swift:
  
  ├── Gibbs projected: 15.8 pts
  │   └── vs. DAL (28th vs RB)
  ├── Swift projected: 12.1 pts
  │   └── vs. SF (4th vs RB)
  └── Difference: +3.7 points
  
  Factors considered:
  • Opponent defense ranking
  • Recent performance (last 3 weeks)
  • Snap count trends
  • Weather (if outdoor game)
  ```

### Week 8: Trade Calculator

#### Day 1-2: Trade Value Algorithm
- [ ] Implement trade evaluator (`lib/algorithms/trade.ts`):
  ```typescript
  interface TradeInput {
    giving: Player[];
    receiving: Player[];
    leagueSettings: LeagueSettings;
    currentRoster: Player[];
  }
  
  interface TradeOutput {
    fairnessScore: number; // -100 to +100 (0 = perfectly fair)
    givingValue: number;
    receivingValue: number;
    verdict: 'great' | 'fair' | 'bad' | 'veto-worthy';
    explanation: TradeExplanation;
  }
  ```
- [ ] Value factors:
  - [ ] VBD of players involved
  - [ ] Positional need (does user need a WR?)
  - [ ] Remaining season value (bye weeks, schedule)
  - [ ] Injury risk adjustment

#### Day 3-4: Trade Calculator UI
- [ ] Build trade page (`/trade`)
- [ ] Drag-and-drop interface:
  ```
  ┌─────────────────┐     ┌─────────────────┐
  │   YOU GIVE      │     │   YOU RECEIVE   │
  │  ┌───────────┐  │     │  ┌───────────┐  │
  │  │ Player A  │  │     │  │ Player X  │  │
  │  └───────────┘  │     │  └───────────┘  │
  │  ┌───────────┐  │     │                 │
  │  │ Player B  │  │     │  [Drop here]    │
  │  └───────────┘  │     │                 │
  └─────────────────┘     └─────────────────┘
           ↓ Trade Value: +12.5 (GREAT!) ↓
  ```
- [ ] Player picker modal (search + filter)
- [ ] Real-time fairness calculation
- [ ] Mobile: tap to add instead of drag

#### Day 5: Trade Animations & Polish
- [ ] Fairness meter animation (fills up/down as players added)
- [ ] `<Kaching>` on "great" trades
- [ ] Sad trombone equivalent for bad trades (subtle, not annoying)
- [ ] Trade success celebration (if trade is proposed via Sleeper link)
- [ ] "Show Your Work" expandable:
  ```
  Trade Analysis
  
  You Give:
  ├── Player A: 45.2 VBD, 12 weeks remaining
  └── Player B: 22.1 VBD, 11 weeks remaining
  Total Given: 67.3 value points
  
  You Receive:
  └── Player X: 78.8 VBD, 13 weeks remaining
  Total Received: 78.8 value points
  
  Net Value: +11.5 (17% gain)
  Verdict: GREAT TRADE 🎉
  
  Additional Context:
  • You're thin at WR, and Player X is WR1
  • Player A on bye Week 9 (your playoff push)
  ```

### Testing Requirements (Phase 3)
| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Lineup optimizer | Unit | Bye weeks, injuries, FLEX |
| Trade calculator | Unit | 2-for-1, 3-for-2, edge cases |
| Drag-and-drop | E2E | Desktop and mobile |
| Fairness scoring | Unit | Known trade scenarios |

### Deliverables Checklist
- [ ] Lineup optimizer algorithm complete
- [ ] `/roster` page with side-by-side comparison
- [ ] Trade value algorithm complete
- [ ] `/trade` page with drag-and-drop
- [ ] Both tools have "Show Your Work" panels
- [ ] Animations celebrate good decisions
- [ ] Documentation for both algorithms

---


## 📅 Phase 4: Waiver Wire & Polish (Weeks 9-10)

### Objectives
- Waiver recommendation system
- FAAB bid suggestions (for FAAB leagues)
- Overall UI/UX polish pass
- Performance optimization
- Accessibility audit

### Week 9: Waiver System

#### Day 1-2: Waiver Algorithm
- [ ] Implement waiver recommender (`lib/algorithms/waivers.ts`):
  ```typescript
  interface WaiverInput {
    availablePlayers: Player[];
    currentRoster: Player[];
    leagueSettings: LeagueSettings;
    weekNumber: number;
  }
  
  interface WaiverOutput {
    recommendations: WaiverRecommendation[];
    droppable: Player[]; // Suggests who to drop
    explanation: WaiverExplanation;
  }
  
  interface WaiverRecommendation {
    player: Player;
    priority: number; // 1 = highest priority
    suggestedFaabBid: number; // For FAAB leagues
    reasons: string[];
  }
  ```
- [ ] Priority factors:
  - [ ] VBD vs. worst roster player at position
  - [ ] Roster need (injuries, bye weeks)
  - [ ] Trending up (recent performance)
  - [ ] Opportunity increase (starter injured, trade)

#### Day 3-4: Waiver UI
- [ ] Build waiver page (`/waivers`)
- [ ] Recommendation list:
  ```
  TOP WAIVER TARGETS
  
  1. 🔥 Tank Dell (WR - HOU)
     └── +18.2 VBD over your WR4
     └── Suggested FAAB: $12-15 (8-10%)
     └── Drop: [Player X]
  
  2. Jaylen Warren (RB - PIT)
     └── Najee Harris injury = opportunity
     └── Suggested FAAB: $8-10 (5-7%)
     └── Drop: [Player Y]
  ```
- [ ] "Add to Claims" button (generates Sleeper instructions)
- [ ] Filter: "Show only if I have someone to drop"

#### Day 5: FAAB Bidding Logic
- [ ] Implement FAAB bid calculator:
  - [ ] Base: % of remaining budget based on value
  - [ ] Adjust: League aggression (from historical data if available)
  - [ ] Adjust: Roster need multiplier
- [ ] Show bid range, not single number (lets user decide risk)
- [ ] "Show Your Work" for FAAB:
  ```
  FAAB Suggestion: $12-15
  
  Calculation:
  ├── Base value: $10 (VBD-based)
  ├── Roster need multiplier: 1.3x (WR thin)
  ├── Remaining budget: $67 of $100
  └── Range: $12 (safe) to $15 (aggressive)
  ```

### Week 10: Polish & Performance

#### Day 1-2: UI Polish
- [ ] Consistent loading states everywhere
- [ ] Error states with helpful messages
- [ ] Empty states with calls-to-action
- [ ] Review all animations:
  - [ ] Timing feels right
  - [ ] No jank on mobile
  - [ ] Reduced motion respected
- [ ] Dark mode consistency check
- [ ] Typography review (readable on all sizes)

#### Day 3: Performance Optimization
- [ ] Lighthouse audit (target: 90+ on all metrics)
- [ ] Bundle analysis (remove unused code)
- [ ] Image optimization (if any images added)
- [ ] Server component vs. client component audit:
  - [ ] Move data fetching to server where possible
  - [ ] Minimize client-side JS
- [ ] Caching review:
  - [ ] Static pages cached properly
  - [ ] Dynamic data has appropriate revalidation
- [ ] Database query optimization (add indexes if needed)

#### Day 4: Accessibility Audit
- [ ] Screen reader testing (VoiceOver, NVDA)
- [ ] Keyboard navigation works everywhere
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Form labels and error messages accessible
- [ ] Animations respect `prefers-reduced-motion`

#### Day 5: Documentation & Prep for Alpha
- [ ] Update README with:
  - [ ] Local development setup
  - [ ] Environment variables needed
  - [ ] How to deploy
- [ ] Algorithm documentation complete:
  - [ ] `/docs/algorithms/vbd.md`
  - [ ] `/docs/algorithms/lineup.md`
  - [ ] `/docs/algorithms/trade.md`
  - [ ] `/docs/algorithms/waivers.md`
- [ ] Create "How to Use" guide for testers
- [ ] Set up error monitoring (Sentry or similar, free tier)

### Testing Requirements (Phase 4)
| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Waiver algorithm | Unit | Priority ordering, FAAB |
| Waiver UI | E2E | Add/remove claims |
| Performance | Lighthouse | 90+ all categories |
| Accessibility | aXe audit | 0 critical violations |

### Deliverables Checklist
- [ ] Waiver recommendation system complete
- [ ] FAAB bid suggestions working
- [ ] All pages polished and consistent
- [ ] Lighthouse scores 90+
- [ ] Accessibility audit passed
- [ ] Documentation complete
- [ ] Error monitoring configured

---


## 📅 Phase 5: Alpha Testing & Iteration (Weeks 11-12)

### Objectives
- Deploy production environment
- Onboard 5-10 alpha testers
- Collect structured feedback
- Fix critical bugs
- Iterate based on feedback

### Week 11: Alpha Launch

#### Day 1: Production Deployment
- [ ] Create production Fly.io app (separate from staging)
- [ ] Production Supabase project (or use same with care)
- [ ] Configure production environment variables
- [ ] Set up production domain (optional, can use fly.dev)
- [ ] Verify all features work in production
- [ ] Enable Supabase backups

#### Day 2: Tester Onboarding Materials
- [ ] Create "Welcome to Quantasy Alpha" guide:
  ```markdown
  # Welcome to Quantasy Alpha! 🏈
  
  Thanks for testing! Here's what you need to know:
  
  ## Getting Started
  1. Go to [quantasy.fly.dev]
  2. Click "Sign In" and use your email
  3. Connect your Sleeper league
  
  ## What to Test
  - [ ] Connect your league and see your roster
  - [ ] Use the Draft Assistant (rankings make sense?)
  - [ ] Check the Trade Calculator (try a real trade you're considering)
  - [ ] Look at Waiver recommendations
  
  ## How to Give Feedback
  - Use this form: [Google Form link]
  - Or text me directly
  
  ## Known Issues
  - [List any known bugs]
  ```
- [ ] Create feedback form (Google Forms or Typeform):
  - What feature did you use?
  - Did it work as expected?
  - What was confusing?
  - What would make it better?
  - Rate 1-5: Usefulness, Speed, Fun factor

#### Day 3-4: Invite Testers
- [ ] Send personalized invites to 5-10 friends/family
- [ ] Offer to screenshare onboarding if needed
- [ ] Be available for questions (set response time expectation)
- [ ] Track who has:
  - [ ] Signed up
  - [ ] Connected a league
  - [ ] Used each feature

#### Day 5: Monitor & Support
- [ ] Watch error monitoring for issues
- [ ] Check Supabase logs for failed queries
- [ ] Respond to tester questions same-day
- [ ] Start bug/feedback tracking list

### Week 12: Iteration & Wrap-up

#### Day 1-2: Triage Feedback
- [ ] Categorize feedback:
  - **Critical bugs** — App broken, can't use feature
  - **UX issues** — Confusing, hard to find, unexpected behavior
  - **Feature requests** — "It would be cool if..."
  - **Praise** — What's working well (keep doing this!)
- [ ] Prioritize critical bugs for immediate fix
- [ ] Create issues for Stage 2 backlog

#### Day 3-4: Bug Fixes & Quick Wins
- [ ] Fix all critical bugs
- [ ] Implement quick UX wins (< 2 hours each)
- [ ] Deploy fixes
- [ ] Notify testers of updates

#### Day 5: Alpha Retrospective
- [ ] Analyze feedback trends:
  - What features are most used?
  - What's most confusing?
  - What's most requested for next version?
- [ ] Update documentation based on learnings
- [ ] Write Stage 1 retrospective:
  ```markdown
  # Quantasy Stage 1 Retrospective
  
  ## What Went Well
  - ...
  
  ## What Could Be Better
  - ...
  
  ## Key Learnings
  - ...
  
  ## Priorities for Stage 2
  - ...
  ```
- [ ] **Celebrate completion! 🎉**

### Success Metrics
| Metric | Target | How to Measure |
|--------|--------|----------------|
| Testers onboarded | 5-10 | Count of accounts with connected leagues |
| Features used per tester | 3+ | Analytics or feedback form |
| Critical bugs in production | 0 by end of Week 12 | Error monitoring |
| Tester satisfaction (1-5) | 4+ average | Feedback form |
| "Would recommend" | 80%+ | Feedback form |

### Deliverables Checklist
- [ ] Production app deployed and stable
- [ ] 5-10 testers actively using the app
- [ ] Feedback collected and categorized
- [ ] Critical bugs fixed
- [ ] Stage 1 retrospective written
- [ ] Stage 2 backlog prioritized

---


## 📁 Final File Structure

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
│   ├── PLAN-v2.md                    # This document
│   ├── PLAN-comments.md              # Critiques of v1
│   ├── init-roadmap.md               # Stage overview
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

## 🚫 Deferred to Stage 2+

### Stage 2: "The Real Slim ShadeVP"
| Feature | Reason for Deferral |
|---------|---------------------|
| ESPN/Yahoo league support | Testers only use Sleeper; adds complexity |
| Python ML algorithms | Monte Carlo, ILP require Python bridge architecture |
| Real-time draft rooms | Requires WebSocket infrastructure; Sleeper handles drafts |
| Live game scoring | Needs reliable live data source; Sleeper matchups suffice |
| Advanced trade value (dynasty, keeper) | Requires more historical data |
| Mobile app (React Native) | Web-first; evaluate demand after alpha |

### Stage 3: "Green Paper Generator"
| Feature | Reason for Deferral |
|---------|---------------------|
| User accounts & persistence | Beyond league connection |
| Subscription tiers | Monetization phase |
| Ads | Monetization phase |
| Premium algorithms | Gated features |
| Social features | Community building |
| League creation via Quantasy | Complex feature, low MVP value |

### Stage 4: "Quantasy 1.0"
| Feature | Reason for Deferral |
|---------|---------------------|
| Marketing site | Public launch |
| Onboarding optimization | Scale concerns |
| Multi-language support | International growth |
| API for third parties | Platform play |

---

## ⚠️ Risk Mitigations

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sleeper API changes | High | Pin to known-working endpoints; monitor for changes; build abstraction layer |
| Supabase free tier limits | Medium | Monitor usage; have upgrade path ready; optimize queries |
| Fly.io cold starts | Low | Configure min instances if needed; show loading state |
| Algorithm accuracy | Medium | Document assumptions; allow user to see/override; iterate based on feedback |

### Product Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Testers don't engage | High | Personal outreach; make onboarding trivial; offer to screenshare |
| Algorithms don't match expectations | Medium | "Show Your Work" builds trust; compare to expert consensus; explain caveats |
| Mobile experience poor | Medium | Mobile-first design; test on real devices early; prioritize performance |
| Feature creep | Medium | Strict phase scope; defer non-essentials; this plan is the contract |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solo developer burnout | High | Realistic timeline (12 weeks vs 8); celebrate milestones; take breaks |
| No version control discipline | Medium | Commit often; use PRs even solo; automated CI checks |
| Production incidents during alpha | Medium | Error monitoring; be available for testers; have rollback ready |

---

## 📊 Summary: What Stage 1 Delivers

### For Users (Alpha Testers)
1. **Connect Sleeper league** — See your roster, standings, matchups
2. **Draft Assistant** — VBD-based rankings with full transparency
3. **Roster Optimizer** — Set optimal lineup each week
4. **Trade Calculator** — Evaluate trades before proposing
5. **Waiver Recommendations** — Know who to pick up and what to bid

### For the Product
1. **Validated tech stack** — Next.js + Supabase + Framer Motion proven
2. **Animation system** — Reusable primitives for future features
3. **Algorithm framework** — "Show Your Work" pattern established
4. **Feedback baseline** — Real user input guides Stage 2

### For the Developer
1. **12-week realistic timeline** — Avoids burnout
2. **Clear phase boundaries** — Know when features are "done"
3. **Testing strategy** — Confidence in deployments
4. **Documentation** — Reduced context-switching

---

## ✅ Ready to Build

This plan addresses all critiques from PLAN-comments.md:
- ✅ No ESPN Hidden API dependency (Sleeper only)
- ✅ No Python/Node interop complexity (TypeScript only for Stage 1)
- ✅ Realistic weekly scopes (12 weeks, not 8)
- ✅ Cost estimates validated ($0-5/mo)
- ✅ Database schema defined
- ✅ Testing strategy included
- ✅ Error handling specified
- ✅ Mobile-first from Day 1
- ✅ Code samples are complete (animation primitives)

**Next Step:** Begin Phase 0, Week 1 — Project scaffolding.
