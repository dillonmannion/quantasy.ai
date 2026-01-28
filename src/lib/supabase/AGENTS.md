# SUPABASE INTEGRATION

## OVERVIEW

Auth + database layer. Three client types for different contexts. RLS-protected tables.

## FILES

| File | Purpose |
|------|---------|
| `server.ts` | Server client factory (async, cookie handling) |
| `client.ts` | Browser client factory (sync, no cookies) |
| `admin.ts` | Service role client (privileged ops, cached singleton) |
| `middleware.ts` | Session refresh on every request |
| `types.ts` | Generated DB types (`Database` interface) |
| `types.generated.ts` | Auto-generated from schema (do not edit) |

## CLIENT SELECTION

| Context | Client | Usage |
|---------|--------|-------|
| API routes | `await createClient()` | Server with cookies |
| Server actions | `await createClient()` | Server with cookies |
| Server components | `await createClient()` | Server with cookies |
| Client components | `createClient()` (from client.ts) | Browser client |
| Admin operations | `createServiceClient()` | Service role |

## USAGE

```typescript
// Server-side (API routes, server actions)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

// Client-side
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Admin operations (user creation, magic links)
import { createServiceClient } from '@/lib/supabase/admin'
const admin = createServiceClient()
```

## AUTH FLOW

```
Request → middleware.ts → updateSession() → Cookie refresh
                ↓
        Dashboard layout checks getUser()
                ↓
        No user? Redirect to /login
```

## DATABASE OPERATIONS

```typescript
// SELECT
const { data, error } = await supabase
  .from('table')
  .select('column1, column2')
  .eq('id', value)
  .single()

// INSERT
const { error } = await supabase
  .from('table')
  .insert({ field1: value1 })

// UPSERT (with conflict)
await supabase.from('table').upsert(
  { id, field: value },
  { onConflict: 'id' }
)
```

## TABLES

| Table | Purpose | TTL |
|-------|---------|-----|
| `profiles` | User + Sleeper connection | - |
| `leagues` | Cached league data | 1h |
| `user_leagues` | User-league associations | - |
| `rosters` | Cached roster data | 15m |
| `players` | Player data + projections | 24h |
| `matchups` | Weekly matchup data | 5m |
| `algorithm_outputs` | Saved results + AI explanations | - |

## CONVENTIONS

- **DO NOT** create clients manually - use factory functions
- **DO NOT** use browser client in server code
- **DO NOT** skip `await` on server client creation
- Server client is async: `await createClient()`
- Browser client is sync: `createClient()`
- All queries typed via `<Database>` generic
- RLS policies enforce row-level access

## ERROR HANDLING

```typescript
const { data, error } = await supabase.from('table').select()
if (error) {
  console.error('[Context] Error:', error)
  // Handle gracefully - don't throw unless critical
}
```
