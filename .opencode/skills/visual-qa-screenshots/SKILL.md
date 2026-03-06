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
- **Public capture agent** — 1 agent captures ALL discovered public routes using `agent-browser`
- **Protected capture agent** — 1 agent captures ALL discovered protected routes using `agent-browser` with loaded auth state
- **Analysis agents** — one per route, each analyzes 3 screenshots (one per viewport) using `look_at`
- **You (orchestrator)** — run setup pipeline, verification between phases, final report synthesis

Total agents spawned: 2 capture + 1 per discovered route for analysis (count varies with routes discovered).
Max concurrent: configurable batch size (default 4, set in `tools/visual-qa/config.ts`).

Auth is handled automatically by the setup pipeline (`pnpm visual-qa`) before capture begins — fully automated via the dev-login API, no manual login needed.

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

Helper scripts in `tools/visual-qa/` make the pipeline fully dynamic — routes are discovered from the filesystem, prompts are generated with proper context, auth is automated, and previous-run comparison is built in. The skill never needs manual updates when routes are added or removed.

</Why_This_Exists>

<Pipeline_Scripts>

## Helper Scripts (`tools/visual-qa/`)

The orchestration is driven by scripts that run before capture begins. These scripts discover routes, set up directories, authenticate, and generate all prompts dynamically.

| Script | Purpose | Invocation |
|--------|---------|------------|
| `cli.ts` | Chains the full pipeline (discover → setup → auth → prompts → scaffold) | `pnpm visual-qa` |
| `discover-routes.ts` | Scans `src/app/**/page.tsx`, classifies routes as public/protected | Auto-run by CLI |
| `setup.ts` | Archives previous screenshots to `.previous/`, creates dirs, health check | Auto-run by CLI |
| `authenticate.ts` | Automated auth via dev-login API + agent-browser state save | Auto-run by CLI |
| `generate-prompts.ts` | Creates hydrated prompt files + `batch-manifest.json` | Auto-run by CLI |
| `scaffold-report.ts` | Generates `CHANGES-NEEDED.md` skeleton with TBD placeholders | Auto-run by CLI |
| `verify-captures.ts` | Validates all screenshots exist and are fresh (mtime > run start) | Run manually between phases |
| `config.ts` | Static config: viewports, batch size, categories, directory paths | Imported by other scripts |

### Generated Files (in `tools/visual-qa/generated-prompts/`)

After running `pnpm visual-qa`, these files are created:

| File | Purpose |
|------|---------|
| `public-capture-prompt.txt` | Full prompt for the public route capture agent |
| `protected-capture-prompt.txt` | Full prompt for the protected route capture agent |
| `{route-dir}-analysis-prompt.txt` | Analysis prompt per route (includes previous-run comparison when `.previous/` exists) |
| `batch-manifest.json` | Scheduling manifest: batch groups, prompt file names, recommended category |

Each prompt file starts with a metadata header the orchestrator can parse:
```
# Category: deep | Skills: agent-browser | Background: false
```

The `batch-manifest.json` structure:
```json
{
  "batchSize": 4,
  "batches": [
    { "batch": 1, "routes": ["..."], "prompts": ["...-analysis-prompt.txt", ...] },
    ...
  ],
  "capturePrompts": { "public": "public-capture-prompt.txt", "protected": "protected-capture-prompt.txt" },
  "recommendedCategory": "multi-modal"
}
```

</Pipeline_Scripts>

<Reference_Data>

## Route Discovery

Routes and viewports are discovered dynamically by the pipeline scripts. The orchestrator does NOT hardcode any routes.

- **Route discovery**: `discover-routes.ts` scans `src/app/**/page.tsx` and classifies routes by their route group (`(dashboard)` = protected, everything else = public).
- **Viewports**: Static config in `config.ts` — mobile (390×844), tablet (768×1024), desktop (1440×900).
- **Protection mapping**: Configurable in `config.ts` via `PROTECTED_ROUTE_GROUPS`.

## Output Directory Structure

The setup script auto-creates this structure for all discovered routes:

```
screenshots/
  {route-dir-name}/              (one per discovered route)
    mobile.png
    tablet.png
    desktop.png
  .previous/                     (archived previous run, if any)
    {route-dir-name}/mobile.png  (etc.)
    CHANGES-NEEDED.md
  .run-metadata.json             (pipeline metadata: startedAt, manifest)
  CHANGES-NEEDED.md              (report skeleton → filled by orchestrator)
```

</Reference_Data>

<Execution_Policy>

## Execution Model

Capture agents run **one at a time, foreground** (not parallelized). This avoids browser resource contention and state-sharing issues observed with parallel capture agents.

