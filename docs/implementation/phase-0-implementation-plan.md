# Phase 0 Implementation Plan - Foundation & Design System
## Quantasy (quantasy.ai) - January 2026

> **Generated:** January 23, 2026
> **Timeline:** 10 days (44-62 hours)
> **Status:** Ready for execution

---

## 📦 CONFIRMED TECHNOLOGY VERSIONS

| Category | Package | Version |
|----------|---------|---------|
| **Runtime** | Node.js | 24 LTS |
| **Package Manager** | pnpm | 10.28.1 |
| **Framework** | next | 16.1.4 |
| **React** | react / react-dom | 19.2 |
| **Styling** | tailwindcss | 4.0.0 |
| **UI Components** | shadcn/ui | CLI 3.0 |
| **Animation** | motion | 12.27.5 |
| **Database** | @supabase/supabase-js | 2.90.1 |
| **SSR Auth** | @supabase/ssr | 0.8.0 |
| **Testing** | vitest | 4.0.18 |
| **E2E Testing** | @playwright/test | latest |
| **Browser Testing** | @vitest/browser-playwright | 4.0.18 |
| **Deployment** | Fly.io (sjc region) | - |
| **Domain** | quantasy.ai | Primary |

---

## 🎯 User Configuration

- **Package Manager**: pnpm (v10.28.1)
- **Node Version**: 24 LTS
- **Supabase**: Existing account, create new project
- **Fly.io**: Create new account
- **Domain**: quantasy.ai (primary), .app and .org as alternates
- **Auth**: Supabase Auth
- **Region**: sjc (San Jose, California)

---

## 🔧 BLOCK 1: PROJECT SCAFFOLDING & CORE DEPENDENCIES
**Duration:** Days 1-2 (8-12 hours)

### Prerequisites Check
```bash
# Verify Node 24 LTS
node --version  # Should be v24.x.x

# Install/update pnpm globally
npm install -g pnpm@latest

# Verify pnpm
pnpm --version  # Should be 10.28.1 or higher
```

### 1.1 Initialize Next.js 16 Project

Since we're already in the `qai` directory with git initialized:

```bash
# Initialize Next.js 16 in current directory
pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack \
  --yes

# Note: This will prompt to confirm overwriting existing README
# Select "yes" to proceed
```

**Post-init verification:**
```bash
# Check directory structure
ls -la src/

# Should see:
# - src/app/
# - src/components/ (we'll create this)
# - src/lib/ (we'll create this)
```

### 1.2 Configure TypeScript Strict Mode

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/styles/*": ["./src/styles/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 1.3 Install Core Dependencies

```bash
# Animation library (new Motion package, not framer-motion)
pnpm add motion@12.27.5

# Supabase for auth and database
pnpm add @supabase/ssr@0.8.0 @supabase/supabase-js@2.90.1

# Development dependencies
pnpm add -D vitest@4.0.18 @vitejs/plugin-react
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @playwright/test @vitest/browser-playwright@4.0.18

# TypeScript types for React 19
pnpm add -D @types/react@latest @types/react-dom@latest @types/node@latest
```

### 1.4 Initialize shadcn/ui (CLI 3.0)

```bash
# Initialize shadcn/ui with interactive prompts
pnpm dlx shadcn@latest init

# When prompted, choose:
# - Style: Default
# - Base color: Slate (we'll customize with Balatro colors)
# - CSS variables: Yes
# - Use TypeScript: Yes
# - Import alias: @/components

# Install initial components
pnpm dlx shadcn@latest add button card dialog input label
```

### 1.5 Configure Testing Infrastructure

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

Create test setup file `src/tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

### 1.6 Update package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "type-check": "tsc --noEmit"
  }
}
```

### 1.7 Create Directory Structure

```bash
# Create all necessary directories
mkdir -p src/components/{ui,animation,layout,players,draft,roster,trade,waivers,transparency}
mkdir -p src/lib/{supabase,sleeper,algorithms,utils}
mkdir -p src/hooks
mkdir -p src/app/\(auth\)/{login,auth/callback}
mkdir -p src/app/\(dashboard\)/{dashboard,draft,roster,trade,waivers}
mkdir -p src/app/api/{sleeper,algorithms}
mkdir -p supabase/migrations
mkdir -p tests/{unit,e2e}
mkdir -p docs/implementation
```

**Deliverables Check:**
- [ ] Next.js 16.1.4 app initialized with TypeScript
- [ ] All dependencies installed (motion, Supabase, testing)
- [ ] shadcn/ui initialized with base components
- [ ] Testing infrastructure configured (Vitest + Playwright)
- [ ] Directory structure created
- [ ] `pnpm dev` runs without errors

---

## 🎨 BLOCK 2: TAILWIND V4 & DESIGN SYSTEM
**Duration:** Days 3-4 (8-12 hours)

### 2.1 Configure Tailwind v4 (NEW SYNTAX!)

**Important:** Tailwind v4 has completely different configuration!

Install Tailwind v4 and Vite plugin:

```bash
pnpm add tailwindcss@4.0.0 @tailwindcss/vite@latest
```

Update `next.config.ts` for Tailwind v4:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      // Tailwind v4 integration
    },
  },
}

export default nextConfig
```

### 2.2 Create CSS-First Configuration

**Replace `src/app/globals.css` completely:**

```css
@import "tailwindcss";

/* Tailwind v4 uses @theme directive instead of tailwind.config.js */
@theme {
  /* Balatro Color Palette */
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

  /* Typography */
  --font-display: "Satoshi", "Inter", sans-serif;
  --font-body: "Inter", sans-serif;

  /* Animation Durations (CSS custom properties) */
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-dramatic: 800ms;

  /* Spacing scale (Tailwind v4 dynamic utilities) */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;

  /* Border radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

/* Base styles */
@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-body;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-display;
  }
}

