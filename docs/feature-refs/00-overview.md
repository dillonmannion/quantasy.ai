# Dynasty Fantasy Football: Algorithm Research Reference

**Research Date:** January 2026  
**Purpose:** Comprehensive analysis of player valuation algorithms, ML approaches, and improvement opportunities for dynasty fantasy football

---

## Document Index

| Document | Description |
|----------|-------------|
| [Dynasty Valuation Algorithms](./dynasty-valuation-algorithms.md) | VBD foundations, dynasty-specific methods, major platform approaches |
| [Machine Learning Models](./machine-learning-models.md) | ML architectures, feature engineering, ensemble methods, RL optimization |
| [Trade Value Systems](./trade-value-systems.md) | KTC, DynastyProcess, FantasyCalc methodologies and formulas |
| [Age Curves & Metrics](./age-curves-and-metrics.md) | Position-specific aging, efficiency metrics, advanced analytics |
| [Uncertainty & Monte Carlo](./uncertainty-and-monte-carlo.md) | Simulation methods, Bayesian approaches, risk adjustment |
| [Implementation Roadmap](./implementation-roadmap.md) | Actionable recommendations for Quantasy codebase |

---

## Executive Summary

### Current State of Our Implementation

| Component | Status | Gap |
|-----------|--------|-----|
| VBD Algorithm | Complete | No dynasty adjustments (age, career trajectory) |
| Trade Calculator | Basic | Missing draft picks, age factors, market sentiment |
| Monte Carlo | Solid | Missing correlations, Bayesian updating |
| Age Curves | None | Position-specific curves needed |
| Draft Pick Values | None | Exponential decay + hit rates needed |
| ML Projections | None | Ridge + ensemble system opportunity |

### Key Research Findings

1. **Simple models win**: Ridge regression consistently outperforms complex neural nets for fantasy projections
2. **Feature engineering > model complexity**: 50+ well-chosen features matter more than architecture
3. **Age is the #1 dynasty factor**: Exponential decay curves are universal across platforms
4. **Uncertainty matters**: Confidence intervals enable better decision-making
5. **Bayesian updating works**: Prior (ADP) + weekly data = posterior projections
6. **RL shows promise**: 4-40% improvement demonstrated for optimization problems

### Highest Impact Improvements

1. **Add age curves to VBD** - Transform redraft VBD into dynasty-aware valuation
2. **Implement draft pick valuation** - Exponential decay with hit rate modeling
3. **Build ML projection system** - Ridge + XGBoost ensemble with uncertainty
4. **Integrate market sentiment** - KTC/DynastyProcess API for real-time values

---

## Research Sources

### External Platforms Analyzed
- FantasyPros (VBD methodology, ECR)
- KeepTradeCut (crowdsourced Elo system)
- DynastyProcess (open-source algorithms)
- FantasyCalc (2.4M+ trade database)
- PlayerProfiler (lifetime value engine)
- Dynasty Nerds (valuation guides)
- PFF (age curves, efficiency metrics)
- 4for4 (production curves)

### Academic & Technical Sources
- Stanford RL research (Q-learning for DFS)
- Cornell game theory analysis
- Fantasy Football Analytics (Bayesian methods)
- arXiv papers on RL for fantasy sports
- GitHub open-source implementations

### Our Codebase Analysis
- `src/lib/algorithms/vbd.ts` - VBD implementation
- `src/lib/algorithms/trade.ts` - Trade evaluation
- `src/lib/algorithms/monte-carlo/` - Draft simulation
- `src/lib/algorithms/baselines.ts` - Position baselines
- `src/lib/algorithms/flex.ts` - FLEX position handling

---

## Quick Reference: Core Formulas

### Dynasty Total Value
```
V_total = Σ(t=0 to n) [VBD_t × P(survival)_t] / (1 + r)^t
```

### DynastyProcess Exponential Decay
```
Value = 10500 × e^(-0.0235 × ECR)
```

### Age Factor Calculation
```
AgeFactor = e^(-decay × |age - peakAge|)
```

### Trade Fairness Score
```
FairnessScore = ((receivingValue - givingValue) / maxAbs) × 100
```

---

## Navigation

- Start with [Dynasty Valuation Algorithms](./dynasty-valuation-algorithms.md) for foundational concepts
- See [Machine Learning Models](./machine-learning-models.md) for AI/ML approaches
- Check [Implementation Roadmap](./implementation-roadmap.md) for actionable next steps
