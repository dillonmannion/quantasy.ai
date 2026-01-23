# Phase 5: Alpha Testing & Iteration (Weeks 11-12)

> **Source:** Extracted from PLAN-v2.md
> **Purpose:** Complete implementation guide for Phase 5

---

## Objectives

- Deploy production environment
- Onboard 5-10 alpha testers
- Collect structured feedback
- Fix critical bugs
- Iterate based on feedback

---

## Week 11: Alpha Launch

### Day 1: Production Deployment

- [ ] Create production Fly.io app (separate from staging)
- [ ] Production Supabase project (or use same with care)
- [ ] Configure production environment variables
- [ ] Set up production domain (optional, can use fly.dev)
- [ ] Verify all features work in production
- [ ] Enable Supabase backups

### Day 2: Tester Onboarding Materials

- [ ] Create "Welcome to Quantasy Alpha" guide:
  ```markdown
  # Welcome to Quantasy Alpha!
  
  Thanks for testing! Here's what you need to know:
  
  ## Getting Started
  1. Go to [quantasy.fly.dev]
  2. Click "Sign In" and use your email
  3. Connect your Sleeper league
  
  ## What to Test
  - [ ] Connect your league and see your roster
  - [ ] Use the Draft Assistant (rankings make sense?)
  - [ ] Check the Trade Calculator (try a real trade you're considering)
  - [ ] Look at Waiver recommendations
  
  ## How to Give Feedback
  - Use this form: [Google Form link]
  - Or text me directly
  
  ## Known Issues
  - [List any known bugs]
  ```
- [ ] Create feedback form (Google Forms or Typeform):
  - What feature did you use?
  - Did it work as expected?
  - What was confusing?
  - What would make it better?
  - Rate 1-5: Usefulness, Speed, Fun factor

### Day 3-4: Invite Testers

- [ ] Send personalized invites to 5-10 friends/family
- [ ] Offer to screenshare onboarding if needed
- [ ] Be available for questions (set response time expectation)
- [ ] Track who has:
  - [ ] Signed up
  - [ ] Connected a league
  - [ ] Used each feature

### Day 5: Monitor & Support

- [ ] Watch error monitoring for issues
- [ ] Check Supabase logs for failed queries
- [ ] Respond to tester questions same-day
- [ ] Start bug/feedback tracking list

---

## Week 12: Iteration & Wrap-up

### Day 1-2: Triage Feedback

- [ ] Categorize feedback:
  - **Critical bugs** - App broken, can't use feature
  - **UX issues** - Confusing, hard to find, unexpected behavior
  - **Feature requests** - "It would be cool if..."
  - **Praise** - What's working well (keep doing this!)
- [ ] Prioritize critical bugs for immediate fix
- [ ] Create issues for Stage 2 backlog

### Day 3-4: Bug Fixes & Quick Wins

- [ ] Fix all critical bugs
- [ ] Implement quick UX wins (< 2 hours each)
- [ ] Deploy fixes
- [ ] Notify testers of updates

### Day 5: Alpha Retrospective

- [ ] Analyze feedback trends:
  - What features are most used?
  - What's most confusing?
  - What's most requested for next version?
- [ ] Update documentation based on learnings
- [ ] Write Stage 1 retrospective:
  ```markdown
  # Quantasy Stage 1 Retrospective
  
  ## What Went Well
  - ...
  
  ## What Could Be Better
  - ...
  
  ## Key Learnings
  - ...
  
  ## Priorities for Stage 2
  - ...
  ```
- [ ] **Celebrate completion!**

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Testers onboarded | 5-10 | Count of accounts with connected leagues |
| Features used per tester | 3+ | Analytics or feedback form |
| Critical bugs in production | 0 by end of Week 12 | Error monitoring |
| Tester satisfaction (1-5) | 4+ average | Feedback form |
| "Would recommend" | 80%+ | Feedback form |

---

## Deliverables Checklist

- [ ] Production app deployed and stable
- [ ] 5-10 testers actively using the app
- [ ] Feedback collected and categorized
- [ ] Critical bugs fixed
- [ ] Stage 1 retrospective written
- [ ] Stage 2 backlog prioritized

---

## Feedback Form Template

### Questions to Ask

1. **Feature Usage**
   - Which features did you try? (multi-select)
   - Which feature did you use most?
   - Which feature did you find most valuable?

2. **Usability**
   - Was connecting your Sleeper league easy? (1-5)
   - Was navigation intuitive? (1-5)
   - Did you encounter any errors? (Y/N, describe)

3. **Algorithm Trust**
   - Did the Draft rankings make sense? (1-5)
   - Did the Trade Calculator match your intuition? (1-5)
   - Was "Show Your Work" helpful? (1-5)

4. **Overall**
   - How likely are you to use this during your season? (1-5)
   - Would you recommend to a friend? (1-5)
   - What's the #1 thing that would make this better?

5. **Open Feedback**
   - What surprised you (good or bad)?
   - Any other thoughts?

---

## Bug Tracking Template

| ID | Severity | Feature | Description | Steps to Reproduce | Status |
|----|----------|---------|-------------|-------------------|--------|
| 001 | Critical | Auth | Can't login with email | 1. Go to /login 2. Enter email 3. Click submit | Open |
| 002 | Medium | Trade | Fairness score doesn't update | ... | Fixed |

### Severity Definitions

- **Critical**: App broken, feature unusable, data loss
- **High**: Major functionality impaired, workaround exists
- **Medium**: Minor functionality issues, cosmetic problems
- **Low**: Nice to have, polish items

---

## Production Checklist

### Before Launch
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Seed data loaded (if needed)
- [ ] SSL certificate valid
- [ ] Error monitoring active
- [ ] Backups configured

### Monitoring
- [ ] Fly.io dashboard accessible
- [ ] Supabase dashboard accessible
- [ ] Error alerts configured
- [ ] Usage metrics tracked

### Rollback Plan
- [ ] Previous deployment tagged
- [ ] Know how to `fly deploy --image [previous]`
- [ ] Database backup available

---

## Related Documents

- [phase-4-waivers-polish.md](./phase-4-waivers-polish.md) - Previous phase
- [05-deferred-risks.md](./05-deferred-risks.md) - Stage 2+ planning
- [00-overview.md](./00-overview.md) - Success criteria reference