/* Component styles */
@layer components {
  .card-balatro {
    @apply bg-[var(--color-bg-card)] rounded-lg shadow-lg;
    @apply border border-white/10;
    @apply transition-all duration-300;
  }

  .card-balatro:hover {
    @apply shadow-xl border-white/20;
    @apply translate-y-[-2px];
  }

  .btn-primary {
    @apply bg-[var(--color-accent-gold)] text-black;
    @apply px-6 py-3 rounded-lg font-semibold;
    @apply hover:bg-[var(--color-accent-gold)]/90;
    @apply transition-all duration-200;
  }
}

/* Utilities */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .perspective-1000 {
    perspective: 1000px;
  }

  .backface-hidden {
    backface-visibility: hidden;
  }

  .transform-style-3d {
    transform-style: preserve-3d;
  }
}

/* Animation keyframes */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes kaching-float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(1.2);
    opacity: 0;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2.3 Build Layout Components

**Install lucide-react for icons:**

```bash
pnpm add lucide-react
```

**Create `src/components/layout/mobile-nav.tsx`:**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart3, ArrowLeftRight, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/draft', label: 'Draft', icon: BarChart3 },
  { href: '/dashboard/trade', label: 'Trade', icon: ArrowLeftRight },
  { href: '/dashboard/waivers', label: 'Waivers', icon: TrendingUp },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-[var(--color-bg-card)] border-t border-white/10 backdrop-blur-lg">
        <div className="flex items-center justify-around px-4 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-[var(--color-accent-purple)]/20 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 ${
                    isActive ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                />
                <span
                  className={`text-xs relative z-10 ${
                    isActive ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
```

**Create `src/components/layout/desktop-sidebar.tsx`:**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart3, ArrowLeftRight, TrendingUp, Users } from 'lucide-react'
import { motion } from 'motion/react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/draft', label: 'Draft Assistant', icon: BarChart3 },
  { href: '/dashboard/roster', label: 'Roster Optimizer', icon: Users },
  { href: '/dashboard/trade', label: 'Trade Calculator', icon: ArrowLeftRight },
  { href: '/dashboard/waivers', label: 'Waiver Wire', icon: TrendingUp },
]

