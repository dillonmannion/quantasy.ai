# Technology Stack & Design Philosophy

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Reference for all technology decisions and design guidelines

---

## Confirmed Technology Decisions

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

## Estimated Costs (Monthly)

| Service | Free Tier | Expected Cost | Notes |
|---------|-----------|---------------|-------|
| Fly.io | 3 shared VMs free | $0-5 | Single region, auto-stop when idle |
| Supabase | 500MB DB, 1GB storage | $0 | Free tier sufficient for alpha |
| Domain | N/A | $12/year | Optional for alpha |
| **Total** | - | **$0-5/mo** | Stage 1 can run entirely free |

### Cost Escalation Triggers
- Adding Python workers: +$5-10/mo (separate Fly machine)
- Supabase Pro (if > 500MB): $25/mo
- High traffic (unlikely in alpha): Variable

---

## Design Philosophy

### Visual Identity: "Balatro Meets Fantasy Football"

**Core Aesthetic:**
- Dark purple-black backgrounds (#1a1a2e)
- Gold accents for wins/value (#ffd700)
- Card-based UI with subtle depth
- Satisfying micro-interactions on every action
- Data reveals feel like "loot drops"

### Animation Principles

1. **Purposeful** - Animations convey meaning (win = celebration, loss = subdued)
2. **Performant** - Prefer transform/opacity; respect `prefers-reduced-motion`
3. **Consistent** - Reusable primitives, not one-off effects
4. **Mobile-first** - Test on low-end devices; no heavy blur/shadows

### Responsive Strategy

| Breakpoint | Name | Target |
|------------|------|--------|
| Default | Mobile | < 768px |
| md | Tablet | 768px+ |
| lg | Desktop | 1024px+ |

**Approach:** All layouts start mobile, enhance upward.

---

## Color Palette

```css
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
```

---

## Animation Timing

```css
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
```

---

## Key Architectural Decisions

### SSR by Default
- Use Next.js Server Components where possible
- Client components only for interactivity
- Data fetching on server, not client

### Caching Strategy
- Sleeper data cached in Supabase
- Cache-through pattern for API calls
- TTLs vary by data type (see Phase 1)

### Algorithm Transparency
- All algorithm outputs stored with explanation
- "Show Your Work" pattern for every recommendation
- Methodology documented and visible to users

---

## Related Documents

- [02-database-schema.md](./02-database-schema.md) - Supabase schema design
- [03-animation-system.md](./03-animation-system.md) - Animation component specs
- [04-file-structure.md](./04-file-structure.md) - Project layout
