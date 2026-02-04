# Versioning & Git Workflow

This document outlines the versioning strategy, branch naming conventions, commit message format, and PR process for Quantasy development.

## Semantic Versioning

Quantasy follows **Semantic Versioning** with a focus on alpha/beta development phases.

### Version Format: `MAJOR.MINOR.PATCH` (e.g., `0.1.0`)

#### Current Version: `0.1.0` (Alpha Testing Phase)

### Versioning Rules

#### Patch Release: `0.x.y` → `0.x.(y+1)`
**When to bump patch version:**
- Bug fixes and hotfixes
- Minor polish and refinements
- Non-breaking changes to existing features
- Documentation updates
- Performance improvements

**Example:** `0.1.0` → `0.1.1` (fix for star rating alignment)

#### Minor Release: `0.x.y` → `0.(x+1).0`
**When to bump minor version:**
- New features or significant enhancements
- Substantial changes to existing functionality
- Potential breaking changes (in 0.x phase)
- New algorithms or major capability additions

**Example:** `0.1.0` → `0.2.0` (redraft/keeper priority support)

#### Major Release: `0.x.y` → `1.0.0`
**When to bump major version:**
- Production-ready public release
- Stable API and feature set
- Criteria TBD from alpha feedback and market validation

**Example:** `0.9.0` → `1.0.0` (public launch)

### Alpha/Beta Phases

- **0.1.x**: Initial alpha testing (25-50 dynasty-focused testers)
- **0.2.x**: Redraft/keeper priority, waiver v2
- **0.3.x+**: Additional features and refinements
- **1.0.0**: Public release (criteria TBD)

---

## Branch Naming Conventions

All branches must follow these naming patterns:

### Feature Branches: `feature/*`
**Purpose:** New features or enhancements
**Pattern:** `feature/short-description`
**Examples:**
- `feature/lineup-optimizer`
- `feature/trade-evaluator-v2`
- `feature/mobile-responsive-ui`

### Fix Branches: `fix/*`
**Purpose:** Bug fixes and hotfixes
**Pattern:** `fix/short-description`
**Examples:**
- `feature/star-rating-alignment`
- `fix/api-rate-limit-handling`
- `fix/supabase-auth-redirect`

### Chore Branches: `chore/*`
**Purpose:** Maintenance, documentation, tooling, and configuration
**Pattern:** `chore/short-description`
**Examples:**
- `chore/update-dependencies`
- `chore/add-github-templates`
- `chore/configure-sentry`

### Release Branches: `release/x.y.z` (Future)
**Purpose:** Prepare for version releases (used when approaching 1.0.0)
**Pattern:** `release/0.2.0`

### Hotfix Branches: `hotfix/x.y.z` (Future)
**Purpose:** Critical production fixes (used after 1.0.0)
**Pattern:** `hotfix/0.1.1`

---

## Commit Message Format

Quantasy uses **Conventional Commits** specification for clear, structured commit messages.

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Commit Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature or capability | `feat(api): add feedback endpoint` |
| `fix` | Bug fix | `fix(ui): star rating alignment` |
| `chore` | Maintenance, deps, tooling | `chore(deps): update next.js to 16.1` |
| `docs` | Documentation changes | `docs: add versioning guide` |
| `test` | Test additions or fixes | `test(vbd): add edge case coverage` |
| `perf` | Performance improvements | `perf(draft): optimize monte carlo simulation` |
| `refactor` | Code restructuring (no behavior change) | `refactor(algorithms): extract vbd logic` |
| `style` | Code style (formatting, linting) | `style: fix eslint violations` |

### Scope (Optional)
Scope indicates the area of the codebase affected:
- `api` - API routes
- `ui` - User interface components
- `algorithms` - VBD, lineup, trade, waiver algorithms
- `sleeper` - Sleeper API integration
- `supabase` - Database and auth
- `draft` - Draft assistant
- `deps` - Dependencies
- `ci` - CI/CD workflows

### Examples