export function DesktopSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-white/10 bg-[var(--color-bg-card)]">
      <div className="flex flex-col flex-1 px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-purple)] bg-clip-text text-transparent">
            Quantasy
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Fantasy Football Tools</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group"
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-nav-indicator"
                    className="absolute inset-0 bg-[var(--color-accent-purple)]/20 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 ${
                    isActive 
                      ? 'text-[var(--color-accent-gold)]' 
                      : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'
                  }`}
                />
                <span
                  className={`text-sm relative z-10 ${
                    isActive 
                      ? 'text-[var(--color-accent-gold)] font-semibold' 
                      : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
```

**Create `src/components/layout/page-container.tsx`:**

```typescript
import { type ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`min-h-screen lg:pl-64 pb-20 lg:pb-0 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  )
}
```

**Deliverables Check:**
- [ ] Tailwind v4 configured with CSS-first approach
- [ ] Balatro color palette in @theme directive
- [ ] MobileNav component with animated indicator
- [ ] DesktopSidebar component with motion
- [ ] PageContainer for consistent layouts
- [ ] Responsive at all breakpoints (mobile/tablet/desktop)

---

## ✨ BLOCK 3: ANIMATION PRIMITIVES LIBRARY
**Duration:** Day 5 (6-8 hours)

### 3.1 Motion Package Setup

Update imports throughout the codebase to use the new `motion` package:

```typescript
// OLD (framer-motion)
import { motion } from 'framer-motion'

// NEW (motion package)
import { motion } from 'motion/react'
```

### 3.2 Build Animation Components

**Create `src/components/animation/fade-in.tsx`:**

```typescript
'use client'

import { motion, type Variants } from 'motion/react'
import { type ReactNode } from 'react'

const variants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.3, 
  className 
}: FadeInProps) {
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
  )
}
```

**Create `src/components/animation/stagger-list.tsx`:**

```typescript
'use client'

import { motion, type Variants } from 'motion/react'
import { type ReactNode } from 'react'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  },
}

interface StaggerListProps {
  children: ReactNode
  className?: string
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
  )
}

interface StaggerItemProps {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
```

**Create `src/components/animation/card-flip.tsx`:**

```typescript
'use client'

import { motion } from 'motion/react'
import { type ReactNode } from 'react'

interface CardFlipProps {
  front: ReactNode
  back: ReactNode
  isFlipped?: boolean
  onFlip?: () => void
  className?: string
}

export function CardFlip({ 
  front, 
  back, 
  isFlipped = false, 
  onFlip, 
  className = '' 
}: CardFlipProps) {
  return (
    <div 
      className={`relative cursor-pointer perspective-1000 ${className}`}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onFlip?.()
        }
      }}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ 
          duration: 0.6, 
          type: 'spring', 
          stiffness: 300, 
          damping: 30 
        }}
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
  )
}
```

**Create `src/components/animation/kaching.tsx`:**

```typescript
'use client'

import { motion, AnimatePresence } from 'motion/react'

interface KachingProps {
  show: boolean
  value: number | string
  label?: string
  variant?: 'gold' | 'green' | 'purple'
  onComplete?: () => void
}

const colorMap = {
  gold: 'from-yellow-400 to-yellow-600 text-black',
  green: 'from-green-400 to-green-600 text-white',
  purple: 'from-purple-400 to-purple-600 text-white',
}

export function Kaching({ 
  show, 
  value, 
  label, 
  variant = 'gold', 
  onComplete 
}: KachingProps) {
  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
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
            border-4 border-white/30 relative overflow-hidden
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
                className="absolute text-2xl top-1/2 left-1/2"
              >
                {variant === 'gold' ? '💰' : variant === 'green' ? '✓' : '⭐'}
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
  )
}
```

**Create `src/components/animation/score-counter.tsx`:**

```typescript
'use client'

import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'

interface ScoreCounterProps {
  value: number
  duration?: number
  decimals?: number
  className?: string
}

export function ScoreCounter({ 
  value, 
  duration = 1, 
  decimals = 1, 
  className = '' 
}: ScoreCounterProps) {
  const spring = useSpring(0, { duration: duration * 1000 })
  const display = useTransform(spring, (current) => 
    current.toFixed(decimals)
  )

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  )
}
```

**Create `src/components/animation/shimmer.tsx`:**

```typescript
'use client'

import { motion } from 'motion/react'

interface ShimmerProps {
  className?: string
}

export function Shimmer({ className = '' }: ShimmerProps) {
  return (
    <motion.div
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent ${className}`}
      animate={{ x: ['-100%', '100%'] }}
      transition={{ 
        repeat: Infinity, 
        duration: 1.5, 
        ease: 'linear' 
      }}
    />
  )
}
```

### 3.3 Create Animation Hook

**Create `src/hooks/use-celebration.ts`:**

```typescript
'use client'

