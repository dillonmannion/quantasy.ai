# Quantasy Alpha Tester Guide

Welcome to Quantasy alpha testing! This guide will help you get started with the application and provide effective feedback.

## Getting Started

### 1. Connect Your Sleeper Account

1. Navigate to `/connect` in the app
2. Enter your Sleeper username
3. Click "Connect Account"
4. Your leagues will be automatically synced

### 2. Navigate the Tools

Quantasy provides four main tools:

#### VBD Rankings (`/draft`)
- **Purpose**: Draft preparation with Value Based Drafting
- **How to Use**:
  1. Select your league
  2. View priority-ranked players
  3. Click "Show Your Work" to see VBD calculation
- **What to Test**: Ranking accuracy, position filtering, search

#### Lineup Optimizer (`/roster`)
- **Purpose**: Weekly lineup recommendations
- **How to Use**:
  1. Select week
  2. View optimized starting lineup
  3. Compare to current lineup
- **What to Test**: Lineup logic, injury handling, bye weeks

#### Trade Evaluator (`/trade`)
- **Purpose**: Analyze trade fairness
- **How to Use**:
  1. Add players you're giving
  2. Add players you're receiving
  3. View fairness score and verdict
- **What to Test**: Trade valuation, multi-player trades

#### Waiver Wire (`/waivers`)
- **Purpose**: Free agent recommendations
- **How to Use**:
  1. Select week
  2. Enter FAAB budget (optional)
  3. View priority-ranked recommendations
  4. Click "Add to Claims" to open in Sleeper
- **What to Test**: Recommendation quality, FAAB bids, droppable players

## What to Test

### Functionality
- [ ] All tools load without errors
- [ ] Sleeper data syncs correctly
- [ ] Calculations match expectations
- [ ] "Show Your Work" explanations are clear
- [ ] Mobile experience is smooth

### User Experience
- [ ] Navigation is intuitive
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Animations enhance (not distract)
- [ ] Dark theme is readable

### Edge Cases
- [ ] Empty rosters
- [ ] Injured players
- [ ] Bye weeks
- [ ] Non-standard league settings
- [ ] Slow network conditions

## Providing Feedback

### What We Need

**Bug Reports**:
- What you were doing
- What you expected
- What actually happened
- Screenshots if applicable

**Feature Requests**:
- What problem you're trying to solve
- How you'd like it to work
- Why it's important to you

**General Feedback**:
- What you love
- What's confusing
- What's missing
- Performance issues

### How to Submit

1. **GitHub Issues**: [Link to repo issues]
2. **Discord**: [Link to Discord channel]
3. **Email**: alpha-feedback@quantasy.app

## Known Issues

- E2E tests timeout in isolation (need full test environment)
- Lighthouse audits require manual execution
- Some algorithm docs incomplete

## FAQ

**Q: Why don't I see my league?**  
A: Make sure you've connected your Sleeper account and your league is active for the current season.

**Q: Why are recommendations different from other tools?**  
A: Quantasy uses VBD (Value Based Drafting) which accounts for positional scarcity. Click "Show Your Work" to see the math.

**Q: Can I use this for multiple leagues?**  
A: Currently v1 shows your first league. Multi-league support coming in Phase 5.

**Q: Is my data private?**  
A: Yes. We only access public Sleeper data. No PII is stored in error logs (Sentry strips email/IP).

## Thank You!

Your feedback helps make Quantasy better for everyone. We appreciate your time and insights!