**Good commit messages:**
```
feat(api): add feedback endpoint for alpha testers

fix(ui): correct star rating alignment on mobile

chore(deps): update tailwind to v4.1

docs: add versioning strategy guide

test(vbd): add coverage for edge case with 0 projections

perf(draft): optimize monte carlo simulation by 40%

refactor(algorithms): extract vbd calculation to pure function
```

**Bad commit messages:**
```
fixed stuff
updated code
WIP
big update
```

### Commit Message Guidelines

1. **Use imperative mood** ("add feature" not "added feature")
2. **Keep subject line under 50 characters**
3. **Capitalize the subject line**
4. **Do not end subject line with a period**
5. **Separate subject from body with a blank line**
6. **Wrap body at 72 characters**
7. **Use body to explain what and why, not how**

---

## Pull Request Process

### Overview
All code changes go through pull requests. Direct commits to `prod` and `dev` are prohibited.

### PR Workflow

1. **Create feature/fix/chore branch** from `dev`
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/my-feature
   ```

2. **Make commits** following Conventional Commits format
   ```bash
   git commit -m "feat(scope): description"
   ```

3. **Push branch** to remote
   ```bash
   git push -u origin feature/my-feature
   ```

4. **Open Pull Request** on GitHub
   - Use the PR template (auto-populated)
   - Fill in all sections
   - Link related issues if applicable

5. **Pass all CI checks**
   - Type check: `pnpm type-check`
   - Lint: `pnpm lint`
   - Unit tests: `pnpm test:run`
   - Build: `pnpm build`
   - E2E tests: `pnpm test:e2e`

6. **Code review** (if applicable)
   - Address feedback
   - Push additional commits
   - Request re-review

7. **Merge to dev** (Squash merge)
   - Use "Squash and merge" strategy
   - Commit message: Use the PR title or a summary
   - Delete branch after merge

8. **Merge to prod** (when ready for release)
   - Create PR from `dev` to `prod`
   - Bump version in `package.json`
   - Create git tag: `git tag v0.x.y`
   - Squash merge to `prod`

### PR Merge Strategy

**Squash Merge** is used for all PRs:
- Combines all commits into a single commit
- Keeps `prod` history clean
- Makes it easy to revert entire features
- Preserves full commit history in PR

### PR Requirements

- [ ] All CI checks pass
- [ ] At least one approval (for team PRs)
- [ ] No merge conflicts
- [ ] Follows Conventional Commits format
- [ ] Includes tests for new features
- [ ] Documentation updated if needed

### Branch Protection Rules

- `prod` branch:
  - Require pull request reviews
  - Require status checks to pass
  - Require branches to be up to date
  - Dismiss stale PR approvals
  - Require code owner reviews (future)

- `dev` branch:
  - Require status checks to pass
  - Require branches to be up to date

---

## Release Process

### Alpha/Beta Releases (0.x.y)

1. **Update version** in `package.json`
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. **Create release PR** to `prod`
   - Title: `chore(release): bump version to 0.2.0`
   - Include changelog summary

3. **Merge to prod** with squash merge

4. **Create git tag**
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

5. **Create GitHub Release**
   - Tag: `v0.2.0`
   - Title: `Version 0.2.0 - Alpha Release`
   - Description: Changelog and highlights

### Production Release (1.0.0+)

Future process to be defined as we approach 1.0.0.

---

## Development Workflow Summary

```
┌─────────────────────────────────────────────────────────┐
│ 1. Create feature branch from dev                        │
│    git checkout -b feature/my-feature                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Make commits with Conventional Commits format         │
│    git commit -m "feat(scope): description"              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Push to remote and open PR                            │
│    git push -u origin feature/my-feature                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Pass all CI checks                                    │
│    type-check, lint, test, build, e2e                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Squash merge to dev                                   │
│    GitHub: "Squash and merge"                            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. When ready: Create release PR to prod                 │
│    Bump version, create tag, merge                       │
└─────────────────────────────────────────────────────────┘
```

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Branching Model](https://nvie.com/posts/a-successful-git-branching-model/)

---

## Questions?

For questions about versioning or git workflow, refer to this document or open an issue in the repository.
