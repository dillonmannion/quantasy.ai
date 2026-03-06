---
name: visual-qa-screenshots
description: "Orchestrates visual QA across all app routes. Runs Playwright capture script and parallel analysis agents (1 per route), then synthesizes a CHANGES-NEEDED.md report. Triggers: 'visual qa', 'screenshot all pages', 'visual audit', 'responsive screenshots', 'check all pages', 'visual regression'."
license: MIT
compatibility: opencode
metadata:
  category: qa
---

# Visual QA Screenshots — Orchestration Skill

You are the **orchestrator**. You do NOT capture screenshots or analyze them yourself. You run the capture script directly via bash, then delegate analysis to specialized child agents via `task()`, and synthesize their outputs into a final report.

<Purpose>

Systematically screenshot every page in the application at three viewport sizes (mobile, tablet, desktop), analyze each screenshot for visual QA issues, and produce a structured CHANGES-NEEDED.md report.

This skill coordinates work across direct orchestrator actions and child agents:
- **You (orchestrator)** — run the Playwright capture script, verify output, read the batch manifest, spawn analysis agents, synthesize the final report
- **Analysis agents** — one per route, each analyzes 3 screenshots (one per viewport) using `look_at`. Spawned via `subagent_type="multimodal-looker"`.

Total agents spawned: 1 per discovered route for analysis (count varies with routes discovered). No capture agents — capture is done by the Playwright script you run directly.

Max concurrent analysis agents: configurable batch size (default 4, set in `tools/visual-qa/config.ts`).

The CLI defaults to `--serve preview` — it builds the app and starts a preview server automatically. No dev server needs to be running. Auth is handled automatically by the capture script via the dev-login API and a Playwright browser context. No manual login, no agent-browser needed for capture.

</Purpose>

<Use_When>

- User says "visual qa", "screenshot all pages", "visual audit", "responsive screenshots", "check all pages", "visual regression"
- User wants to audit the visual state of the entire application
- User wants to check for responsive design issues across viewports
- Before a release, to catch visual regressions

</Use_When>

<Do_Not_Use_When>

- User wants to screenshot a single specific page (use `pnpm visual-qa --route /path` for quick single-route QA)
- User wants functional/E2E testing (use Playwright directly)
- User wants to fix visual issues (this skill detects only, does not fix)
- User wants accessibility auditing beyond visual signals (use dedicated a11y tools)

</Do_Not_Use_When>

<Why_This_Exists>

The fully sequential monolithic approach (one agent, all routes, then analyze) takes 15-20 minutes. This skill uses a fast Playwright script for capture (no agent overhead, no browser resource contention) with batched parallel analysis agents. The capture script handles multiple routes in a single browser session, which is faster and more reliable than spawning separate agents per route. Analysis agents parallelize safely since they only read screenshot files.

Helper scripts in `tools/visual-qa/` make the pipeline fully dynamic — routes are discovered from the filesystem, prompts are generated with proper context, auth is automated, and previous-run comparison is built in. The skill never needs manual updates when routes are added or removed.

</Why_This_Exists>

<Pipeline_Scripts>

## Helper Scripts (`tools/visual-qa/`)

The orchestration is driven by scripts that run before analysis begins. These scripts discover routes, set up directories, authenticate, capture screenshots, and generate all prompts dynamically.

| Script | Purpose | Invocation |
|--------|---------|------------|
| `cli.ts` | Chains build → serve → capture → prompt generation (full pipeline). Defaults to `--serve preview` — builds and starts a preview server automatically. | `pnpm visual-qa` |
| `capture-screenshots.ts` | Playwright-based capture of all routes at all viewports | Auto-run by CLI, or `pnpm visual-qa:capture` |
| `discover-routes.ts` | Scans `src/app/**/page.tsx`, classifies routes as public/protected | Auto-run by CLI |
| `setup.ts` | Archives previous screenshots to `.previous/`, creates dirs, health check | Auto-run by CLI |
| `authenticate.ts` | Playwright-based auth via dev-login API | Auto-run by capture script |
| `generate-prompts.ts` | Creates hydrated prompt files + `batch-manifest.json` | Auto-run by CLI |
| `scaffold-report.ts` | Generates `CHANGES-NEEDED.md` skeleton with TBD placeholders | Auto-run by CLI |
| `verify-captures.ts` | Validates all screenshots exist and are fresh (mtime > run start) | Run by orchestrator between phases |
| `config.ts` | Static config: viewports, batch size, categories, directory paths | Imported by other scripts |

