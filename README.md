# Quantasy

Quantasy is a high-performance fantasy football application that brings algorithmic transparency ("Show Your Work") to your draft and league management. Inspired by the visual style of Balatro, Quantasy integrates with the Sleeper API to provide real-time insights and data-driven recommendations.

## Key Features

- **VBD Rankings**: Value Based Drafting algorithms to identify the true value of players across different positions.
- **Lineup Optimizer**: Data-driven recommendations for your weekly starting roster.
- **Trade Evaluator**: Transparent breakdown of trade values to help you win every deal.
- **Waiver Recommendations**: Algorithmic analysis of free agents and waiver wire targets.
- **"Show Your Work" Transparency**: Every recommendation comes with a clear explanation of the underlying data and logic.

## Prerequisites

- **Node.js**: 20.x or higher
- **pnpm**: 10.x or higher
- **Supabase**: Account and project for authentication and database
- **Sleeper**: Account for fantasy football league data

## Environment Variables

Create a `.env.local` file in the root directory and populate it with the following variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable API key |
| `SUPABASE_SECRET_KEY` | Your Supabase secret key (Server-side only) |
| `NEXT_PUBLIC_APP_URL` | The base URL of your application (e.g., `http://localhost:3000`) |
| `GROQ_API_KEY` | API key for Groq AI integration (used for AI explanations) |
| `SENTRY_DSN` | Sentry Data Source Name for error monitoring |
| `NEXT_PUBLIC_SENTRY_DSN` | Public Sentry DSN for client-side error tracking |

## Local Development Setup

Follow these steps to get your development environment running:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/qai.git
   cd qai
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Supabase:**
   Ensure you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed.
   ```bash
   supabase start
   supabase db reset
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your specific keys and URLs
   ```

5. **Run the development server:**
   ```bash
   pnpm dev
   ```
   The application will be available at `http://localhost:3000`.

## Available Scripts

- `pnpm dev` - Starts the development server with Turbopack.
- `pnpm build` - Creates an optimized production build.
- `pnpm lint` - Runs ESLint to check for code quality issues.
- `pnpm type-check` - Performs TypeScript type checking.
- `pnpm test` - Runs unit tests using Vitest.
- `pnpm test:e2e` - Runs end-to-end tests using Playwright.
- `pnpm validate` - Runs type-check, lint, and unit tests in sequence.

## Project Structure

- `src/app/` - Next.js App Router pages and API routes.
- `src/components/` - Reusable UI components, including Balatro-inspired animations.
- `src/lib/` - Core logic, including:
  - `algorithms/`: VBD and other draft/roster algorithms.
  - `sleeper/`: Sleeper API client and integration logic.
  - `supabase/`: Database and authentication configuration.
  - `ai/`: Groq AI integration for transparent explanations.
- `src/hooks/` - Custom React hooks for state and side effects.
- `tests/` - Comprehensive unit and E2E test suites.

## Deployment

Quantasy is designed to be deployed on **Fly.io** as a standalone Next.js application.

- **Build Output**: Standalone Next.js
- **Database**: Hosted Supabase (PostgreSQL)
- **CI/CD**: GitHub Actions for automated testing and deployment to Fly.io.

Refer to the `fly.toml` configuration and GitHub Action workflows for specific deployment details.
