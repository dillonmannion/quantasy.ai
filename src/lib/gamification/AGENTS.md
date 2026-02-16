# GAMIFICATION

## OVERVIEW

Achievements and streaks system. Tracks user milestones and daily engagement.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `achievements.ts` | `checkAchievement`, `unlockAchievement`, `getUserAchievements`, `incrementCounter` | Core achievement logic |
| `counters.ts` | Counter utilities | Track progress toward achievements |
| `streaks.ts` | Streak tracking | Daily login/activity streaks |
| `types.ts` | `AchievementType`, `CounterType`, `GamificationCounters` | TypeScript types |
| `index.ts` | All exports | Barrel export |

## ACHIEVEMENT TYPES

```typescript
type AchievementType =
  | 'first_draft'      // Complete first mock draft
  | 'trade_master'     // Evaluate 10 trades
  | 'waiver_wire'      // Add 5 waiver claims
  | 'lineup_optimizer' // Use lineup optimizer 3 times
  | 'streak_7'         // 7-day login streak
  | 'streak_30'        // 30-day login streak
```

## USAGE

```typescript
import { checkAchievement, unlockAchievement, incrementCounter } from '@/lib/gamification'

// Check if user qualifies for achievement
const qualifies = await checkAchievement(userId, 'first_draft')

// Unlock achievement (idempotent)
await unlockAchievement(userId, 'first_draft')

// Increment counter toward achievement
await incrementCounter(userId, 'trades_evaluated')
```

## INTEGRATION POINTS

- **Draft completion**: Triggers `first_draft` check
- **Trade evaluation**: Increments `trades_evaluated` counter
- **Waiver claims**: Increments `waiver_claims` counter
- **Daily login**: Updates streak in middleware/layout

## CONVENTIONS

- All functions are async (Supabase operations)
- Achievement unlocks are idempotent (safe to call multiple times)
- Use barrel export from `@/lib/gamification`
- Types in `types.ts`, never inline

## ANTI-PATTERNS

- **DO NOT** unlock achievements without `checkAchievement()` first
- **DO NOT** call gamification from client components (server-only)

## DATABASE

Stored in Supabase (tables managed via migrations):
- `user_achievements` - Unlocked achievements per user
- `user_counters` - Progress counters per user
- `user_streaks` - Streak data per user