import { useState, useCallback } from 'react'

export function useCelebration(autoHideMs = 2000) {
  const [isShowing, setIsShowing] = useState(false)
  const [value, setValue] = useState<number | string>(0)
  const [label, setLabel] = useState<string>()

  const celebrate = useCallback((
    newValue: number | string, 
    newLabel?: string
  ) => {
    setValue(newValue)
    setLabel(newLabel)
    setIsShowing(true)

    if (autoHideMs > 0) {
      setTimeout(() => setIsShowing(false), autoHideMs)
    }
  }, [autoHideMs])

  const hide = useCallback(() => setIsShowing(false), [])

  return { isShowing, value, label, celebrate, hide }
}
```

### 3.4 Create Animation Index Export

**Create `src/components/animation/index.ts`:**

```typescript
export { FadeIn } from './fade-in'
export { StaggerList, StaggerItem } from './stagger-list'
export { CardFlip } from './card-flip'
export { Kaching } from './kaching'
export { ScoreCounter } from './score-counter'
export { Shimmer } from './shimmer'
```

### 3.5 Test Animations

Create test file `src/tests/unit/animations.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FadeIn } from '@/components/animation/fade-in'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'

describe('Animation Components', () => {
  it('FadeIn renders children', () => {
    render(<FadeIn>Test Content</FadeIn>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('StaggerList renders with items', () => {
    render(
      <StaggerList>
        <StaggerItem>Item 1</StaggerItem>
        <StaggerItem>Item 2</StaggerItem>
      </StaggerList>
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})
```

**Deliverables Check:**
- [ ] All 6 animation primitives implemented
- [ ] useCelebration hook created
- [ ] Unit tests passing
- [ ] Animations respect prefers-reduced-motion
- [ ] All components use motion/react imports

---

## 🔐 BLOCK 4: SUPABASE SETUP & AUTHENTICATION
**Duration:** Days 6-7 (10-14 hours)

### 4.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name:** quantasy-alpha
   - **Database Password:** Generate strong password (save securely!)
   - **Region:** Choose closest to California (e.g., US West)
4. Wait for project to provision (~2 minutes)

### 4.2 Get Supabase Credentials

From project dashboard, navigate to Settings > API:

- **Project URL:** `https://xxxxx.supabase.co`
- **anon public key:** `eyJhbG...`
- **service_role key:** `eyJhbG...` (keep secret!)

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... # Server-side only

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add to `.gitignore`:

```
.env.local
.env*.local
```

### 4.3 Deploy Database Schema

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sleeper_user_id TEXT UNIQUE,
  sleeper_username TEXT,
  sleeper_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create leagues table
CREATE TABLE public.leagues (
  id TEXT PRIMARY KEY, -- Sleeper league_id
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  status TEXT, -- 'pre_draft', 'drafting', 'in_season', 'complete'
  settings JSONB,
  scoring_settings JSONB,
  roster_positions JSONB,
  total_rosters INTEGER,
  cached_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_leagues junction table
CREATE TABLE public.user_leagues (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER,
  is_owner BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, league_id)
);

-- Create rosters table
CREATE TABLE public.rosters (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  roster_id INTEGER NOT NULL,
  owner_id TEXT, -- Sleeper user_id
  players TEXT[],
  starters TEXT[],
  reserve TEXT[],
  settings JSONB,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, roster_id)
);

-- Create players table
CREATE TABLE public.players (
  id TEXT PRIMARY KEY, -- Sleeper player_id
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  team TEXT,
  position TEXT,
  age INTEGER,
  years_exp INTEGER,
  status TEXT,
  injury_status TEXT,
  projected_points DECIMAL(6,2),
  projection_source TEXT,
  projection_updated_at TIMESTAMPTZ,
  sleeper_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create matchups table
CREATE TABLE public.matchups (
  id SERIAL PRIMARY KEY,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  matchup_id INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  points DECIMAL(8,2),
  starters TEXT[],
  starters_points DECIMAL(6,2)[],
  players TEXT[],
  players_points JSONB,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, week, roster_id)
);

-- Create algorithm_outputs table
CREATE TABLE public.algorithm_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  algorithm_type TEXT NOT NULL,
  input_params JSONB NOT NULL,
  output_data JSONB NOT NULL,
  explanation JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_rosters_league ON public.rosters(league_id);
CREATE INDEX idx_matchups_league_week ON public.matchups(league_id, week);
CREATE INDEX idx_players_team ON public.players(team);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_algorithm_outputs_user ON public.algorithm_outputs(user_id, algorithm_type);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_outputs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view their leagues" 
  ON public.user_leagues FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own algorithm outputs" 
  ON public.algorithm_outputs FOR SELECT 
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

Run migration in Supabase dashboard:
1. Go to SQL Editor
2. Paste the migration SQL
3. Click "Run"

Or use Supabase CLI:

```bash
# Install Supabase CLI
pnpm add -D supabase

# Login
npx supabase login

# Link project
npx supabase link --project-ref <your-project-ref>

# Push migration
npx supabase db push
```

### 4.4 Configure Supabase Auth

In Supabase dashboard, go to Authentication > Providers:

1. **Email:** Enable "Email" provider
2. **Magic Link:** Enable "Email OTP" (magic links)
3. **Redirect URLs:** Add:
   - `http://localhost:3000/auth/callback`
   - `https://quantasy.ai/auth/callback` (for production later)

### 4.5 Create Supabase Client Helpers

**Create `src/lib/supabase/client.ts` (Browser client):**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Create `src/lib/supabase/server.ts` (Server client):**

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Server Component - can't set cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Server Component - can't remove cookies
          }
        },
      },
    }
  )
}
```

**Create `src/lib/supabase/middleware.ts`:**

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}
```