- **Phase 0**: Orchestrator runs `pnpm visual-qa` — discovers routes, sets up dirs, authenticates, generates all prompts, scaffolds report.
- **Phase 1**: 1 public capture agent (foreground). Captures ALL discovered public routes sequentially.
- **Phase 2**: 1 protected capture agent (foreground). Captures ALL discovered protected routes sequentially using loaded auth state.
- **Phase 3**: Analysis agents (background) scheduled in batches per `batch-manifest.json`. They only read screenshot files with `look_at`.

## Agent Categories and Skills

| Agent Type | `category` | `load_skills` | `run_in_background` | Count |
|-----------|-----------|--------------|---------------------|-------|
| Public route capture | `"deep"` | `["agent-browser"]` | `false` | 1 |
| Protected route capture | `"deep"` | `["agent-browser"]` | `false` | 1 |
| Route analysis | from `batch-manifest.json` `recommendedCategory` | `[]` | `true` | 1 per route, batched |

## Concurrency Limits

- Capture phases: 1 agent at a time (sequential).
- Analysis phase: Batched background agents (default batch size 4, configurable in `tools/visual-qa/config.ts`).

</Execution_Policy>

<Steps>

## Phase 0: Setup Pipeline (orchestrator — you do this directly)

1. Determine the base URL. Default: `http://localhost:3000`. Use whatever the user provides.
2. Run the full setup pipeline:

```bash
pnpm visual-qa --base-url <BASE_URL>
```

This single command chains all preparation steps:
- **Discover routes** — scans `src/app/**/page.tsx`, classifies public vs protected
- **Setup directories** — archives previous screenshots to `.previous/`, creates fresh dirs, writes `.run-metadata.json`
- **Health check** — verifies the dev server is responding
- **Authenticate** — calls dev-login API, opens agent-browser to callback URL, saves auth state to `.visual-qa-auth.json`
- **Generate prompts** — creates hydrated capture + analysis prompt files and `batch-manifest.json`
- **Scaffold report** — creates `screenshots/CHANGES-NEEDED.md` skeleton

If the pipeline fails (app not running, auth failure, etc.), it exits non-zero with an error message. Inform the user and **stop**. Do NOT proceed.

3. Verify the pipeline output exists:

```bash
ls tools/visual-qa/generated-prompts/batch-manifest.json
ls .visual-qa-auth.json
```

## Phase 1: Capture Public Routes (1 agent, foreground)

Read the generated prompt file:

```bash
cat tools/visual-qa/generated-prompts/public-capture-prompt.txt
```

Use the file content (after the metadata header line) as the prompt for the capture agent. The metadata header tells you the category and skills:

```
# Category: deep | Skills: agent-browser | Background: false
```

Spawn the agent:

```
task(category="deep", load_skills=["agent-browser"], run_in_background=false,
     description="Capture screenshots: all public routes",
     prompt=<content of public-capture-prompt.txt>)
```

This blocks until the agent completes. **Do NOT spawn any other agents during this phase.**

## Verify: Public Captures

After the agent returns, check its output for success/failure per route. Optionally run:

```bash
bun tools/visual-qa/verify-captures.ts
```

It reports fresh/stale/missing counts with exit code `0` (all fresh) or `1` (issues).
If screenshots are missing or stale, note it for the report but continue.

## Phase 2: Capture Protected Routes (1 agent, foreground)

Read the generated prompt file:

```bash
cat tools/visual-qa/generated-prompts/protected-capture-prompt.txt
```

Spawn the agent using the same metadata-header pattern:

```
task(category="deep", load_skills=["agent-browser"], run_in_background=false,
     description="Capture screenshots: all protected routes",
     prompt=<content of protected-capture-prompt.txt>)
```

This blocks until the agent completes.

## Verify: All Captures

After the agent returns, run the verification script to check ALL screenshots (public + protected):

```bash
bun tools/visual-qa/verify-captures.ts
```

If the agent reported AUTH_INVALID on any route, note it for the report. If ALL routes show AUTH_INVALID, the auth state was expired — note prominently in report.

## Phase 3: Analyze Screenshots (batched, parallel background)

Read the batch manifest for analysis agent scheduling:

```bash
cat tools/visual-qa/generated-prompts/batch-manifest.json
```

Spawn analysis agents in BATCHES (not all at once) using the batch manifest:
- Read `batchSize` and `batches` from `batch-manifest.json`
- For each batch: read each prompt file listed in `batch.prompts`, spawn as a background task
- Wait for ALL agents in the current batch to complete before starting the next batch
- Use the `recommendedCategory` from the manifest (e.g., `"multi-modal"`)
- Each analysis agent gets `load_skills=[]` — they use `look_at`, not `agent-browser`

This prevents API overload from too many simultaneous agents.

## Wait Gate: All Analyses Complete

