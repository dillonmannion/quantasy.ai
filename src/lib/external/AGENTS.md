# EXTERNAL DATA SOURCES

## OVERVIEW

Third-party dynasty/redraft values + player ID mapping. Scrapes KeepTradeCut, Dynasty Process, FantasyCalc.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `dynasty-process.ts` | `getFuturePickValues` | Draft pick values (1st-4th round) |
| `dynasty-process-players.ts` | `fetchDynastyProcessPlayerValues` | Dynasty player values |
| `ktc.ts` | `scrapeKTCPickValues` | KeepTradeCut pick values |
| `ktc-players.ts` | `fetchKTCPlayerValues` | KTC player values (rate-limited) |
| `fantasy-calc.ts` | `scrapeFantasyCalcPickValues` | FantasyCalc pick values |
| `fantasy-calc-players.ts` | `fetchFantasyCalcPlayerValues` | FantasyCalc player values |
| `player-id-mapping.ts` | `getKTCIdFromSleeper`, `getSleeperIdFromKTC` | Cross-platform ID mapping |
| `index.ts` | All exports | Barrel export |

## USAGE

```typescript
import { 
  fetchKTCPlayerValues,
  getKTCIdFromSleeper,
  getFuturePickValues 
} from '@/lib/external'

// Get player values from KTC
const ktcValues = await fetchKTCPlayerValues()

// Map Sleeper ID to KTC ID
const ktcId = await getKTCIdFromSleeper('4046')  // Mahomes

// Get draft pick values
const pickValues = await getFuturePickValues()
```

## CACHING

All sources use in-memory caching with manual invalidation:

| Source | Cache Functions |
|--------|-----------------|
| Dynasty Process | `clearDynastyProcessPlayerCache()` |
| KTC | `clearKTCCache()`, `clearKTCPlayerCache()` |
| FantasyCalc | `clearFantasyCalcCache()`, `clearFantasyCalcPlayerCache()` |
| ID Mapping | `clearPlayerIdMappingCache()` |

## RATE LIMITING

- **KTC Players**: Has internal rate limiter, use `resetKTCPlayerRateLimiter()` if needed
- **Other Sources**: No rate limiting (public APIs)

## CONVENTIONS

- All functions are async (scraping + network)
- Cache status via `get*CacheStatus()` functions
- IDs are strings (e.g., "4046" for Sleeper, numeric for KTC)
- Use barrel export from `@/lib/external`

## ANTI-PATTERNS

- **DO NOT** call scrapers in loops without caching
- **DO NOT** store sensitive data (no auth required for these APIs)
- **DO NOT** bypass cache for hot paths (scraping is slow)

## IMPORT PATTERNS

```typescript
// CORRECT - use barrel export
import { fetchKTCPlayerValues, getKTCIdFromSleeper } from '@/lib/external'

// WRONG - deep import
import { fetchKTCPlayerValues } from '@/lib/external/ktc-players'
```