**Create `src/lib/supabase/types.ts` (placeholder):**

```typescript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          sleeper_user_id: string | null
          sleeper_username: string | null
          sleeper_avatar: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          sleeper_user_id?: string | null
          sleeper_username?: string | null
          sleeper_avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sleeper_user_id?: string | null
          sleeper_username?: string | null
          sleeper_avatar?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
  }
}
```

### 4.6 Create Root Middleware

**Create `middleware.ts` in project root:**

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 4.7 Build Auth UI

**Create `src/app/(auth)/login/page.tsx`:**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ 
        type: 'success', 
        text: 'Check your email for the magic link!' 
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FadeIn className="w-full max-w-md">
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-purple)] bg-clip-text text-transparent">
              Welcome to Quantasy
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Sign in to access your fantasy football tools
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending magic link...' : 'Send Magic Link'}
            </Button>
          </form>

          {message && (
            <div className={`
              p-4 rounded-lg text-sm
              ${message.type === 'success' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }
            `}>
              {message.text}
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  )
}
```

**Create `src/app/(auth)/auth/callback/route.ts`:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login if something went wrong
  return NextResponse.redirect(`${origin}/login`)
}
```

**Create `src/app/(auth)/layout.tsx`:**

```typescript
import { type ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {children}
    </div>
  )
}
```

### 4.8 Create Auth Context Provider

**Create `src/components/providers/auth-provider.tsx`:**

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 4.9 Protect Dashboard Routes

**Create `src/app/(dashboard)/layout.tsx`:**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DesktopSidebar } from '@/components/layout/desktop-sidebar'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <DesktopSidebar />
      <main className="lg:pl-64">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
