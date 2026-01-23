# Phase 0: Foundation & Design System (Weeks 1-2)

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete implementation guide for Phase 0

---

## Objectives

- Project scaffolding with all tooling configured
- Design system with Balatro color palette
- Animation primitives library ready for use
- Authentication flow working
- Database schema deployed
- CI/CD pipeline to Fly.io
- Mobile-first responsive foundation

---

## Week 1: Project Setup & Core Infrastructure

### Day 1-2: Scaffolding

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

### Day 3-4: Design System

- [ ] Create Tailwind config with Balatro palette
- [ ] Set up CSS variables for theming
- [ ] Create base layout components:
  - [ ] `<MobileNav>` - bottom navigation for mobile
  - [ ] `<DesktopSidebar>` - side navigation for desktop
  - [ ] `<PageContainer>` - consistent page wrapper
  - [ ] `<Card>` - Balatro-style card component
- [ ] Implement dark mode (default, no toggle needed for MVP)

### Day 5: Animation Primitives

- [ ] Build animation components (see [03-animation-system.md](./03-animation-system.md)):
  - [ ] `<FadeIn>`
  - [ ] `<StaggerList>` + `<StaggerItem>`
  - [ ] `<CardFlip>`
  - [ ] `<Kaching>`
  - [ ] `<ScoreCounter>`
  - [ ] `<Shimmer>`
- [ ] Create `useCelebration` hook
- [ ] Test on mobile device (or emulator)
- [ ] Verify `prefers-reduced-motion` behavior

---

## Week 2: Auth, Database & Deployment

### Day 1-2: Supabase Setup

- [ ] Create Supabase project
- [ ] Deploy schema (see [02-database-schema.md](./02-database-schema.md))
- [ ] Set up RLS policies
- [ ] Configure Supabase Auth (email + magic link)
- [ ] Create auth helpers for Next.js App Router
- [ ] Build auth UI:
  - [ ] `/login` page with Balatro styling
  - [ ] `/auth/callback` route handler
  - [ ] Auth state provider

### Day 3-4: Core Pages

- [ ] Landing page (`/`)
  - [ ] Hero section with animated title
  - [ ] Feature preview cards (staggered entrance)
  - [ ] "Connect with Sleeper" CTA button
  - [ ] Mobile-responsive layout
- [ ] Dashboard shell (`/dashboard`)
  - [ ] Tool grid (Draft, Roster, Trade, Waivers)
  - [ ] Empty states for unconnected leagues
  - [ ] Protected route (redirect if not authed)

### Day 5: CI/CD & Deployment

- [ ] Configure Fly.io
  - [ ] `fly.toml` configuration
  - [ ] Environment variables (Supabase URL, keys)
  - [ ] Auto-stop for cost savings
- [ ] Set up GitHub Actions:
  - [ ] Run tests on PR
  - [ ] Deploy to Fly.io on main merge
- [ ] Verify deployment works end-to-end
- [ ] **Milestone: Empty app deployed and accessible**

---

## Testing Requirements

| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| Animation primitives | Unit (Vitest) | 100% render without error |
| Auth flow | E2E (Playwright) | Login -> Dashboard redirect |
| Landing page | E2E (Playwright) | Renders on mobile viewport |
| API routes | Integration | Auth middleware blocks unauthenticated |

---

## Deliverables Checklist

- [ ] Repository with clean folder structure
- [ ] All animation primitives documented in Storybook (optional) or README
- [ ] Supabase schema deployed with seed data script
- [ ] Working auth flow (login -> dashboard -> logout)
- [ ] Landing page with animations
- [ ] CI/CD deploying to Fly.io
- [ ] Mobile-responsive at all breakpoints

---

## Cost Check

| Service | Cost |
|---------|------|
| Fly.io | $0 (free tier, auto-stop) |
| Supabase | $0 (free tier) |
| **Total** | **$0/mo** |

---

## Key Commands

```bash
# Initialize project
npx create-next-app@latest qai --typescript --tailwind --eslint --app --src-dir

# Install core dependencies
npm install framer-motion @supabase/ssr @supabase/supabase-js

# Install dev dependencies
npm install -D vitest @vitejs/plugin-react @testing-library/react @playwright/test

# Initialize shadcn/ui
npx shadcn-ui@latest init

# Initialize Fly.io
fly launch --name quantasy-alpha

# Deploy
fly deploy
```

---

## Related Documents

- [01-tech-stack.md](./01-tech-stack.md) - Technology decisions
- [02-database-schema.md](./02-database-schema.md) - Supabase schema
- [03-animation-system.md](./03-animation-system.md) - Animation components
- [04-file-structure.md](./04-file-structure.md) - Project layout