### Generated Files (in `tools/visual-qa/generated-prompts/`)

After running `pnpm visual-qa`, these files are created:

| File | Purpose |
|------|---------|
| `{route-dir}-analysis-prompt.txt` | Analysis prompt per route (includes previous-run comparison when `.previous/` exists) |
| `batch-manifest.json` | Scheduling manifest: batch groups, prompt file names, recommended category |

The `batch-manifest.json` structure:
```json
{
  "batchSize": 4,
  "batches": [
    { "batch": 1, "routes": ["..."], "prompts": ["...-analysis-prompt.txt", ...] },
    ...
  ],
  "recommendedCategory": "multi-modal"
}
```

Note: there is no `capturePrompts` key. Capture is handled by the script, not by agents.

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

Capture runs as a single Playwright script (no agents). This avoids agent overhead and browser resource contention entirely. Analysis agents run in controlled batches after capture completes.

- **Phase 0**: Orchestrator runs `pnpm visual-qa` — discovers routes, sets up dirs, authenticates via Playwright, captures ALL routes at ALL viewports, generates analysis prompts, scaffolds report.
- **Phase 1**: Orchestrator runs `bun tools/visual-qa/verify-captures.ts` — validates all expected screenshots exist and are fresh.
- **Phase 2**: Analysis agents (background) scheduled in batches per `batch-manifest.json`. They only read screenshot files with `look_at`.
- **Phase 3**: Orchestrator reads the report skeleton and fills in findings from all analysis agents.

## Agent Categories and Skills

| Agent Type | `subagent_type` | `load_skills` | `run_in_background` | Count |
|-----------|----------------|--------------|---------------------|-------|
| Route analysis | `"multimodal-looker"` | `[]` | `true` | 1 per route, batched |

There are no capture agents. Capture is done by the Playwright script the orchestrator runs directly.

## Concurrency Limits

- Capture phase: 1 Playwright script run (no agents, no concurrency concerns).
- Analysis phase: Batched background agents (default batch size 4, configurable in `tools/visual-qa/config.ts`).

</Execution_Policy>

<Steps>

## Phase 0: Capture (orchestrator — you do this directly)

1. Run the full pipeline:

```bash
pnpm visual-qa
```

The CLI defaults to `--serve preview` — it builds the app and starts a preview server on port 6969 automatically. No dev server or `--base-url` needed. Just run the command.

This single command does everything:
- **Build & serve** — runs `pnpm build` then starts the production server (preview mode, default)
- **Discover routes** — scans `src/app/**/page.tsx`, classifies public vs protected
- **Setup directories** — archives previous screenshots to `.previous/`, creates fresh dirs, writes `.run-metadata.json`
- **Health check** — verifies the server is responding
- **Authenticate** — calls dev-login API, creates a Playwright browser context with auth cookies
- **Capture screenshots** — navigates every route at mobile, tablet, and desktop viewports, saves PNGs
- **Generate prompts** — creates hydrated analysis prompt files and `batch-manifest.json`
- **Scaffold report** — creates `screenshots/CHANGES-NEEDED.md` skeleton

If the pipeline fails (build failure, auth failure, etc.), it exits non-zero with an error message. Inform the user and **stop**. Do NOT proceed to analysis.

To use dev mode instead of preview (faster, no build step, but uses Turbopack):

```bash
pnpm visual-qa --serve dev
```

For quick QA on a single route:

```bash
pnpm visual-qa --route /dashboard
```

3. Verify the pipeline output exists:

```bash
ls tools/visual-qa/generated-prompts/batch-manifest.json
```

## Phase 1: Verify Captures (orchestrator — you do this directly)

Run the verification script to confirm all expected screenshots exist and are fresh:

```bash
bun tools/visual-qa/verify-captures.ts
```

It reports fresh/stale/missing counts with exit code `0` (all fresh) or `1` (issues). If screenshots are missing or stale, note it for the report but continue to analysis with what was captured.

## Phase 2: Analyze Screenshots (batched, parallel background)

Read the batch manifest for analysis agent scheduling:

```bash
cat tools/visual-qa/generated-prompts/batch-manifest.json
```