```

**Deliverables Check:**
- [ ] Supabase project created
- [ ] Database schema deployed with RLS policies
- [ ] Environment variables configured
- [ ] Supabase client helpers created
- [ ] Auth middleware configured
- [ ] Login page with magic link
- [ ] Auth callback route
- [ ] AuthProvider context
- [ ] Protected dashboard layout
- [ ] Full auth flow working (login → email → callback → dashboard)

---

## 🚀 BLOCK 5: CORE PAGES & DEPLOYMENT
**Duration:** Days 8-10 (12-16 hours)

### 5.1 Build Landing Page

**Update `src/app/page.tsx`:**

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { BarChart3, Users, ArrowLeftRight, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Draft Assistant',
    description: 'Value-Based Drafting (VBD) rankings that adapt in real-time to your league settings.',
    color: 'accent-purple',
  },
  {
    icon: Users,
    title: 'Roster Optimizer',
    description: 'Greedy algorithm for optimal lineups. See all possible combinations explained.',
    color: 'accent-blue',
  },
  {
    icon: ArrowLeftRight,
    title: 'Trade Calculator',
    description: 'Fair trade evaluation with transparent methodology. Know exactly why a trade works.',
    color: 'accent-gold',
  },
  {
    icon: TrendingUp,
    title: 'Waiver Wire Tool',
    description: 'FAAB optimization and waiver priority recommendations based on your roster needs.',
    color: 'accent-green',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <FadeIn>
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-[var(--color-accent-gold)] via-[var(--color-accent-purple)] to-[var(--color-accent-pink)] bg-clip-text text-transparent">
            Quantasy
          </h1>
          <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] mb-8 max-w-2xl mx-auto">
            Fantasy football tools built on algorithmic transparency and mathematical rigor.
          </p>
          <Link href="/login">
            <Button size="lg" className="btn-primary text-lg px-8 py-6">
              Connect with Sleeper
            </Button>
          </Link>
        </FadeIn>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <FadeIn delay={0.2}>
          <h2 className="text-4xl font-bold text-center mb-12">
            Four Tools. One Mission.
          </h2>
        </FadeIn>

        <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <StaggerItem key={feature.title}>
                <Card className="card-balatro p-8 h-full">
                  <div className={`w-12 h-12 rounded-lg bg-[var(--color-${feature.color})]/20 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-[var(--color-${feature.color})]`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[var(--color-text-secondary)]">
                    {feature.description}
                  </p>
                </Card>
              </StaggerItem>
            )
          })}
        </StaggerList>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <FadeIn delay={0.4}>
          <Card className="card-balatro p-12 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to dominate?</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Connect your Sleeper league and start making data-driven decisions.
            </p>
            <Link href="/login">
              <Button size="lg" className="btn-primary">
                Get Started
              </Button>
            </Link>
          </Card>
        </FadeIn>
      </section>
    </div>
  )
}
```

### 5.2 Build Dashboard Page

**Create `src/app/(dashboard)/dashboard/page.tsx`:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/page-container'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { BarChart3, Users, ArrowLeftRight, TrendingUp, Lock } from 'lucide-react'
import Link from 'next/link'

const tools = [
  {
    href: '/dashboard/draft',
    icon: BarChart3,
    title: 'Draft Assistant',
    description: 'Value-Based Drafting rankings',
    color: 'accent-purple',
    locked: true,
  },
  {
    href: '/dashboard/roster',
    icon: Users,
    title: 'Roster Optimizer',
    description: 'Optimize your starting lineup',
    color: 'accent-blue',
    locked: true,
  },
  {
    href: '/dashboard/trade',
    icon: ArrowLeftRight,
    title: 'Trade Calculator',
    description: 'Evaluate trade fairness',
    color: 'accent-gold',
    locked: true,
  },
  {
    href: '/dashboard/waivers',
    icon: TrendingUp,
    title: 'Waiver Wire',
    description: 'FAAB and priority optimization',
    color: 'accent-green',
    locked: true,
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageContainer>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Welcome back{user?.email && `, ${user.email.split('@')[0]}`}!
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Choose a tool to get started
          </p>
        </div>

        <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon
            const isLocked = tool.locked

            return (
              <StaggerItem key={tool.href}>
                <Link href={isLocked ? '#' : tool.href}>
                  <Card className={`card-balatro p-8 relative ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    {isLocked && (
                      <div className="absolute top-4 right-4">
                        <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-lg bg-[var(--color-${tool.color})]/20 flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 text-[var(--color-${tool.color})]`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{tool.title}</h3>
                    <p className="text-[var(--color-text-secondary)]">
                      {tool.description}
                    </p>
                    {isLocked && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-4">
                        Coming soon in Phase 1
                      </p>
                    )}
                  </Card>
                </Link>
              </StaggerItem>
            )
          })}
        </StaggerList>

        {/* Empty State */}
        <Card className="card-balatro p-12 text-center">
          <h2 className="text-2xl font-bold mb-3">No leagues connected yet</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Connect your Sleeper league to start using Quantasy tools
          </p>
          <Button variant="outline" disabled>
            Connect League (Coming Soon)
          </Button>
        </Card>
      </div>
    </PageContainer>
  )
}
```

### 5.3 Create Placeholder Tool Pages

**Create `src/app/(dashboard)/draft/page.tsx`:**

```typescript
import { PageContainer } from '@/components/layout/page-container'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'

