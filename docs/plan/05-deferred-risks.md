# Deferred Features & Risk Mitigations

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Reference for future stages and risk management

---

## Deferred to Stage 2+

### Stage 2: "The Real Slim ShadeVP"

| Feature | Reason for Deferral |
|---------|---------------------|
| ESPN/Yahoo league support | Testers only use Sleeper; adds complexity |
| Python ML algorithms | Monte Carlo, ILP require Python bridge architecture |
| Real-time draft rooms | Requires WebSocket infrastructure; Sleeper handles drafts |
| Live game scoring | Needs reliable live data source; Sleeper matchups suffice |
| Advanced trade value (dynasty, keeper) | Requires more historical data |
| Mobile app (React Native) | Web-first; evaluate demand after alpha |

### Stage 3: "Green Paper Generator"

| Feature | Reason for Deferral |
|---------|---------------------|
| User accounts & persistence | Beyond league connection |
| Subscription tiers | Monetization phase |
| Ads | Monetization phase |
| Premium algorithms | Gated features |
| Social features | Community building |
| League creation via Quantasy | Complex feature, low MVP value |

### Stage 4: "Quantasy 1.0"

| Feature | Reason for Deferral |
|---------|---------------------|
| Marketing site | Public launch |
| Onboarding optimization | Scale concerns |
| Multi-language support | International growth |
| API for third parties | Platform play |

---

## Risk Mitigations

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sleeper API changes | High | Pin to known-working endpoints; monitor for changes; build abstraction layer |
| Supabase free tier limits | Medium | Monitor usage; have upgrade path ready; optimize queries |
| Fly.io cold starts | Low | Configure min instances if needed; show loading state |
| Algorithm accuracy | Medium | Document assumptions; allow user to see/override; iterate based on feedback |

### Product Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Testers don't engage | High | Personal outreach; make onboarding trivial; offer to screenshare |
| Algorithms don't match expectations | Medium | "Show Your Work" builds trust; compare to expert consensus; explain caveats |
| Mobile experience poor | Medium | Mobile-first design; test on real devices early; prioritize performance |
| Feature creep | Medium | Strict phase scope; defer non-essentials; this plan is the contract |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solo developer burnout | High | Realistic timeline (12 weeks vs 8); celebrate milestones; take breaks |
| No version control discipline | Medium | Commit often; use PRs even solo; automated CI checks |
| Production incidents during alpha | Medium | Error monitoring; be available for testers; have rollback ready |

---

## Risk Response Plans

### If Sleeper API Changes

1. **Detection**: Monitor API responses for unexpected shapes
2. **Immediate**: Disable affected feature with user-friendly message
3. **Short-term**: Update types and client to match new API
4. **Long-term**: Build abstraction layer to isolate API changes

### If Supabase Limits Hit

1. **Detection**: Monitor dashboard for approaching limits
2. **Immediate**: Reduce sync frequency, increase cache TTLs
3. **Short-term**: Optimize queries, add indexes
4. **Long-term**: Upgrade to paid tier or evaluate alternatives

### If Testers Don't Engage

1. **Detection**: Track signups vs. active usage
2. **Immediate**: Personal follow-up with each tester
3. **Short-term**: Simplify onboarding, add guided tour
4. **Long-term**: Re-evaluate target audience fit

### If Algorithm Accuracy Is Poor

1. **Detection**: Feedback form, direct user complaints
2. **Immediate**: Add disclaimers, highlight "Show Your Work"
3. **Short-term**: Compare to expert rankings, adjust weights
4. **Long-term**: A/B test different approaches, gather more data

---

## Stage 1 Scope Lock

To prevent feature creep, these boundaries are firm for Stage 1:

### IN Scope
- Sleeper league connection
- VBD draft rankings
- Lineup optimizer
- Trade calculator
- Waiver recommendations
- "Show Your Work" transparency
- Mobile-responsive web app

### OUT of Scope (Until Stage 2+)
- ESPN/Yahoo integration
- Python-based ML
- Real-time features
- Monetization
- Mobile native app
- Social features
- League creation

**Any request for out-of-scope features goes to the Stage 2 backlog, no exceptions.**

---

## Success Signals for Stage 2 Go/No-Go

Before starting Stage 2, evaluate:

| Signal | Green | Yellow | Red |
|--------|-------|--------|-----|
| Tester engagement | 80%+ used 3+ features | 50-80% | <50% |
| Algorithm trust | 4+ avg satisfaction | 3-4 avg | <3 avg |
| Technical stability | 0 critical bugs | 1-2 managed | 3+ unresolved |
| Developer sustainability | Energized | Tired but OK | Burned out |

**If 2+ signals are Red**: Pause, address issues, extend timeline.

---

## Related Documents

- [00-overview.md](./00-overview.md) - Success criteria
- [phase-5-alpha-testing.md](./phase-5-alpha-testing.md) - Feedback collection
