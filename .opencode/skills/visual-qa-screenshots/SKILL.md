---
name: visual-qa-screenshots
description: "Orchestrates visual QA across all app routes. Spawns sequential capture agents (1 public, 1 protected) and parallel analysis agents (1 per route), then synthesizes a CHANGES-NEEDED.md report. Triggers: 'visual qa', 'screenshot all pages', 'visual audit', 'responsive screenshots', 'check all pages', 'visual regression'."
license: MIT
compatibility: opencode
metadata:
  category: qa
---

# Visual QA Screenshots — Orchestration Skill

You are the **orchestrator**. You do NOT capture screenshots or analyze them yourself. You delegate to specialized child agents via `task()` and synthesize their outputs into a final report.

<Purpose>

Systematically screenshot every page in the application at three viewport sizes (mobile, tablet, desktop), analyze each screenshot for visual QA issues, and produce a structured CHANGES-NEEDED.md report.

This skill coordinates work across child agents and direct orchestrator actions:
- **Public capture agent** — 1 agent captures ALL public routes (3 routes × 3 viewports) using `agent-browser`
- **Protected capture agent** — 1 agent captures ALL protected routes (7 routes × 3 viewports) using `agent-browser` with loaded auth state
- **Analysis agents** — one per route, each analyzes 3 screenshots using `look_at`
- **You (orchestrator)** — setup, auth handling, verification between phases, final report

Total agents spawned: 12 (1 public capture + 1 protected capture + 10 analysis).
Max concurrent: 4 (during analysis batches by default).

Auth is handled by the orchestrator directly between capture phases. The orchestrator ensures `.visual-qa-auth.json` exists and is valid before spawning the protected capture agent.

</Purpose>

<Use_When>

- User says "visual qa", "screenshot all pages", "visual audit", "responsive screenshots", "check all pages", "visual regression"
- User wants to audit the visual state of the entire application
- User wants to check for responsive design issues across viewports
- Before a release, to catch visual regressions

</Use_When>

<Do_Not_Use_When>

- User wants to screenshot a single specific page (just use agent-browser directly)
- User wants functional/E2E testing (use Playwright)
- User wants to fix visual issues (this skill detects only, does not fix)
- User wants accessibility auditing beyond visual signals (use dedicated a11y tools)

</Do_Not_Use_When>

<Why_This_Exists>

The fully sequential monolithic approach (one agent, all routes, then analyze) takes 15-20 minutes. This skill uses sequential capture (1 agent per phase for reliability) with batched parallel analysis. Capture agents handle multiple routes in a single browser session to avoid resource contention observed with parallel browser instances. Analysis agents parallelize safely since they only read screenshot files.

</Why_This_Exists>

<Reference_Data>

## Route Inventory & Viewports

Routes and viewports are discovered dynamically. Run:

```bash
bun tools/visual-qa/discover-routes.ts
```

This outputs a JSON manifest with all routes classified as public/protected,
viewport configs, and analysis batching settings.

See `tools/visual-qa/config.ts` for static defaults (viewports, batch size, protected route groups).

## Output Directory Structure

The setup script auto-creates this structure for discovered routes.

```
screenshots/
  home/{mobile,tablet,desktop}.png
  login/{mobile,tablet,desktop}.png
  draft-sandbox/{mobile,tablet,desktop}.png
  dashboard/{mobile,tablet,desktop}.png
  connect/{mobile,tablet,desktop}.png
  draft/{mobile,tablet,desktop}.png
  roster/{mobile,tablet,desktop}.png
  trade/{mobile,tablet,desktop}.png
  waivers/{mobile,tablet,desktop}.png
  feedback/{mobile,tablet,desktop}.png
  CHANGES-NEEDED.md
```

</Reference_Data>

<Execution_Policy>

## Execution Model

Capture agents run **one at a time, foreground** (not parallelized). This avoids browser resource contention and state-sharing issues observed with parallel capture agents.

- **Phase 1**: 1 public capture agent (foreground, `run_in_background=false`). Captures ALL 3 public routes sequentially.
- **Orchestrator Auth**: After Phase 1 completes, the orchestrator (you) handles auth directly — verifies/creates `.visual-qa-auth.json`.
- **Phase 2**: 1 protected capture agent (foreground, `run_in_background=false`). Captures ALL 7 protected routes sequentially using loaded auth state.
- **Phase 3**: 10 analysis agents total (background, `run_in_background=true`) scheduled in batches. They only read screenshot files with `look_at`.