export default function DraftPage() {
  return (
    <PageContainer>
      <FadeIn>
        <Card className="card-balatro p-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Draft Assistant</h1>
          <p className="text-[var(--color-text-secondary)]">
            Coming in Phase 2 - Value-Based Drafting rankings and live draft support
          </p>
        </Card>
      </FadeIn>
    </PageContainer>
  )
}
```

**Create `src/app/(dashboard)/roster/page.tsx`:**

```typescript
import { PageContainer } from '@/components/layout/page-container'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'

export default function RosterPage() {
  return (
    <PageContainer>
      <FadeIn>
        <Card className="card-balatro p-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Roster Optimizer</h1>
          <p className="text-[var(--color-text-secondary)]">
            Coming in Phase 3 - Optimal lineup recommendations with transparency
          </p>
        </Card>
      </FadeIn>
    </PageContainer>
  )
}
```

**Create `src/app/(dashboard)/trade/page.tsx`:**

```typescript
import { PageContainer } from '@/components/layout/page-container'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'

export default function TradePage() {
  return (
    <PageContainer>
      <FadeIn>
        <Card className="card-balatro p-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Trade Calculator</h1>
          <p className="text-[var(--color-text-secondary)]">
            Coming in Phase 3 - Fair trade evaluation with transparent methodology
          </p>
        </Card>
      </FadeIn>
    </PageContainer>
  )
}
```

**Create `src/app/(dashboard)/waivers/page.tsx`:**

```typescript
import { PageContainer } from '@/components/layout/page-container'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'

export default function WaiversPage() {
  return (
    <PageContainer>
      <FadeIn>
        <Card className="card-balatro p-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Waiver Wire Tool</h1>
          <p className="text-[var(--color-text-secondary)]">
            Coming in Phase 4 - FAAB optimization and waiver priority recommendations
          </p>
        </Card>
      </FadeIn>
    </PageContainer>
  )
}
```

### 5.4 Update Root Layout

**Update `src/app/layout.tsx`:**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quantasy - Fantasy Football Tools',
  description: 'AI-powered fantasy football tools and analytics with algorithmic transparency',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 5.5 Set Up Fly.io

#### Install Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Or use homebrew
brew install flyctl

# Verify installation
fly version
```

#### Create Fly.io Account & Login

```bash
fly auth signup  # Create account
# OR
fly auth login   # If account exists
```

#### Launch Fly App

```bash
# In project root
fly launch --name quantasy-alpha --region sjc --no-deploy
```

#### Configure fly.toml

```toml
app = 'quantasy-alpha'
primary_region = 'sjc'

[build]
  dockerfile = 'Dockerfile'

[env]
  PORT = '3000'

[[services]]
  protocol = 'tcp'
  internal_port = 3000
  processes = ['app']

  [[services.ports]]
    port = 80
    handlers = ['http']
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ['tls', 'http']
  
  [services.concurrency]
    type = 'connections'
    hard_limit = 25
    soft_limit = 20

  [[services.tcp_checks]]
    interval = '15s'
    timeout = '2s'
    grace_period = '1s'
    restart_limit = 0

[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']
```

#### Create Dockerfile

```dockerfile
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Update `next.config.ts` for Docker:**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

#### Set Environment Variables on Fly.io

```bash
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG... \
  SUPABASE_SERVICE_ROLE_KEY=eyJhbG... \
  NEXT_PUBLIC_APP_URL=https://quantasy-alpha.fly.dev
```

#### Deploy to Fly.io

```bash
fly deploy
```

#### Configure Custom Domain (quantasy.ai)

```bash
# Add certificate
fly certs add quantasy.ai

# Get DNS records to configure
fly certs show quantasy.ai

# Add to your domain registrar:
# A record: @ -> <IP from fly certs show>
# AAAA record: @ -> <IPv6 from fly certs show>
```

### 5.6 Set Up GitHub Actions CI/CD

**Create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]

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
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Run tests
        run: pnpm test
      
      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

**Create `.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### 5.7 Create E2E Tests