Wait for ALL analysis agents to complete across all batches. Collect each agent's output — it will contain structured findings per viewport.

## Phase 4: Report Synthesis (orchestrator — you do this directly)

The report skeleton already exists at `screenshots/CHANGES-NEEDED.md` (generated by the pipeline in Phase 0).

1. **Read** the skeleton — it has TBD placeholders and the correct structure (New/Resolved/Persistent sections when `.previous/` exists, or Detailed Findings on first run).
2. **Fill in** findings from all analysis agent outputs, organized by route.
3. **Count** issues by severity (CRITICAL/WARNING/INFO) across all routes and viewports.
4. **Update** the summary table with actual counts per route per viewport.
5. **Write** the final report to `screenshots/CHANGES-NEEDED.md`.
6. **Report** to the user: summary of findings, link to the report file.

No browser cleanup needed — each capture agent closes its own browser.

</Steps>

<Tool_Usage>

## Delegation Prompt Templates

Prompts are generated dynamically by the pipeline scripts. Do NOT use hardcoded templates.

### Public Capture Agent Prompt

Read from: `tools/visual-qa/generated-prompts/public-capture-prompt.txt`

### Protected Capture Agent Prompt

Read from: `tools/visual-qa/generated-prompts/protected-capture-prompt.txt`

### Analysis Agent Prompts

One per route. Read from: `tools/visual-qa/generated-prompts/{dirName}-analysis-prompt.txt`
See `tools/visual-qa/generated-prompts/batch-manifest.json` for batch scheduling and prompt file names.

### Metadata Header Convention

Every generated prompt file starts with a metadata line:
```
# Category: <category> | Skills: <skills> | Background: <true|false>
```

Parse this to configure `task()` calls. For analysis prompts, an additional `Batch: N of M` field is included.

</Tool_Usage>

<Report_Format>

After collecting all analysis agent outputs, fill in the report skeleton at `screenshots/CHANGES-NEEDED.md`.

The skeleton is generated by `scaffold-report.ts` and adapts to the discovered routes:
- **First run** (no `.previous/` directory): Single "Detailed Findings" section with per-route subsections.
- **Subsequent runs** (`.previous/` exists): Three sections — "New Issues", "Resolved Issues", "Persistent Issues" — each with per-route subsections.

The orchestrator fills in:
1. **Summary counts** — replace `_TBD_` placeholders with actual CRITICAL/WARNING/INFO counts
2. **Issues by Page table** — replace `_TBD_` cells with per-route per-viewport issue counts
3. **Route findings** — replace `_Pending analysis..._` placeholders with analysis agent output
4. **Notes section** — fill in auth state, missing captures, agent errors

The final report structure matches the scaffold exactly. Do NOT restructure the skeleton — just fill in the placeholders.

</Report_Format>

<Examples>

<Good>

**Correct invocation:**
```
task(category="deep", load_skills=["visual-qa-screenshots"], prompt="Run visual QA for all pages. Base URL: http://localhost:3000")
```

**Correct orchestration flow:**
```python
# Phase 0: Run full setup pipeline (discover, setup, auth, prompts, scaffold)
bash("pnpm visual-qa --base-url http://localhost:3000")
# Verify pipeline output
bash("ls tools/visual-qa/generated-prompts/batch-manifest.json .visual-qa-auth.json")

# Phase 1: ONE agent captures ALL public routes (foreground — blocks until done)
public_prompt = read("tools/visual-qa/generated-prompts/public-capture-prompt.txt")
public_result = task(category="deep", load_skills=["agent-browser"], run_in_background=false,
    prompt=public_prompt)

# Verify: script checks fresh/stale/missing captures
bash("bun tools/visual-qa/verify-captures.ts")

# Phase 2: ONE agent captures ALL protected routes (foreground — blocks until done)
# Auth was already handled by the pipeline in Phase 0 — no separate auth step needed
protected_prompt = read("tools/visual-qa/generated-prompts/protected-capture-prompt.txt")
protected_result = task(category="deep", load_skills=["agent-browser"], run_in_background=false,
    prompt=protected_prompt)

# Verify all captures (public + protected)
bash("bun tools/visual-qa/verify-captures.ts")

# Phase 3: Analysis — batched background agents (from manifest)
manifest = json.parse(read("tools/visual-qa/generated-prompts/batch-manifest.json"))
for batch in manifest["batches"]:
    batch_tasks = []
    for prompt_file in batch["prompts"]:
        prompt = read(f"tools/visual-qa/generated-prompts/{prompt_file}")
        batch_tasks.append(task(
            category=manifest["recommendedCategory"],
            load_skills=[],
            run_in_background=true,
            prompt=prompt,
        ))
    collect(batch_tasks)  # wait for this batch before starting next

# Phase 4: Fill in the report skeleton with analysis agent findings
skeleton = read("screenshots/CHANGES-NEEDED.md")
write("screenshots/CHANGES-NEEDED.md", fill_in_findings(skeleton, all_analysis_outputs))
```

