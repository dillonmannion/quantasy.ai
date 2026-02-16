# AI INTEGRATION

## OVERVIEW

Groq AI (llama-3.1-8b-instant) for VBD explanations. Rate-limited, cached responses.

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

## API ROUTE PATTERN

The `/api/ai/explain` route wraps `generateExplanation()`:

```typescript
// In client component - call via API route
const response = await fetch('/api/ai/explain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerName: 'Patrick Mahomes',
    position: 'QB',
    vbd: 45.2,
    projectedPoints: 380.5,
    baselinePlayerName: 'Jared Goff',
    baselinePoints: 335.3,
    scoringFormat: 'ppr'
  })
})

if (response.status === 429) {
  // Rate limited - show retry message
  const { retryAfterMs } = await response.json()
}
```

## IMPORT PATTERNS

```typescript
// Server-side only
import { generateExplanation, aiRateLimiter } from '@/lib/ai'

// Check rate limit before expensive call
const { allowed, retryAfterMs } = aiRateLimiter.checkLimit()
if (!allowed) {
  return NextResponse.json({ error: 'Rate limited', retryAfterMs }, { status: 429 })
}
```