## Agent Categories and Skills

| Agent Type | `category` | `load_skills` | `run_in_background` | Count |
|-----------|-----------|--------------|---------------------|-------|
| Public route capture | `"deep"` | `["agent-browser"]` | `false` | 1 |
| Protected route capture | `"deep"` | `["agent-browser"]` | `false` | 1 |
| Route analysis | `"multi-modal"` | `[]` | `true` | 10 (batched) |

## Concurrency Limits

- Capture phases: 1 agent at a time (sequential).
- Analysis phase: Batched background agents (default batch size 4, configurable in `tools/visual-qa/config.ts`).

</Execution_Policy>

<Steps>

## Phase 0: Setup (orchestrator — you do this directly)

1. Determine the base URL. Default: `http://localhost:3000`. Use whatever the user provides.
2. Run the setup script:

```bash
bun tools/visual-qa/setup.ts
```

This archives previous screenshots to `.previous/`, creates fresh directories
for all discovered routes, writes `.run-metadata.json`, generates prompts via
`tools/visual-qa/generate-prompts.ts`, and verifies the app is running.

If setup reports the app is not ready, inform the user and **stop**. Do NOT proceed with a broken app.

## Phase 1: Capture Public Routes (1 agent, foreground)

Read the generated prompt file:

```bash
cat tools/visual-qa/generated-prompts/public-capture-prompt.txt
```

Use this as the prompt for the capture agent.

```
task(category="deep", load_skills=["agent-browser"], run_in_background=false,
     description="Capture screenshots: all public routes",
     prompt="<PUBLIC_CAPTURE_PROMPT filled with BASE_URL>")
```

This blocks until the agent completes. **Do NOT spawn any other agents during this phase.**

## Verify: Public Captures

After the agent returns, run the verify script:

```bash
bun tools/visual-qa/verify-captures.ts
```

It reports fresh/stale/missing counts with exit code `0` (all fresh) or `1` (issues).
If screenshots are missing or stale, note it for the report but continue.

## Phase 1.5: Auth Setup (orchestrator — you do this directly)

Run the authenticate script:

```bash
bun tools/visual-qa/authenticate.ts
```

This calls the dev-login API, opens `agent-browser` to the callback URL,
saves auth state to `.visual-qa-auth.json`, and closes the browser.
No manual login required. No browser profile management needed.

## Phase 2: Capture Protected Routes (1 agent, foreground)

Read the generated prompt file:

```bash
cat tools/visual-qa/generated-prompts/protected-capture-prompt.txt
```

Use this as the prompt for the capture agent.

```
task(category="deep", load_skills=["agent-browser"], run_in_background=false,
     description="Capture screenshots: all protected routes",
     prompt="<PROTECTED_CAPTURE_PROMPT filled with BASE_URL>")
```

This blocks until the agent completes.

## Verify: Protected Captures

After the agent returns, run the verify script:

```bash
bun tools/visual-qa/verify-captures.ts
```

It reports fresh/stale/missing counts with exit code `0` (all fresh) or `1` (issues).
If the agent reported AUTH_INVALID on any route, note it for the report. If ALL routes show AUTH_INVALID, the auth state was expired — note prominently in report.

## Phase 3: Analyze Screenshots (10 agents, parallel background)

Read the batch manifest for analysis agent scheduling:

```bash
cat tools/visual-qa/generated-prompts/batch-manifest.json
```