Spawn analysis agents in BATCHES (not all at once) using the batch manifest:
- Read `batchSize` and `batches` from `batch-manifest.json`
- For each batch: read each prompt file listed in `batch.prompts`, spawn as a background task
- Wait for ALL agents in the current batch to complete before starting the next batch
- Spawn each analysis agent with `subagent_type="multimodal-looker"` (do NOT use a category — use subagent_type directly)
- Each analysis agent gets `load_skills=[]` — they use `look_at`, not agent-browser

This prevents API overload from too many simultaneous agents.

## Wait Gate: All Analyses Complete

Wait for ALL analysis agents to complete across all batches. Collect each agent's output — it will contain structured findings per viewport.

## Phase 3: Report Synthesis (orchestrator — you do this directly)

The report skeleton already exists at `screenshots/CHANGES-NEEDED.md` (generated by the pipeline in Phase 0).

1. **Read** the skeleton — it has TBD placeholders and the correct structure (New/Resolved/Persistent sections when `.previous/` exists, or Detailed Findings on first run).
2. **Fill in** findings from all analysis agent outputs, organized by route.
3. **Count** issues by severity (CRITICAL/WARNING/INFO) across all routes and viewports.
4. **Update** the summary table with actual counts per route per viewport.
5. **Write** the final report to `screenshots/CHANGES-NEEDED.md`.
6. **Report** to the user: summary of findings, link to the report file.

</Steps>

<Tool_Usage>

## Delegation Prompt Templates

Analysis prompts are generated dynamically by the pipeline scripts. Do NOT use hardcoded templates.

### Analysis Agent Prompts

One per route. Read from: `tools/visual-qa/generated-prompts/{dirName}-analysis-prompt.txt`

See `tools/visual-qa/generated-prompts/batch-manifest.json` for batch scheduling and prompt file names.

### Analysis Agent Configuration

Always use `subagent_type="multimodal-looker"` for analysis agents. Do NOT use a `category` parameter. Do NOT load `agent-browser` — analysis agents use `look_at` to read screenshot files directly.

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
4. **Notes section** — fill in any missing captures, script errors, or routes skipped

The final report structure matches the scaffold exactly. Do NOT restructure the skeleton — just fill in the placeholders.

</Report_Format>

<Examples>

<Good>

**Correct invocation:**
```
task(category="deep", load_skills=["visual-qa-screenshots"], prompt="Run visual QA for all pages")
```

**Correct orchestration flow:**
```python
# Phase 0: Run full pipeline (build, serve, discover, setup, auth, capture, prompts, scaffold)
# CLI defaults to --serve preview — builds app and starts server automatically
bash("pnpm visual-qa")
# If exit code non-zero: inform user and stop

# Verify pipeline output
bash("ls tools/visual-qa/generated-prompts/batch-manifest.json")

# Phase 1: Verify all screenshots exist and are fresh
bash("bun tools/visual-qa/verify-captures.ts")
# Note any missing/stale files for the report, but continue

# Phase 2: Analysis — batched background agents (from manifest)
manifest = json.parse(read("tools/visual-qa/generated-prompts/batch-manifest.json"))
for batch in manifest["batches"]:
    batch_tasks = []
    for prompt_file in batch["prompts"]:
        prompt = read(f"tools/visual-qa/generated-prompts/{prompt_file}")
        batch_tasks.append(task(
            subagent_type="multimodal-looker",
            load_skills=[],
            run_in_background=true,
            prompt=prompt,
        ))
    collect(batch_tasks)  # wait for this batch before starting next

# Phase 3: Fill in the report skeleton with analysis agent findings
skeleton = read("screenshots/CHANGES-NEEDED.md")
write("screenshots/CHANGES-NEEDED.md", fill_in_findings(skeleton, all_analysis_outputs))
```

Why good: The CLI handles everything — build, serve, capture — in one command. No need to have a dev server running or pass a base URL. Analysis runs in controlled batches to prevent API overload while preserving parallel speedups. No hardcoded routes or prompts.

**Quick single-route QA during development:**
```bash
pnpm visual-qa --route /dashboard
```

Why good: The `--route` flag filters capture to one route, making it fast for iterative development checks without running the full suite. Still auto-builds and serves.

</Good>

<Bad>

