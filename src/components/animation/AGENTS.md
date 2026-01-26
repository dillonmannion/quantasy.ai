# ANIMATION COMPONENTS

## OVERVIEW

Balatro-inspired animation primitives. All use motion/react library.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `fade-in.tsx` | `FadeIn` | Fade + slide entrance |
| `stagger-list.tsx` | `StaggerList`, `StaggerItem` | Staggered list animation |
| `kaching.tsx` | `Kaching` | Celebration with particles |
| `shimmer.tsx` | `Shimmer` | Loading skeleton effect |
| `card-flip.tsx` | `CardFlip` | Card flip animation |
| `score-counter.tsx` | `ScoreCounter` | Animated number counter |
| `index.ts` | All exports | Barrel export |

## USAGE

```typescript
import { FadeIn, StaggerList, StaggerItem, Kaching } from '@/components/animation'

// Fade entrance
<FadeIn delay={0.1} duration={0.3}>
  <Content />
</FadeIn>

// Staggered list
<StaggerList>
  {items.map(item => (
    <StaggerItem key={item.id}>
      <Card />
    </StaggerItem>
  ))}
</StaggerList>

// Celebration (gold/green/purple variants)
<Kaching isShowing={true} value={25} label="VBD Score" variant="gold" />
```

## KACHING VARIANTS

| Variant | Use Case |
|---------|----------|
| `gold` | High value (VBD elite) |
| `green` | Good value (VBD above average) |
| `purple` | Special (trade win, etc.) |

## HOOKS

- `useCelebration()` - Triggers Kaching with auto-hide (2s default)
- `useReducedMotion()` - Returns true if user prefers reduced motion

## CONVENTIONS

- All components use `'use client'`
- All use `cn()` for conditional Tailwind classes
- All respect `prefers-reduced-motion` via `useReducedMotion()` hook
- Use `motion/react` (not framer-motion directly)
- Export from `index.ts` - check before adding new animations

## ADDING NEW ANIMATIONS

1. Create `src/components/animation/[name].tsx`
2. Use `'use client'` directive
3. Import `motion` from `motion/react`
4. Respect `useReducedMotion()` for accessibility
5. Export from `index.ts`