Spawn analysis agents in BATCHES (not all at once) using the batch manifest:
- Read `batchSize` and `batches` from `batch-manifest.json`
- For each batch: spawn all agents in that batch as background tasks
- Wait for ALL agents in the current batch to complete before starting the next batch
- Each analysis agent uses `category="multi-modal"` (from manifest's `recommendedCategory`)
- Read each agent's prompt from the corresponding `.txt` file

This prevents API overload from 10 simultaneous agents.

## Wait Gate: All Analyses Complete

Wait for ALL analysis agents to complete across all batches. Collect each agent's output — it will contain structured findings per viewport.

## Phase 4: Report + Cleanup (orchestrator — you do this directly)

1. **Synthesize** all analysis outputs into `screenshots/CHANGES-NEEDED.md` using the Report Format below.
2. **Count** issues by severity (CRITICAL/WARNING/INFO) across all routes and viewports.
3. **Write** the report file.
4. **Report** to the user: summary of findings, link to the report file.

The report skeleton is pre-generated by the setup pipeline:

```bash
bun tools/visual-qa/scaffold-report.ts
```

Fill in the skeleton with analysis agent outputs. The skeleton includes
New Issues / Resolved Issues / Persistent Issues sections when a previous
run exists, or a single Detailed Findings section on first run.

No browser cleanup needed — each capture agent closes its own browser.

</Steps>

<Tool_Usage>

## Delegation Prompt Templates

Prompts are generated dynamically by the helper scripts. Do NOT use hardcoded templates.

### Public Capture Agent Prompt

Read from: `tools/visual-qa/generated-prompts/public-capture-prompt.txt`

### Protected Capture Agent Prompt

Read from: `tools/visual-qa/generated-prompts/protected-capture-prompt.txt`

### Analysis Agent Prompts

One per route. Read from: `tools/visual-qa/generated-prompts/{dirName}-analysis-prompt.txt`
See `tools/visual-qa/generated-prompts/batch-manifest.json` for scheduling.

</Tool_Usage>

<Report_Format>

After collecting all 10 analysis agent outputs, synthesize them into `screenshots/CHANGES-NEEDED.md` with this exact structure:

```markdown
# Visual QA Report

**Generated:** <current date and time>
**Base URL:** <the URL that was screenshotted>
**Viewports:** Mobile (390x844), Tablet (768x1024), Desktop (1440x900)

## Summary

- **Pages screenshotted:** <count>/10
- **Total issues found:** <count>
- **Critical:** <count>
- **Warning:** <count>
- **Info:** <count>

### Issues by Page

| Page | Mobile | Tablet | Desktop | Total |
|------|--------|--------|---------|-------|
| Home | <count> | <count> | <count> | <count> |
| Login | <count> | <count> | <count> | <count> |
| Draft Sandbox | <count> | <count> | <count> | <count> |
| Dashboard | <count> | <count> | <count> | <count> |
| Connect | <count> | <count> | <count> | <count> |
| Draft | <count> | <count> | <count> | <count> |
| Roster | <count> | <count> | <count> | <count> |
| Trade | <count> | <count> | <count> | <count> |
| Waivers | <count> | <count> | <count> | <count> |
| Feedback | <count> | <count> | <count> | <count> |

---

## Detailed Findings

<paste each analysis agent's output here, in route order>

---

## Notes

- <auth state: whether .visual-qa-auth.json was valid, any routes where auth failed>
- <any routes that failed to load>
- <any capture agents that errored>
- <any screenshots that are missing>
```

</Report_Format>

<Examples>

<Good>

**Correct invocation:**
```
task(category="deep", load_skills=["visual-qa-screenshots"], prompt="Run visual QA for all pages. Base URL: http://localhost:3000")
```

**Correct orchestration flow:**
```python
# Phase 0: Setup
bash("bun tools/visual-qa/setup.ts")

# Phase 1: ONE agent captures ALL public routes (foreground — blocks until done)
public_prompt = read("tools/visual-qa/generated-prompts/public-capture-prompt.txt")
public_result = task(category="deep", load_skills=["agent-browser"], run_in_background=false,
    prompt=public_prompt)

# Verify: script checks fresh/stale/missing captures
bash("bun tools/visual-qa/verify-captures.ts")

# Phase 1.5: Orchestrator handles auth directly
bash("bun tools/visual-qa/authenticate.ts")

# Phase 2: ONE agent captures ALL protected routes (foreground — blocks until done)
protected_prompt = read("tools/visual-qa/generated-prompts/protected-capture-prompt.txt")
protected_result = task(category="deep", load_skills=["agent-browser"], run_in_background=false,
    prompt=protected_prompt)

# Verify again after protected captures
bash("bun tools/visual-qa/verify-captures.ts")

# Phase 3: Analysis — batched background agents (from manifest)
manifest = json.parse(read("tools/visual-qa/generated-prompts/batch-manifest.json"))
for batch in manifest["batches"]:
    batch_tasks = []
    for item in batch["routes"]:
        prompt = read(f"tools/visual-qa/generated-prompts/{item['dirName']}-analysis-prompt.txt")
        batch_tasks.append(task(
            category=manifest["recommendedCategory"],
            load_skills=[],
            run_in_background=true,
            prompt=prompt,
        ))
    collect(batch_tasks)  # wait for this batch before next

# Optional: regenerate skeleton if needed
bash("bun tools/visual-qa/scaffold-report.ts")

# Phase 4: Synthesize report
write("screenshots/CHANGES-NEEDED.md", synthesize_all_batches())
```

Why good: Setup/auth/verification are script-driven and consistent, capture remains sequential for browser stability, and analysis runs in controlled batches to prevent API overload while preserving parallel speedups.

</Good>

<Bad>

**Spawning multiple capture agents in parallel:**
```python
# DON'T DO THIS — parallel browser agents cause resource contention and state issues
task(run_in_background=true, prompt="capture /")
task(run_in_background=true, prompt="capture /login")
task(run_in_background=true, prompt="capture /draft-sandbox")
```
Why bad: Multiple agent-browser instances competing for resources causes oddities. Use 1 agent per phase.

**Delegating auth to a child agent:**
```python
task(category="deep", load_skills=["agent-browser"], prompt="authenticate and save state...")
```
Why bad: Auth file has been observed to disappear. The orchestrator must handle auth directly to maintain control over the file lifecycle.

**Spawning protected capture before orchestrator confirms auth:**
```python
public_result = task(...)  # public captures done
# Skipping auth verification!
protected_result = task(..., prompt="capture protected routes")  # auth file might not exist!
```
Why bad: Auth file may be missing or expired. Orchestrator MUST verify/create it between phases.

**Loading agent-browser on analysis agents:**
```python
task(category="multi-modal", load_skills=["agent-browser"], prompt="analyze...")
```
Why bad: Analysis agents use `look_at`, not `agent-browser`. Loading unnecessary skills wastes context.

**Spawning analysis before captures complete:**
```python
task(run_in_background=false, prompt="capture protected routes")
task(run_in_background=true, prompt="analyze /dashboard")  # capture still running!
```
Why bad: Analysis agents will fail because screenshot files haven't been written yet.

</Bad>

</Examples>

<Escalation_And_Stop_Conditions>

## Stop and inform user:
- App is not running (Phase 0 setup script readiness check fails)
- Auth setup fails in Phase 1.5 — `.visual-qa-auth.json` cannot be created or is expired. Provide manual re-login instructions.
- Protected capture agent reports AUTH_INVALID on the first route (dashboard) — auth state is expired, all routes will fail

## Continue despite errors:
- Public capture agent fails on one route but succeeds on others — note in report, analyze what was captured
- Protected capture agent reports AUTH_INVALID on some routes but not all — note in report
- A single analysis agent fails — note in report, include findings from other agents
- Some screenshots missing — report partial results, clearly note gaps

## Never do:
- Fix visual issues — this skill is detection only
- Skip routes — every route must be attempted
- Leave browsers open — every agent must close its browser
- Write the report before all analyses complete — wait for all agents
- Spawn the protected capture agent before auth is verified
- Delegate auth to a child agent — the orchestrator handles auth directly

</Escalation_And_Stop_Conditions>

<Final_Checklist>

Before reporting completion, verify ALL of these:

- [ ] Public capture agent completed and all 9 public screenshots verified (3 routes × 3 viewports)
- [ ] Orchestrator created/verified `.visual-qa-auth.json` in Phase 1.5
- [ ] Protected capture agent completed and all 21 protected screenshots verified (7 routes × 3 viewports) — or gaps documented
- [ ] Protected capture agent output checked for AUTH_INVALID indicators
- [ ] All 10 analysis agent outputs collected
- [ ] `screenshots/CHANGES-NEEDED.md` written with complete report
- [ ] Report includes accurate issue counts (CRITICAL/WARNING/INFO)
- [ ] Report notes auth state status and any routes where auth failed
- [ ] No browser sessions left open (capture agents closed their browsers, orchestrator closed after auth)
- [ ] User informed of summary findings

</Final_Checklist>
