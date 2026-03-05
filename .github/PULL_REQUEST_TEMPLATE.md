<!--
  Before opening this PR, confirm:
  - Title follows convention: type(scope): description
  - You've self-reviewed the diff
  - `pnpm validate` passes
  - Target ≤400 LOC (justify if larger)
-->

## Why

<!--
  What problem does this solve? What's the motivation?
  Link to the issue. This is the most important section —
  reviewers evaluate your APPROACH, not just your code.
-->

Closes #

## What

<!--
  Summarize the changes. Bullet list.
  Give reviewers a map of the diff before they open it.
-->

-
-

## How to Test

<!--
  Exact steps to verify this works. Be specific enough that
  a reviewer can reproduce without asking questions.
-->

1.
2.
3.

## Screenshots

<!--
  Required for UI changes. Before/after preferred.
  Omit this section entirely if no visual changes.
-->

## Notes for Reviewer

<!--
  Optional. Call out:
  - Areas of uncertainty where you want focused feedback
  - Tradeoffs you made and why
  - Things you explicitly decided NOT to do
  - Known limitations or follow-up work planned
-->

## Checklist

- [ ] `pnpm validate` passes (type-check + lint + tests)
- [ ] Tests added/updated for new behavior
- [ ] No `any`, `@ts-ignore`, or `console.log` left in
- [ ] Mobile tested (if UI change)
- [ ] Docs updated (if public API changed)
- [ ] Breaking changes noted in PR title with `!` and described above
