# Animation System Specification

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete animation primitives reference for implementation

---

## Design Tokens (CSS Variables)

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

---

## Animation Primitive Components

### 1. `<FadeIn>` - Basic entrance animation

**File:** `components/animation/fade-in.tsx`

```tsx
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

---

### 2. `<StaggerList>` - Staggered children animation

**File:** `components/animation/stagger-list.tsx`

```tsx
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

---

### 3. `<CardFlip>` - Balatro-style card reveal

**File:** `components/animation/card-flip.tsx`

```tsx
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

---

### 4. `<Kaching>` - Score/value celebration popup

**File:** `components/animation/kaching.tsx`

```tsx
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
                {variant === 'gold' ? '&#x1FA99;' : variant === 'green' ? '&#x2713;' : '&#x2B50;'}
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

---

### 5. `<ScoreCounter>` - Animated number ticker

**File:** `components/animation/score-counter.tsx`

```tsx
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

---

### 6. `<Shimmer>` - Loading/highlight effect

**File:** `components/animation/shimmer.tsx`

```tsx
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

---

## Animation Hooks

### `useCelebration` - Trigger celebration animations

**File:** `hooks/use-celebration.ts`

```tsx
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

## Usage Examples

### Celebrating a good trade

```tsx
const { isShowing, value, label, celebrate } = useCelebration();

// When trade is evaluated as good
celebrate('+12.5', 'Great Trade!');

// In render
<Kaching show={isShowing} value={value} label={label} variant="gold" />
```

### Staggered player list

```tsx
<StaggerList>
  {players.map(player => (
    <StaggerItem key={player.id}>
      <PlayerCard player={player} />
    </StaggerItem>
  ))}
</StaggerList>
```

### Loading state with shimmer

```tsx
<div className="relative">
  <PlayerCardSkeleton />
  <Shimmer />
</div>
```

---

## Related Documents

- [01-tech-stack.md](./01-tech-stack.md) - Design philosophy
- [phase-0-foundation.md](./phase-0-foundation.md) - Animation implementation in Week 1
