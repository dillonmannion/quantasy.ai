# AI INTEGRATION

## OVERVIEW

Groq AI (llama-3.3-70b-versatile) for VBD explanations. Rate-limited, cached responses.

## FILES

| File | Purpose |
|------|---------|
| `groq.ts` | Groq client singleton + `generateExplanation()` |
| `rate-limiter.ts` | 30 req/min sliding window limiter |
| `index.ts` | Barrel export |

## USAGE

```typescript
import { generateExplanation, aiRateLimiter } from '@/lib/ai'

// Check rate limit first
const { allowed, retryAfterMs } = aiRateLimiter.checkLimit()
if (!allowed) {
  // Wait retryAfterMs before retry
}

// Generate explanation
const explanation = await generateExplanation({
  playerName: 'Patrick Mahomes',
  position: 'QB',
  vbd: 45.2,
  projectedPoints: 380.5,
  baselinePlayerName: 'Jared Goff',
  baselinePoints: 335.3,
  scoringFormat: 'ppr'
})
```

## RATE LIMITING

- **Limit**: 30 requests per minute (Groq free tier)
- **Window**: Sliding 60s window
- **Enforcement**: `aiRateLimiter.checkLimit()` before each call
- **API Route**: `/api/ai/explain` checks limit, returns 429 if exceeded

## CONVENTIONS

- Server-only: `GROQ_API_KEY` is never exposed to client
- Singleton client: Created once, reused
- Explanations cached in `algorithm_outputs` table (indefinite TTL)
- Temperature 0.7, max 300 tokens for consistent responses

## ANTI-PATTERNS

- **DO NOT** call `generateExplanation()` from client components
- **DO NOT** skip rate limit check before API calls
- **DO NOT** expose `GROQ_API_KEY` via `NEXT_PUBLIC_` prefix