**Spawning agent-browser agents for capture:**
```python
# DON'T DO THIS — capture is done by the Playwright script, not agents
task(category="deep", load_skills=["agent-browser"], run_in_background=false,
     prompt="Navigate to http://localhost:3000 and take screenshots...")
```
Why bad: The Playwright capture script already handles all routes at all viewports. Spawning agent-browser for capture is redundant, slower, and bypasses the automated auth and directory setup.

**Skipping the capture script and going straight to analysis:**
```python
# Skipping Phase 0 entirely!
manifest = json.parse(read("tools/visual-qa/generated-prompts/batch-manifest.json"))
for batch in manifest["batches"]:
    ...
```
Why bad: Without running `pnpm visual-qa`, there are no screenshots, no fresh prompt files, and the manifest may be stale or missing. Analysis agents will fail because the files they need don't exist.

**Running authenticate.ts separately when the CLI already ran it:**
```python
bash("pnpm visual-qa")                           # Pipeline already authenticated
bash("bun tools/visual-qa/authenticate.ts")      # Redundant — wastes time, may conflict
```
Why bad: The CLI pipeline chains authentication automatically as part of capture. Running it again is redundant and could interfere with the in-progress browser context.

**Loading agent-browser on analysis agents:**
```python
task(subagent_type="multimodal-looker", load_skills=["agent-browser"], prompt="analyze...")
```
Why bad: Analysis agents use `look_at` to read screenshot files. They don't need a browser. Loading agent-browser wastes context and may confuse the agent.

**Using a category instead of subagent_type for analysis agents:**
```python
task(category="some-category", load_skills=[], prompt="analyze screenshots...")
```
Why bad: Analysis agents MUST use `subagent_type="multimodal-looker"`, not a category. The multimodal-looker agent is purpose-built for screenshot analysis with `look_at`.

**Spawning analysis before the capture script completes:**
```python
bash("pnpm visual-qa &")  # running in background
task(subagent_type="multimodal-looker", prompt="analyze route X")  # capture still running!
```
Why bad: Analysis agents will fail because screenshot files haven't been written yet. Always wait for the capture script to exit before proceeding.

**Using hardcoded routes or prompts instead of generated files:**
```python
task(subagent_type="multimodal-looker",
     prompt="Look at screenshots/dashboard/mobile.png and check for issues...")
```
Why bad: Routes and viewports are discovered dynamically. Hardcoded prompts will drift when routes are added or removed. Always read from `tools/visual-qa/generated-prompts/`.

</Bad>

</Examples>

<Escalation_And_Stop_Conditions>

## Stop and inform user:
- Pipeline fails in Phase 0 (`pnpm visual-qa` exits non-zero) — could be build failure, auth failure, or missing env vars
- Auth failure specifically: check that `ADMIN_EMAIL` is set in `.env.local` and the dev-login API endpoint exists
- Capture script produces zero screenshots across all routes

## Continue despite errors:
- Capture script fails on one route but succeeds on others — note in report, analyze what was captured
- verify-captures.ts reports stale or missing files for some routes — note in report, continue with available screenshots
- A single analysis agent fails — note in report, include findings from other agents
- Some screenshots missing — report partial results, clearly note gaps

## Never do:
- Fix visual issues — this skill is detection only
- Skip routes — every discovered route must be attempted by the capture script
- Write the report before all analyses complete — wait for all agents
- Spawn agent-browser for capture — the Playwright script handles this
- Hardcode routes or prompts — always read from generated files
- Delegate auth to a child agent — the capture script handles auth automatically

</Escalation_And_Stop_Conditions>

<Final_Checklist>

Before reporting completion, verify ALL of these:

- [ ] Capture script (`pnpm visual-qa`) completed successfully (exit code 0)
- [ ] `batch-manifest.json` exists in `tools/visual-qa/generated-prompts/`
- [ ] `verify-captures.ts` ran and output reviewed (fresh/stale/missing counts noted)
- [ ] All analysis agent outputs collected (one per discovered route, across all batches)
- [ ] `screenshots/CHANGES-NEEDED.md` filled in with complete findings (no `_TBD_` or `_Pending analysis..._` placeholders remaining)
- [ ] Report includes accurate issue counts (CRITICAL/WARNING/INFO)
- [ ] Report notes any routes where capture failed or screenshots were missing
- [ ] User informed of summary findings

</Final_Checklist>
