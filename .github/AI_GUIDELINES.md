# AI-Generated Text Guidelines

Guidelines for AI-assisted contributions to maintain authentic, human-quality output.

## Voice & Tone

- **Direct**: State facts, don't hedge ("This fixes X" not "This should hopefully fix X")
- **Technical**: Use precise terminology, assume reader competence
- **Concise**: One clear sentence beats three vague ones
- **Confident**: If unsure, say so explicitly rather than hedging everything

## Anti-Patterns (Never Use)

| Pattern | Example | Why It's Bad |
|---------|---------|--------------|
| Enthusiasm fillers | "Great question!", "I'd be happy to" | Adds no information |
| Excessive hedging | "It appears that", "It seems like" | Undermines confidence |
| Redundant intros | "This commit...", "This PR..." | Reader knows the context |
| Emoji overuse | "Fixed the bug! 🎉🚀✨" | Unprofessional in commits |
| Bullet everything | Converting prose to bullets | Sometimes sentences are better |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): concise description

# Types: feat, fix, refactor, test, chore, docs, perf, ci
# Scope: optional, e.g., (trade), (draft), (api)
```

**Rules:**
- First line ≤72 characters
- Imperative mood ("add" not "added")
- Focus on WHY, not WHAT (code shows the what)
- No period at end of first line

```bash
# Good
feat(trade): add dynasty format toggle for pick valuations
fix(api): prevent timeout on large roster syncs
refactor(vbd): extract baseline calculation for testability

# Bad
feat: Added new feature for trade format toggling functionality
Fixed a bug
Update trade.ts
```

## Pull Request Descriptions

Structure:
```markdown
## Summary
- [1-3 bullet points of what changed]

## Why
[1-2 sentences on motivation - skip if obvious from summary]

## Testing
[How it was verified]
```

**Keep it scannable.** Reviewers skim PRs.

```markdown
# Good
## Summary
- Add multi-source player values (DynastyProcess, FantasyCalc, KTC)
- Z-score normalization for cross-source comparison
- Format toggle in trade page header

## Testing
Unit tests for normalization, E2E for toggle interaction.

# Bad
## Summary
This pull request introduces a comprehensive integration with multiple
external fantasy football data sources to provide users with enhanced
trade evaluation capabilities. The implementation includes...
[300 more words]
```

## Code Review Comments

- Be specific: Include line numbers, variable names
- Be actionable: Say what to do, not just what's wrong
- Be brief: One issue per comment

```
# Good
Line 42: This will throw if `players` is undefined. Use optional chaining: `players?.length`

# Bad
I noticed that there might potentially be an issue here where the code
could possibly fail under certain circumstances if the players variable
happens to be undefined at runtime...
```

## Documentation

- Match existing doc style in the repo
- Prefer examples over explanations
- Keep README focused on getting started
- Technical depth goes in AGENTS.md or inline

## Issue Descriptions

```markdown
## Problem
[What's broken or missing - 1-2 sentences]

## Expected
[What should happen]

## Actual
[What happens instead]

## Repro (if bug)
1. Step one
2. Step two
```

## Release Notes

User-facing language, grouped by impact:

```markdown
### Added
- Dynasty/redraft format toggle in trade evaluator

### Fixed
- Trade values now account for league scoring settings

### Changed
- Player search now matches partial names
```

---

*These guidelines apply to all AI-assisted contributions: commits, PRs, issues, docs, and code comments.*
