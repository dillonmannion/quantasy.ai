# Contributing to Quantasy

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm types:generate
pnpm dev
```

---

## Git Workflow

### Branching Strategy — Modified GitHub Flow

```
prod ────────────●──────────────●──── (Fly.io deploys)
                 ↑              ↑
           (promote dev)  (promote dev)
                 │              │
dev  ──●──●──●──●──●──●──●──●──●──── (CI gate, always stable)
       ↑     ↑        ↑     ↑
  feat/A  fix/B   feat/C  chore/D
```

- **`prod`** — Production. Fly.io deploys from here. Never commit directly.
- **`dev`** — Integration branch. CI must pass before anything merges. Never commit directly.
- **Feature branches** — All work happens here. Short-lived (1-3 days max). Branch from `dev`.

### Branch Naming

**Pattern:** `{type}/{kebab-case-description}`

| Type | Use for | Example |
|------|---------|---------|
| `feat/` | New features | `feat/draft-assistant-ui` |
| `fix/` | Bug fixes | `fix/roster-sync-race-condition` |
| `chore/` | Deps, config, tooling | `chore/upgrade-nextjs-16` |
| `docs/` | Documentation only | `docs/algorithm-explainer` |
| `refactor/` | Code restructuring (no behavior change) | `refactor/extract-sleeper-client` |
| `ci/` | CI/CD pipeline changes | `ci/add-e2e-chromium-job` |
| `perf/` | Performance improvements | `perf/player-list-virtualization` |
| `test/` | Test-only changes | `test/vbd-edge-cases` |

**Rules:**
- Lowercase only, kebab-case, no spaces
- Keep under 50 characters
- Present tense (`add-dark-mode` not `added-dark-mode`)
- No personal names (`john/fix-bug` is meaningless to future readers)

### Branch Lifecycle

```bash
# 1. CREATE — always branch from latest dev
git checkout dev && git pull
git checkout -b feat/my-feature

# 2. WORK — commit frequently with conventional messages
git add src/components/DraftBoard.tsx
git commit -m "feat(draft): add player card drag-and-drop"

# 3. STAY CURRENT — rebase on dev before opening PR
git fetch origin
git rebase origin/dev

# 4. PUSH & OPEN PR
git push -u origin feat/my-feature
gh pr create --base dev --title "feat(draft): add player card drag-and-drop"

# 5. CI RUNS — type-check, lint, test, build must all pass

# 6. MERGE — squash merge via GitHub UI

# 7. DELETE BRANCH — GitHub auto-deletes after merge
git checkout dev && git pull
git branch -d feat/my-feature
```

### Merge Strategy

| Merge Type | When | Why |
|------------|------|-----|
| **Squash merge** | Feature branches → `dev` | Keeps `dev` log clean; WIP commits disappear |
| **Merge commit** | `dev` → `prod` promotions | Preserves the promotion event in history |

### Promoting to Production

```bash
# Create a promotion PR
gh pr create --base prod --head dev \
  --title "chore: promote to prod [v1.x.0]" \
  --body "## Changes since last promotion\n- feat: ...\n- fix: ..."

# After merge, tag immediately
git checkout prod && git pull
git tag -a v1.x.0 -m "Release v1.x.0: Brief description"
git push origin v1.x.0
```

---

## Commit Messages

Follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

### Format

```
<type>(<scope>): <imperative description>

[optional body — explains WHY, not WHAT]

[optional footer(s)]
```

### Types

| Type | SemVer Impact | Use for |
|------|--------------|---------|
| `feat` | MINOR | New feature |
| `fix` | PATCH | Bug fix |
| `perf` | PATCH | Performance improvement (no API change) |
| `refactor` | — | Code restructuring (no behavior change) |
| `docs` | — | Documentation only |
| `test` | — | Adding or correcting tests |
| `build` | — | Build system, dependency changes |
| `ci` | — | CI configuration changes |
| `style` | — | Formatting, whitespace (no logic change) |
| `chore` | — | Maintenance tasks |
| `revert` | varies | Reverts a previous commit |

### Scopes

Match the project architecture:

`draft` `algorithms` `monte-carlo` `sleeper` `auth` `ui` `api` `db` `trade` `waivers` `roster` `players` `animation`

Scope is optional. Omit when the change is cross-cutting or doesn't fit a single module.

### Subject Line Rules

- **Imperative mood**: "add" not "added" or "adds"
- **Lowercase** after the colon: `feat: add search` not `feat: Add search`
- **No trailing period**
- **72 character max** — hard limit
- Must complete the sentence: *"If applied, this commit will ___"*

### Body Rules

- Separate from subject with a blank line
- Wrap at 72 characters
- Explain **why** the change was necessary, not **how** (the diff shows how)
- Include context: what the previous behavior was and what it is now

### Footer Conventions

```
Closes #123              — auto-closes issue on merge
Fixes #456               — same as Closes
Refs #789                — reference without closing
BREAKING CHANGE: <desc>  — triggers MAJOR version bump
Co-authored-by: Name <email>
```

### Breaking Changes

Use `!` after the type AND/OR `BREAKING CHANGE:` in the footer:

```
feat(api)!: require auth header on all endpoints

