# Runtime Secrets Injection Setup Guide

This guide walks you through configuring production secrets for Quantasy's deployment to Fly.io. Secrets are injected at three stages: GitHub Actions build-time, Fly.io runtime, and Supabase hosted project configuration.

**⚠️ CRITICAL**: Never commit real secret values to version control. All secrets should be configured through secure dashboards and CLI tools only.

---

## Section 1: GitHub Actions Secrets

GitHub Actions secrets are used during the build process to pass configuration to the Docker build and Fly.io deployment. These are build-time secrets that get embedded in the Docker image or passed to Fly.io.

### 1.1 Access GitHub Secrets Dashboard

1. Navigate to: https://github.com/4Clover/quantasy.ai/settings/secrets/actions
2. You must have admin access to the repository
3. Click **"New repository secret"** for each secret below

### 1.2 Configure Six Required Secrets

#### Secret 1: FLY_API_TOKEN

**Purpose**: Authenticates `flyctl` commands in GitHub Actions to deploy to Fly.io

**Where to Get It**:
1. Go to https://fly.io/user/personal_access_tokens
2. Click **"Create Deployment Token"** or **"Create Org Token"**
3. Name it: `quantasy-github-actions`
4. Copy the token (you'll only see it once)

**Used By**: `.github/workflows/deploy.yml` (line 28)

**GitHub Actions Step**:
```
Secret Name: FLY_API_TOKEN
Secret Value: [paste token from Fly.io]
```

---

#### Secret 2: NEXT_PUBLIC_SUPABASE_URL

**Purpose**: Supabase project URL for client-side and build-time configuration

**Where to Get It**:
1. Go to https://supabase.com/dashboard/project/_/settings/api-keys
2. Replace `_` with your Supabase project ID
3. Copy the **Project URL** (looks like `https://your-project.supabase.co`)

**Used By**: 
- `.github/workflows/deploy.yml` (line 23, passed as build arg)
- `Dockerfile` (line 19, ARG NEXT_PUBLIC_SUPABASE_URL)
- Runtime: `src/lib/supabase/admin.ts` (line 22)

**GitHub Actions Step**:
```
Secret Name: NEXT_PUBLIC_SUPABASE_URL
Secret Value: https://your-project.supabase.co
```

---

#### Secret 3: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

**Purpose**: Supabase publishable API key for client-side authentication

**Where to Get It**:
1. Go to https://supabase.com/dashboard/project/_/settings/api-keys
2. Replace `_` with your Supabase project ID
3. Copy a **publishable** key (starts with `sb_publishable_...`)

**Used By**:
- `.github/workflows/deploy.yml` (passed as build arg)
- `Dockerfile` (ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
- Runtime: `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`

**GitHub Actions Step**:
```
Secret Name: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Secret Value: sb_publishable_...
```

> **Migration Note**: This replaces the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The code
> falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if the new name isn't set, so both work
> during the transition period.

---

#### Secret 4: NEXT_PUBLIC_SENTRY_DSN

**Purpose**: Sentry Data Source Name for client-side error tracking

**Where to Get It**:
1. Go to https://quantasy-es.sentry.io/settings/projects/dev/keys/
2. Copy the **DSN** value (looks like `https://key@quantasy-es.sentry.io/project-id`)

**Used By**:
- `.github/workflows/deploy.yml` (line 25, passed as build arg)
- `Dockerfile` (line 21, ARG NEXT_PUBLIC_SENTRY_DSN)
- Runtime: `src/instrumentation-client.ts`

**GitHub Actions Step**:
```
Secret Name: NEXT_PUBLIC_SENTRY_DSN
Secret Value: https://key@quantasy-es.sentry.io/project-id
```

---

#### Secret 5: SENTRY_AUTH_TOKEN

**Purpose**: Sentry authentication token for uploading source maps and managing releases

**Where to Get It**:
1. Go to https://quantasy-es.sentry.io/settings/auth-tokens/
2. Click **"Create New Token"**
3. Required scopes:
   - `project:releases` (for source map uploads)
   - `org:read` (for organization access)
4. Copy the token

**Used By**:
- `.github/workflows/deploy.yml` (line 26, passed as build arg)
- `Dockerfile` (line 22, ARG SENTRY_AUTH_TOKEN)
- Build process: Sentry CLI for source map uploads

**GitHub Actions Step**:
```
Secret Name: SENTRY_AUTH_TOKEN
Secret Value: [paste token from Sentry]
```

---

#### Secret 6: NEXT_PUBLIC_POSTHOG_KEY

**Purpose**: PostHog project API key for product analytics (build-time, baked into client JS)

**Where to Get It**:
1. Go to https://us.posthog.com/settings/project#variables
2. Copy the **Project API Key** (starts with `phc_...`)

**Used By**:
- `.github/workflows/deploy.yml` (passed as build arg)
- `Dockerfile` (ARG NEXT_PUBLIC_POSTHOG_KEY)
- Runtime: `src/components/providers/posthog-provider.tsx`

**GitHub Actions Step**:
```
Secret Name: NEXT_PUBLIC_POSTHOG_KEY
Secret Value: phc_...
```

---

### 1.3 Verify GitHub Secrets

After adding all six secrets, verify they're configured:

```bash
# List all repository secrets (requires GitHub CLI)
gh secret list --repo 4Clover/quantasy.ai
```

Expected output should show all six secrets listed (values are masked).

---

## Section 2: Fly.io Runtime Secrets

Runtime secrets are injected into the Fly.io VM at startup and are available to the Node.js application via `process.env`. These are different from build-time secrets and are not embedded in the Docker image.

### 2.1 Prerequisites

- Fly.io CLI installed: https://fly.io/docs/hands-on/install-flyctl/
- Authenticated with Fly.io: `flyctl auth login`
- App deployed to Fly.io (or created via `flyctl launch`)

### 2.2 Set Three Runtime Secrets

Run these commands from your local machine (not in the VM):

#### Secret 1: SUPABASE_SECRET_KEY

**Purpose**: Server-side Supabase secret key for privileged database operations (bypasses RLS)

**Where to Get It**:
1. Go to https://supabase.com/dashboard/project/_/settings/api-keys
2. Replace `_` with your Supabase project ID
3. Create or copy a **secret** key (starts with `sb_secret_...`)

**Used By**: `src/lib/supabase/admin.ts` (createServiceClient)

**Fly.io Command**:
```bash
flyctl secrets set SUPABASE_SECRET_KEY="sb_secret_..." \
  --app quantasy-alpha
```

> **Migration Note**: This replaces the legacy `SUPABASE_SERVICE_ROLE_KEY`. The code
> falls back to `SUPABASE_SERVICE_ROLE_KEY` if the new name isn't set, so both work
> during the transition period.

---

#### Secret 2: GROQ_API_KEY

**Purpose**: Groq API key for AI-powered draft explanations

**Where to Get It**:
1. Go to https://console.groq.com/keys
2. Create a new API key or copy existing one
3. Copy the full key

**Used By**: `src/lib/ai/groq.ts` (line 9)

**Fly.io Command**:
```bash
flyctl secrets set GROQ_API_KEY="your-groq-api-key-here" \
  --app quantasy-alpha
```

---

#### Secret 3: SENTRY_DSN

**Purpose**: Server-side Sentry DSN for error tracking on the backend

**Where to Get It**:
1. Go to https://quantasy-es.sentry.io/settings/projects/dev/keys/
2. Copy the **DSN** value (same as NEXT_PUBLIC_SENTRY_DSN)

**Used By**: `src/instrumentation.ts` (server-side initialization)

**Fly.io Command**:
```bash
flyctl secrets set SENTRY_DSN="https://key@quantasy-es.sentry.io/project-id" \
  --app quantasy-alpha
```

---

### 2.3 Verify Fly.io Runtime Secrets

After setting all secrets, verify they're configured:

```bash
# List all runtime secrets (values are masked)
flyctl secrets list --app quantasy-alpha
```

Expected output:
```
NAME                          DIGEST                  CREATED AT
SUPABASE_SECRET_KEY           sha256:abc123...        2 minutes ago
GROQ_API_KEY                  sha256:def456...        2 minutes ago
SENTRY_DSN                    sha256:ghi789...        2 minutes ago
```

---

## Section 3: Supabase Hosted Project Configuration

Supabase requires additional configuration beyond just API keys. This section covers hosted project setup.

### 3.1 Apply Database Migrations

Migrations create the required tables and schemas for Quantasy.

**Steps**:
1. Go to https://supabase.com/dashboard/project/_/sql/new
2. Replace `_` with your Supabase project ID
3. Copy and paste each migration file from `supabase/migrations/` directory
4. Execute each migration in order (check timestamps in filenames)

**Verify**:
- Go to https://supabase.com/dashboard/project/_/editor
- You should see tables: `profiles`, `leagues`, `user_leagues`, `rosters`, `players`, `matchups`, `algorithm_outputs`

---

### 3.2 Configure Authentication Redirects

OAuth callbacks need to be configured for Sleeper login.

**Steps**:
1. Go to https://supabase.com/dashboard/project/_/auth/url-configuration
2. Replace `_` with your Supabase project ID
3. Under **Redirect URLs**, add:
   ```
   https://quantasy-alpha.fly.dev/auth/callback
   https://quantasy-alpha.fly.dev/
   ```
4. Click **Save**

**Note**: Replace `quantasy-alpha` with your actual Fly.io app name if different.

---

### 3.3 Enable Row-Level Security (RLS)

RLS policies protect user data at the database level.

**Steps**:
1. Go to https://supabase.com/dashboard/project/_/auth/policies
2. Replace `_` with your Supabase project ID
3. For each table (`profiles`, `leagues`, `rosters`, `players`, `matchups`):
   - Click the table name
   - Enable **RLS** toggle
   - Verify policies are in place (should be auto-created by migrations)

**Verify**:
- Each table should show "RLS is ON" with green checkmark
- Policies should restrict access to authenticated users' own data

---

### 3.4 Generate TypeScript Types

After migrations are applied, regenerate TypeScript types:

```bash
# From your local machine
pnpm types:generate
```

This updates `src/lib/supabase/types.ts` to match your hosted schema.

---

## Section 4: Fly.io VM Memory Recommendation

The default Fly.io VM size (256MB) may be insufficient for production workloads. This section covers upgrading.

### 4.1 Current Configuration

Your `fly.toml` currently specifies:
```toml
[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'
```

### 4.2 Recommended Upgrade

For production with Next.js standalone build:

**Update `fly.toml`**:
```toml
[[vm]]
  size = 'shared-cpu-1x'
  memory = '512mb'
```

**Why**: 
- Next.js standalone build requires ~200MB base
- Leaves ~300MB for application runtime
- Prevents OOM kills during traffic spikes

### 4.3 Apply Memory Change

```bash
# Update fly.toml locally
# Then deploy to apply changes
flyctl deploy --app quantasy-alpha
```

---

## Section 5: Pre-Deploy Verification

Before deploying to production, verify all secrets and configuration are in place.

### 5.1 Verify GitHub Secrets

```bash
# List GitHub repository secrets
gh secret list --repo 4Clover/quantasy.ai

# Expected: All 6 secrets listed
# FLY_API_TOKEN
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# NEXT_PUBLIC_SENTRY_DSN
# SENTRY_AUTH_TOKEN
# NEXT_PUBLIC_POSTHOG_KEY
```

---

### 5.2 Verify Fly.io Runtime Secrets

```bash
# List Fly.io runtime secrets
flyctl secrets list --app quantasy-alpha

# Expected: All 3 secrets listed
# SUPABASE_SECRET_KEY
# GROQ_API_KEY
# SENTRY_DSN
```

---

### 5.3 Verify Supabase Configuration

**Check migrations applied**:
```bash
# Go to Supabase dashboard
# https://supabase.com/dashboard/project/_/sql/migrations
# Verify all migrations show "Success" status
```

**Check auth redirects**:
```bash
# Go to Supabase dashboard
# https://supabase.com/dashboard/project/_/auth/url-configuration
# Verify redirect URLs include your Fly.io app URL
```

**Check RLS enabled**:
```bash
# Go to Supabase dashboard
# https://supabase.com/dashboard/project/_/auth/policies
# Verify each table shows "RLS is ON"
```

---

### 5.4 Dry-Run Deployment

Test the deployment without actually deploying:

```bash
# Dry-run to verify build and secrets
flyctl deploy --dry-run --app quantasy-alpha

# Expected output:
# - Docker build succeeds
# - All build args resolved from GitHub secrets
# - No errors about missing secrets
```

---

### 5.5 Deploy to Production

Once all verifications pass:

```bash
# Deploy to Fly.io
flyctl deploy --app quantasy-alpha

# Monitor deployment
flyctl logs --app quantasy-alpha

# Verify app is running
flyctl status --app quantasy-alpha
```

---

## Troubleshooting

### Build Fails: "Missing build arg"

**Cause**: GitHub secret not set or workflow not reading it

**Fix**:
1. Verify secret exists: `gh secret list --repo 4Clover/quantasy.ai`
2. Check workflow file: `.github/workflows/deploy.yml` references correct secret names
3. Re-run workflow: Push to `prod` branch to trigger deployment

---

### Runtime Error: "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required"

**Cause**: Runtime secret not set in Fly.io

**Fix**:
```bash
# Verify secret is set
flyctl secrets list --app quantasy-alpha

# If missing, set it
flyctl secrets set SUPABASE_SECRET_KEY="sb_secret_..." --app quantasy-alpha

# Restart app to pick up new secret
flyctl restart --app quantasy-alpha
```

---

### App Crashes: "OOM kill"

**Cause**: VM memory too low for workload

**Fix**:
1. Update `fly.toml` to 512MB (see Section 4)
2. Deploy: `flyctl deploy --app quantasy-alpha`
3. Monitor: `flyctl logs --app quantasy-alpha`

---

### Sentry Source Maps Not Uploading

**Cause**: SENTRY_AUTH_TOKEN missing or insufficient scopes

**Fix**:
1. Verify token has `project:releases` and `org:read` scopes
2. Regenerate token at https://quantasy-es.sentry.io/settings/auth-tokens/
3. Update GitHub secret: `gh secret set SENTRY_AUTH_TOKEN --repo 4Clover/quantasy.ai`

---

## Summary Checklist

- [ ] GitHub Actions Secrets configured (6 total)
  - [ ] FLY_API_TOKEN
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - [ ] NEXT_PUBLIC_SENTRY_DSN
  - [ ] SENTRY_AUTH_TOKEN
  - [ ] NEXT_PUBLIC_POSTHOG_KEY
- [ ] Fly.io Runtime Secrets configured (3 total)
  - [ ] SUPABASE_SECRET_KEY
  - [ ] GROQ_API_KEY
  - [ ] SENTRY_DSN
- [ ] Supabase Hosted Project configured
  - [ ] Migrations applied
  - [ ] Auth redirects configured
  - [ ] RLS enabled on all tables
  - [ ] TypeScript types generated
- [ ] Fly.io VM memory upgraded to 512MB
- [ ] Pre-deploy verification passed
  - [ ] GitHub secrets verified
  - [ ] Fly.io secrets verified
  - [ ] Supabase configuration verified
  - [ ] Dry-run deployment successful

---

## References

- **Fly.io Secrets**: https://fly.io/docs/reference/secrets/
- **Supabase API Keys**: https://supabase.com/dashboard/project/_/settings/api-keys
- **Groq Console**: https://console.groq.com/keys
- **Sentry Auth Tokens**: https://quantasy-es.sentry.io/settings/auth-tokens/
- **GitHub Actions Secrets**: https://github.com/4Clover/quantasy.ai/settings/secrets/actions
- **Fly.io Documentation**: https://fly.io/docs/
- **Supabase Documentation**: https://supabase.com/docs
