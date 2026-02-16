# E2E Test Debugging Guide

## Quick Diagnosis

```bash
# Run single test in headed mode
pnpm test:e2e --debug --project=chromium tests/e2e/auth.spec.ts

# Run with trace viewer
pnpm test:e2e --trace on

# Open last test report
pnpm exec playwright show-report
```

## Using agent-browser for Failed Tests

When a Playwright test fails, use agent-browser for interactive debugging:

### Get Visual Snapshot

```bash
agent-browser snapshot -i
agent-browser screenshot --path debug.png
```

### State Inspection

```bash
# Check authentication state
agent-browser cookies --domain localhost

# Check localStorage
agent-browser storage local

# View network requests
agent-browser network log
```

### Interactive Debugging

```bash
# Start persistent session
agent-browser session start --name debug

# Navigate to failing page
agent-browser navigate http://localhost:3000/draft

# Get element refs from snapshot
agent-browser snapshot -i
# Output: @e1 = "button: Send Magic Link"

# Interact
agent-browser click @e1
agent-browser fill @e2 "test@example.com"
```

## Common Issues

| Symptom | Check | Solution |
|---------|-------|----------|
| Auth redirect loop | `agent-browser cookies` | Missing auth token cookie |
| Page blank | `agent-browser snapshot -i` | JS errors, check console |
| API errors | Network tab | 401/403/500 responses |
| State issues | `agent-browser storage local` | Stale or missing data |

## Playwright Debug Commands

```bash
# Debug mode (headed + paused)
PWDEBUG=1 pnpm test:e2e --project=chromium

# UI mode (interactive test explorer)
pnpm test:e2e:ui

# Generate new test via codegen
pnpm exec playwright codegen http://localhost:3000
```

## VS Code Integration

Use the "Debug E2E Test" launch configuration to debug individual test files with breakpoints.