Why good: The entire setup pipeline runs as a single command — route discovery, directory management, auth, prompt generation, and report scaffolding are all handled automatically. Capture remains sequential for browser stability. Analysis runs in controlled batches to prevent API overload while preserving parallel speedups. No hardcoded routes or prompts.

</Good>

<Bad>

**Spawning multiple capture agents in parallel:**
```python
# DON'T DO THIS — parallel browser agents cause resource contention and state issues
task(run_in_background=true, prompt="capture /home")
task(run_in_background=true, prompt="capture /login")
task(run_in_background=true, prompt="capture /draft-sandbox")
```
Why bad: Multiple agent-browser instances competing for resources causes oddities. Use 1 agent per phase.

**Running authenticate.ts separately when the CLI already ran it:**
```python
bash("pnpm visual-qa")         # Pipeline already authenticated
bash("bun tools/visual-qa/authenticate.ts")  # Redundant — wastes time, may conflict
```
Why bad: The CLI pipeline chains authenticate.ts automatically. Running it again is redundant and could interfere with the saved auth state.

**Spawning protected capture without running the pipeline first:**
```python
# Skipping Phase 0 entirely!
protected_prompt = read("tools/visual-qa/generated-prompts/protected-capture-prompt.txt")
task(category="deep", load_skills=["agent-browser"], prompt=protected_prompt)
```
Why bad: Without `pnpm visual-qa`, there's no auth state, no directories, and the prompt files may be stale or missing.

**Loading agent-browser on analysis agents:**
```python
task(category="multi-modal", load_skills=["agent-browser"], prompt="analyze...")
```
Why bad: Analysis agents use `look_at`, not `agent-browser`. Loading unnecessary skills wastes context.

**Spawning analysis before captures complete:**
```python
task(run_in_background=false, prompt="capture protected routes")
task(run_in_background=true, prompt="analyze route X")  # capture still running!
```
Why bad: Analysis agents will fail because screenshot files haven't been written yet.

**Using hardcoded routes or prompts instead of generated files:**
```python
task(prompt="Screenshot /dashboard at 390x844, 768x1024, 1440x900...")
```
Why bad: Routes and viewports are discovered dynamically. Hardcoded prompts will drift when routes are added/removed. Always read from `tools/visual-qa/generated-prompts/`.

</Bad>

</Examples>

<Escalation_And_Stop_Conditions>

## Stop and inform user:
- Pipeline fails in Phase 0 (`pnpm visual-qa` exits non-zero) — could be app not running, auth failure, or missing env vars
- Auth failure specifically: check that `ADMIN_EMAIL` is set in `.env.local` and the dev-login API endpoint exists
- Both capture agents fail completely (zero screenshots captured)

## Continue despite errors:
- Public capture agent fails on one route but succeeds on others — note in report, analyze what was captured
- Protected capture agent reports AUTH_INVALID on some routes but not all — note in report
- A single analysis agent fails — note in report, include findings from other agents
- Some screenshots missing — report partial results, clearly note gaps
- verify-captures.ts reports stale files — note in report, stale screenshots may be from a previous run

## Never do:
- Fix visual issues — this skill is detection only
- Skip routes — every discovered route must be attempted
- Leave browsers open — every agent must close its browser
- Write the report before all analyses complete — wait for all agents
- Spawn the protected capture agent before the pipeline has authenticated
- Hardcode routes or prompts — always read from generated files
- Delegate auth to a child agent — the pipeline handles auth via orchestrator-run scripts

</Escalation_And_Stop_Conditions>

<Final_Checklist>

Before reporting completion, verify ALL of these:

- [ ] Pipeline (`pnpm visual-qa`) completed successfully in Phase 0
- [ ] `batch-manifest.json` and `.visual-qa-auth.json` exist
- [ ] Public capture agent completed and screenshots verified via `verify-captures.ts`
- [ ] Protected capture agent completed and screenshots verified via `verify-captures.ts`
- [ ] Protected capture agent output checked for AUTH_INVALID indicators
- [ ] All analysis agent outputs collected (one per discovered route, across all batches)
- [ ] `screenshots/CHANGES-NEEDED.md` filled in with complete findings (no `_TBD_` or `_Pending analysis..._` placeholders remaining)
- [ ] Report includes accurate issue counts (CRITICAL/WARNING/INFO)
- [ ] Report notes auth state status and any routes where auth failed
- [ ] No browser sessions left open (capture agents closed their browsers)
- [ ] User informed of summary findings

</Final_Checklist>
