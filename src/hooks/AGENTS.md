# CUSTOM HOOKS

## OVERVIEW

Cross-cutting React hooks. All client-side, SSR-safe.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `use-celebration.ts` | `useCelebration` | Balatro-style celebration animation |
| `use-draft-sync.ts` | `useDraftSync` | Real-time draft polling |
| `use-connection-status.ts` | `useConnectionStatus` | Network status detection |
| `use-reduced-motion.ts` | `useReducedMotion` | Accessibility preference |

## USAGE

```typescript
// Celebration (Kaching animation)
const { celebrate, celebration } = useCelebration()
celebrate(25, 'VBD Score', 'gold')  // value, label, variant
<Kaching {...celebration} />

// Draft sync (polls every 3s)
const { syncStatus, error, lastSyncTime } = useDraftSync(draftId, isLive)

// Network status
const { isOnline, isReconnecting, retry } = useConnectionStatus()

// Reduced motion (accessibility)
const prefersReducedMotion = useReducedMotion()
```

## PATTERNS

### SSR Safety
All hooks check `typeof window` before browser APIs:
```typescript
if (typeof window === 'undefined') return defaultValue
```

### Exponential Backoff
Used in `useDraftSync` and `useConnectionStatus`:
```typescript
const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
```

### Cleanup
All hooks clean up with `useRef` + `useEffect`:
```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }
}, [])
```

## CELEBRATION VARIANTS

| Variant | Use Case |
|---------|----------|
| `gold` | Elite VBD value |
| `green` | Above average value |
| `purple` | Special (trade win) |

## CONVENTIONS

- All hooks use `'use client'`
- Use `useCallback` for stable function references
- Use `useRef` for cleanup timers/intervals
- Respect `useReducedMotion()` in animation hooks
- Return objects (not arrays) for named destructuring

## ADDING NEW HOOKS

1. Create `src/hooks/use-[name].ts`
2. Add `'use client'` directive
3. Check SSR safety (`typeof window`)
4. Use `useCallback`/`useRef` for cleanup
5. Export single named function
