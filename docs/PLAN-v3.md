# 🏈 Quantasy Stage 3: Alpha & Beyond (PLAN-v3)

## OVERVIEW

Quantasy has successfully completed the initial implementation phase (Stage 1 & 2). This plan supersedes PLAN-v2 and outlines the roadmap from Alpha testing to public release, incorporating market research and technology refinements.

---

## 📋 Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | Original | Initial plan with Remix, ESPN API, 8-week timeline |
| v2.0 | Archived | Next.js stack, Sleeper-only, 12-week timeline, mobile-first |
| v3.0 | 2026-02-04 | Alpha testing strategy, competitive analysis, and 1.0.0 roadmap |

---

## 🚀 1. Current State Assessment

As of February 2026, Quantasy has achieved core feature parity for the Sleeper ecosystem.

### Core Features (COMPLETE)
1. **Draft Assistant**: VBD-based rankings with mock draft support.
2. **Roster Optimizer**: Side-by-side lineup comparison with "optimized" suggestions.
3. **Trade Calculator**: Drag-and-drop builder with fairness scoring.
4. **Waiver Recommender**: FAAB bid suggestions and drop recommendations.
5. **"Show Your Work"**: Transparent algorithmic breakdowns for all recommendations.
6. **Sleeper API Integration**: High-performance sync with official Sleeper data.
7. **Auth & Profile**: Secure league connection and persistence via Supabase.
8. **Balatro-Inspired UI**: Custom animation primitives and mobile-first design.

### Technical Health
- **Unit Tests**: 739 tests (Vitest).
- **E2E Flows**: 17 critical paths (Playwright).
- **VBD Algorithm**: 100% test coverage (branches, functions, lines).
- **Dynasty Focus**: Multi-source value integration (FantasyCalc, KTC, DynastyProcess).
- **Deployment**: fly.io (San Jose region) with PWA support.

---

## 📊 2. Competitive Analysis

### Market Context
- **Market Size**: 57 million participants in US/Canada; projected 65 million by 2026.
- **Underserved Segments**: Dynasty players and users who want to "understand the reasoning" (transparency).

### The Players
| Platform | Market Data | Strengths | Weaknesses |
|----------|-------------|-----------|------------|
| **Sleeper** | 4M+ users | Social, mobile UX, Dynasty | Betting focus, desktop lag |
| **ESPN** | 14M+ users | Brand, free content | Technical failures, outdated UX |
| **FantasyPros** | Leading Tool | Aggregation, broad sync | Sync reliability, generic advice |

### Key Strategic Insights
1. **Personalization is King**: ESPN's native projections outperform third-party aggregators (+4.7 pts/week) because they calibrate to exact league settings. Quantasy replicates this through league-specific VBD.
2. **Crowdsourced Value**: KTC has 23M+ data points, validating our multi-source dynasty value approach.
3. **Reliability Gap**: Platforms routinely crash in Week 1. Quantasy's 739+ tests and CI/CD focus on high-reliability execution.

### Quantasy Differentiators
- **Transparency**: "Show Your Work" replaces the "black box" of legacy tools.
- **Zero-Sync Friction**: Native Sleeper integration avoids the Chrome Extension/Cookie hacks used for ESPN.
- **Mobile-First Juice**: High-fidelity animations inspired by Balatro.

---

## 🧪 3. Alpha Testing Strategy

**Objective**: Validate algorithmic accuracy and UI/UX friction with a dedicated core of dynasty enthusiasts.

- **Tester Base**: 25-50 dynasty-focused managers.
- **Feedback Loop**: Integrated in-app feedback form at `/feedback` (monitored via Supabase).
- **Usage Analytics**: Posthog for feature heatmaps and retention tracking.
- **Error Monitoring**: Sentry with performance tracing (50% sample rate).
- **Duration**: 1-3 weeks of intensive iteration.
- **Budget**: $25-50/mo (covered by free tiers for most services).

---

## 🗺️ 4. Future Roadmap

Quantasy follows Semantic Versioning for its release cycle (see `docs/VERSIONING.md`).

### Phase 0.1.x: Alpha Refinement (CURRENT)
- Bug fixes from initial feedback.
- Performance tuning for high-traffic syncs.
- Polishing Balatro animations.

### Phase 0.2.0: Redraft & Keeper Priority
- Enhanced support for redraft/keeper league specific settings.
- Waiver v2: Incorporating bye-week stress and matchup strength.
- Multi-source ADP enrichment.

### Phase 0.3.0: Platform Expansion & Simulation
- ESPN/Yahoo integration research (Chrome extension requirements).
- Monte Carlo draft simulation (predicting league-mate pick patterns).

### Phase 0.4.0: Real-Time Engagement
- Live scoring integration with "win probability" shifts.
- Real-time draft room overlay.

### Phase 1.0.0: Public Release
- Criteria: < 5 critical bugs, NPS > 40, verified sync reliability across platforms.

---

## 🛠️ 5. Technology Decisions

| Category | Technology | Rationale |
|----------|------------|-----------|
| **Framework** | Next.js 16 + React 19 | Latest App Router patterns, React Server Components. |
| **Database/Auth** | Supabase | Postgres with RLS + secure Auth. |
| **Data API** | Sleeper API | 16 req/sec rate limit, robust data. |
| **AI Intelligence**| Groq (Llama-3.3-70b) | Fast, cost-effective transparent explanations. |
| **Analytics** | Posthog | Product analytics + session recording. |
| **Monitoring** | Sentry | Error tracking + performance tracing. |
| **Deployment** | Fly.io | Standalone Next.js output, predictable scaling. |

---

## 📈 6. Success Metrics for Alpha

1. **Feature Adoption**: 80%+ of testers use 3 or more core tools.
2. **Stability**: < 5 critical bugs reported during the 3-week window.
3. **Engagement**: Average session length > 5 minutes.
4. **Retention**: Return rate > 60% within the first week.
5. **NPS**: Establish a baseline Net Promoter Score from feedback forms.
6. **Conversion**: > 50% feedback form submission rate for active testers.