BREAKING CHANGE: Previously, GET /public/* was unauthenticated.
All endpoints now require a valid Bearer token.
```

### Examples

```bash
# Minimal
fix: correct off-by-one in pagination

# With scope
feat(draft): add snake-draft order visualization

# With body
perf(algorithms): cache VBD results with SHA256 key

Previously, VBD recalculated on every page load even when inputs
hadn't changed. This adds content-addressed caching with a 1h TTL,
reducing average page load from 1.2s to 180ms.

# With footer
fix(sleeper): handle 429 rate limit with exponential backoff

Closes #42

# Full example
feat(trade)!: change trade value response format

The trade analyzer previously returned a flat score. This changes
the response to include confidence intervals from Monte Carlo
simulation, giving users visibility into outcome variance.

BREAKING CHANGE: TradeAnalysis.score is now TradeAnalysis.expected_value.
Clients must update to use the new field name.
Closes #87
```

### Anti-patterns

```bash
# Vague
fix: bug fix                         # What bug?

# Past tense
feat: added user authentication      # Use imperative: "add"

# Multiple unrelated changes
feat: add login, fix navbar, update README  # One change per commit

# No context
refactor: refactored the code        # The diff shows that. WHY?

# WIP in main history
wip: still working on this           # Squash before merge
```

---

## Pull Requests

### Title

Follows the same convention as commit messages:

```
type(scope): imperative description
```

The squash-merge commit message will be derived from the PR title. Make it count.

### Size

| Size | LOC Changed | Verdict |
|------|-------------|---------|
| Ideal | ≤400 | Target this |
| Acceptable | 400-800 | Justify in PR description |
| Warning | 800-1000 | Strongly consider splitting |
| Too large | >1000 | Split it. No exceptions. |

Auto-generated files, lock files, and large deletions don't count toward LOC limits.

### Description

Fill out the PR template completely. The two most important sections:

1. **Why** — Reviewers evaluate your *approach*, not just your code. Without context, they can only check syntax.
2. **How to Test** — If a reviewer can't verify your change, the PR is incomplete.

### Linking Issues

```
Closes #123          — auto-closes on merge (use in PR body, not commit messages)
Related to #456      — reference without closing
Part of #789         — partial work toward a larger goal
```

### Draft PRs

Use GitHub Draft PRs for:
- Early architectural feedback
- WIP that's blocked on another PR
- Sharing for async discussion

Convert to Ready only when: CI green + self-review done + description complete.

---

## Testing

### Before Opening a PR

```bash
pnpm validate          # type-check + lint + tests (MUST pass)
```

### Test Requirements

| Change Type | Test Requirement |
|-------------|-----------------|
| Algorithm change | Unit tests required (VBD: 100% coverage) |
| UI component | E2E test if interactive; visual check at minimum |
| API route | Unit test for happy path + error cases |
| Bug fix | Regression test that fails without the fix |
| Refactor | Existing tests must still pass |

### Commands

```bash
pnpm test:run          # Unit tests (Vitest)
pnpm test:coverage     # Coverage report
pnpm test:e2e          # E2E (Playwright: Chromium + Mobile Safari)
pnpm type-check        # TypeScript strict mode
pnpm lint              # ESLint
```

---

## Code Standards

- **TypeScript strict mode** — no `any`, no `@ts-ignore`, no `@ts-expect-error`
- **Named exports only** — no default exports
- **Server Components by default** — `'use client'` only when needed
- **`motion/react`** — not framer-motion
- **`cn()` from `@/lib/utils`** — for conditional Tailwind classes
- **Barrel imports** — `@/lib/sleeper` not `@/lib/sleeper/client`

Full conventions are in [AGENTS.md](./AGENTS.md).

---

## In-Code Documentation

### Document these — always

| What | Why |
|------|-----|
| Public API functions | Contract, params, return type, units |
| Non-obvious algorithms | Why this approach, what the math means |
| Magic numbers | `const CACHE_TTL_MS = 86_400_000 // 24h` |
| Workarounds | `// Sleeper returns null for IR players, not 0` |
| Complex conditions | Extract to named variable OR add comment |
| `TODO`/`FIXME` | Always include issue reference: `// TODO(#123): ...` |

### Skip documentation for

- Self-evident getters/setters
- Simple React components with clear prop names
- Internal helpers called from a single location
- Anything where function name + TypeScript types tell the full story

### TSDoc Format

```typescript
/**
 * Calculates Value Based Drafting score relative to a positional baseline.
 *
 * @param player - Player with projectedPoints in full-season fantasy points
 * @param baseline - Replacement-level player's projected points for this position
 * @returns Positive = above replacement, negative = below
 *
 * @example
 * calculateVBD(mahomes, 280) // 142 (Mahomes projects 422pts, baseline 280)
 */
export function calculateVBD(player: Player, baseline: number): number {
  return player.projectedPoints - baseline
}
```