**Create `tests/e2e/auth.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test'

test('auth flow', async ({ page }) => {
  // Go to login page
  await page.goto('/login')

  // Check login page loads
  await expect(page.locator('h1')).toContainText('Welcome to Quantasy')

  // Fill in email
  await page.fill('input[type="email"]', 'test@example.com')
  await page.click('button[type="submit"]')

  // Check success message
  await expect(page.locator('text=Check your email')).toBeVisible()
})

test('protected routes redirect to login', async ({ page }) => {
  // Try to access dashboard without auth
  await page.goto('/dashboard')

  // Should redirect to login
  await expect(page).toHaveURL('/login')
})

test('landing page renders correctly', async ({ page }) => {
  await page.goto('/')

  // Check hero text
  await expect(page.locator('h1')).toContainText('Quantasy')

  // Check features section exists
  await expect(page.locator('text=Draft Assistant')).toBeVisible()
  await expect(page.locator('text=Roster Optimizer')).toBeVisible()
  await expect(page.locator('text=Trade Calculator')).toBeVisible()
  await expect(page.locator('text=Waiver Wire Tool')).toBeVisible()
})
```

### 5.8 Final Testing Commands

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build

# Local testing
pnpm dev

# Deploy
fly deploy
```

**Deliverables Check:**
- [ ] Landing page with Balatro styling and animations
- [ ] Dashboard with 4 tool cards (locked, coming soon state)
- [ ] Placeholder pages for all 4 tools
- [ ] Responsive at mobile/tablet/desktop
- [ ] Fly.io configured with auto-stop
- [ ] Dockerfile working
- [ ] GitHub Actions CI/CD set up
- [ ] Environment variables configured
- [ ] Production deployment successful
- [ ] quantasy.ai domain connected (or quantasy-alpha.fly.dev working)
- [ ] All tests passing
- [ ] Zero console errors

---

## ✅ PHASE 0 COMPLETE - SUCCESS CRITERIA

### Must Have (MVP)
- [ ] Repository with clean folder structure (per file-structure.md)
- [ ] All 6 animation primitives working with Motion package
- [ ] Supabase schema deployed with RLS policies
- [ ] Auth flow: login → magic link → dashboard → logout
- [ ] Landing page with Balatro styling (Tailwind v4)
- [ ] Dashboard shell with empty states
- [ ] CI/CD deploying to Fly.io (sjc region)
- [ ] Mobile-responsive at all breakpoints
- [ ] Zero console errors
- [ ] All dependencies at latest stable versions

### Tech Stack Confirmed
- [ ] Next.js 16.1.4 with Turbopack
- [ ] React 19.2
- [ ] Tailwind CSS 4.0.0 (CSS-first config)
- [ ] Motion 12.27.5 (not framer-motion)
- [ ] shadcn/ui CLI 3.0
- [ ] Supabase (SSR 0.8.0, JS 2.90.1)
- [ ] Vitest 4.0.18 + Playwright
- [ ] pnpm 10.28.1 on Node 24 LTS

### Deployment
- [ ] Fly.io (sjc region, California)
- [ ] Auto-stop enabled (cost savings)
- [ ] quantasy.ai domain configured
- [ ] HTTPS working
- [ ] Environment variables secured

---

## 📋 Related Documents

- [01-tech-stack.md](../plan/01-tech-stack.md) - Technology decisions
- [02-database-schema.md](../plan/02-database-schema.md) - Supabase schema
- [03-animation-system.md](../plan/03-animation-system.md) - Animation components
- [04-file-structure.md](../plan/04-file-structure.md) - Project layout
- [phase-0-foundation.md](../plan/phase-0-foundation.md) - Original Phase 0 spec

---

## 🔧 Build Agent Instructions

When executing this plan:

1. **Execute all 5 blocks sequentially** - each block depends on the previous
2. **Use exact versions specified** - no version drift
3. **Tailwind v4 syntax is different** - use @theme directive, not tailwind.config.js
4. **Motion package** - imports from `motion/react`, not `framer-motion`
5. **Verify each block's deliverables** before proceeding
6. **Run tests after each block** to catch issues early
7. **Don't skip error checking** - zero console errors is required
8. **Deploy only after all local tests pass**

**Estimated total time:** 44-62 hours over 10 days
