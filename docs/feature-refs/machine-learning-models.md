# Machine Learning Models for Fantasy Football

**Research Date:** January 2026

---

## 1. Player Projection Models

### Best Performing Architectures

Research consistently shows simpler models outperform complex architectures:

| Model | Accuracy | Complexity | Best Use Case |
|-------|----------|------------|---------------|
| **Ridge Regression** | Highest | Low | All positions, baseline |
| **Elastic Net** | High | Low | Feature selection |
| **XGBoost** | High | Medium | Non-linear patterns, floor/ceiling |
| **LightGBM** | High | Medium | Categorical features, matchups |
| **Random Forest** | Medium | Medium | Feature importance |
| **Neural Networks** | Medium | High | Sequential patterns |
| **LSTM** | Medium | High | Hot streaks, momentum |
| **Transformers** | High | Very High | Long-range dependencies |

**Key Finding:** Ridge regression consistently achieved lowest RMSE compared to even professional projections (FantasyData.com benchmarks).

### Feature Engineering (Critical)

**Volume Metrics (Most Predictive):**
```python
volume_features = [
    'target_share',           # Targets / Team Targets
    'rush_share',             # Rushes / Team Rushes
    'snap_count',             # Offensive snaps played
    'snap_percentage',        # Snaps / Team Snaps
    'red_zone_opportunities', # RZ targets + RZ carries
    'goal_line_carries',      # Carries inside 5 yards
    'route_participation',    # Routes / Team Routes
    'air_yards_share',        # Air Yards / Team Air Yards
]
```

**Efficiency Metrics:**
```python
efficiency_features = [
    'yards_per_route_run',    # YPRR - "holy grail" for WRs
    'first_downs_per_route',  # 1D/RR - more stable than YPRR
    'yards_after_contact',    # YAC for RBs
    'separation_score',       # PFF separation metric
    'catch_rate',             # Receptions / Targets
    'yards_per_target',       # Receiving yards / Targets
    'yards_per_carry',        # Rushing yards / Carries
    'broken_tackle_rate',     # Broken tackles / Attempts
]
```

**Contextual Features:**
```python
context_features = [
    'vegas_game_total',       # Over/under (correlates with scoring)
    'team_implied_total',     # Team's expected points
    'opponent_dvoa',          # Defensive efficiency
    'opponent_position_rank', # Points allowed to position
    'home_away',              # Boolean indicator
    'weather_wind_speed',     # Critical when > 15mph
    'weather_precipitation',  # Rain/snow indicator
    'dome_indicator',         # Indoor game
]
```

**Temporal Features (Three Time Windows):**
```python
temporal_features = [
    # Season-to-date (stability)
    'season_avg_points',
    'season_avg_targets',
    'season_avg_yards',
    
    # Recent form (4-game rolling)
    'rolling_4_avg_points',
    'rolling_4_std_points',
    'rolling_4_avg_targets',
    
    # Previous week (lag)
    'prev_week_points',
    'prev_week_targets',
    'prev_week_snap_pct',
]
```

### Training Data Requirements

**Minimum Requirements:**
- 2+ seasons of historical data
- 50+ statistical features per player
- Consistent player ID mapping across sources

**Recommended Data Sources:**
- NFL play-by-play: nflverse/nflfastR
- Player stats: Sleeper API, FantasyData API
- Advanced metrics: PFF, Next Gen Stats
- Vegas lines: ESPN, DraftKings

### Model Validation

**Critical:** Use time-series cross-validation, NOT random split.

```python
# WRONG - data leakage
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

# CORRECT - respect temporal order
from sklearn.model_selection import TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5)
for train_idx, test_idx in tscv.split(X):
    # Train on past, test on future
    X_train, X_test = X[train_idx], X[test_idx]
```

---

## 2. Ensemble Methods (Production Standard)

### Stacking Architecture

```
Level 0 (Base Models):
├── Ridge Regression
│   └── Best for: Linear relationships, baseline predictions
├── XGBoost
│   └── Best for: Non-linear patterns, handling missing data
├── LightGBM
│   └── Best for: Categorical features (team, opponent)
└── Neural Network (optional)
    └── Best for: Sequential patterns, player momentum

Level 1 (Meta-Learner):
└── Ridge Regression
    └── Learns which base model to trust per situation
```

### Implementation

```python
from sklearn.ensemble import StackingRegressor
from sklearn.linear_model import Ridge
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

# Define base models
base_models = [
    ('ridge', Ridge(alpha=1.0)),
    ('xgb', XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=6)),
    ('lgbm', LGBMRegressor(n_estimators=100, learning_rate=0.05)),
]

# Define meta-learner
meta_learner = Ridge(alpha=1.0)

# Create stacking ensemble
stacking_model = StackingRegressor(
    estimators=base_models,
    final_estimator=meta_learner,
    cv=5  # Cross-validation to prevent overfitting
)

# Train and predict
stacking_model.fit(X_train, y_train)
predictions = stacking_model.predict(X_test)
```

### Blending (Simpler Alternative)

```python
# Weighted average based on historical accuracy
def blend_predictions(ridge_pred, xgb_pred, lgbm_pred):
    return (
        ridge_pred * 0.35 +
        xgb_pred * 0.35 +
        lgbm_pred * 0.30
    )
```

---

## 3. Reinforcement Learning for Optimization

### Proven Applications

| Application | Algorithm | Improvement |
|-------------|-----------|-------------|
| DFS Lineup | Deep Q-Network | Optimal lineup policies |
| Draft Picks | Q-Learning | 4% over best-available |
| Team Selection | PPO | 39.5% over traditional |

### Draft Decision Agent Architecture

**Environment:**
```python
class DraftEnvironment(gym.Env):
    def __init__(self, players, num_teams, roster_slots):
        self.players = players
        self.num_teams = num_teams
        self.roster_slots = roster_slots
        
        # State: available players, roster composition, pick position
        self.observation_space = spaces.Dict({
            'available': spaces.MultiBinary(len(players)),
            'roster': spaces.MultiDiscrete([len(players)] * sum(roster_slots.values())),
            'pick_number': spaces.Discrete(num_teams * sum(roster_slots.values())),
        })
        
        # Action: which player to draft
        self.action_space = spaces.Discrete(len(players))
    
    def step(self, action):
        player = self.players[action]
        reward = self._calculate_reward(player)
        # ... simulate other teams picking
        return observation, reward, done, info
    
    def _calculate_reward(self, player):
        # Reward = expected fantasy points over replacement
        return player.projected_points - self._get_replacement_value(player.position)
```

**Training:**
```python
from stable_baselines3 import DQN

model = DQN(
    "MlpPolicy",
    env,
    learning_rate=1e-4,
    buffer_size=100000,
    learning_starts=1000,
    batch_size=32,
    gamma=0.99,
    verbose=1
)

model.learn(total_timesteps=500000)
```

### Lineup Optimization (Linear Programming)

```python
from pulp import LpMaximize, LpProblem, LpVariable, lpSum

def optimize_lineup(players, salary_cap, roster_constraints):
    prob = LpProblem("Fantasy_Lineup", LpMaximize)
    
    # Decision variables: 1 if player selected, 0 otherwise
    player_vars = {p.id: LpVariable(f"player_{p.id}", cat='Binary') 
                   for p in players}
    
    # Objective: maximize projected points
    prob += lpSum([player_vars[p.id] * p.projected_points for p in players])
    
    # Constraint: salary cap
    prob += lpSum([player_vars[p.id] * p.salary for p in players]) <= salary_cap
    
    # Constraint: position requirements
    for position, (min_count, max_count) in roster_constraints.items():
        position_players = [p for p in players if p.position == position]
        prob += lpSum([player_vars[p.id] for p in position_players]) >= min_count
        prob += lpSum([player_vars[p.id] for p in position_players]) <= max_count
    
    prob.solve()
    
    return [p for p in players if player_vars[p.id].value() == 1]
```

---

## 4. Devy/Rookie Projection Models

### Key "Alpha" Features

```python
devy_features = [
    # Market Share (adjusts for offensive system)
    'market_share_yards',      # Player yards / Team yards
    'market_share_tds',        # Player TDs / Team TDs
    
    # Efficiency Metrics
    'yards_per_team_pass_att', # YPTPA - "Holy Grail" for WRs
    'dominator_rating',        # Fantasy share vs. teammates
    
    # Development Indicators
    'breakout_age',            # Age at first 20%+ dominator rating
    'recruiting_stars',        # 247Sports composite
    'draft_capital',           # Expected or actual draft position
    
    # Athletic Metrics
    'speed_score',             # 40 time weighted by body weight
    'burst_score',             # Vertical + broad jump
    'agility_score',           # 3-cone + shuttle
]
```

### Quantile Regression for Uncertainty

```python
from sklearn.ensemble import GradientBoostingRegressor

# Predict range of outcomes instead of single point
quantiles = [0.1, 0.25, 0.5, 0.75, 0.9]
models = {}

for q in quantiles:
    models[q] = GradientBoostingRegressor(
        loss='quantile',
        alpha=q,
        n_estimators=100
    )
    models[q].fit(X_train, y_train)

# Get prediction intervals
predictions = {q: models[q].predict(X_test) for q in quantiles}
# predictions[0.1] = 10th percentile (floor)
# predictions[0.9] = 90th percentile (ceiling)
```

---

## 5. Model Evaluation Metrics

### Standard Metrics

```python
from sklearn.metrics import mean_squared_error, mean_absolute_error

# RMSE - penalizes large errors
rmse = np.sqrt(mean_squared_error(y_true, y_pred))

# MAE - more interpretable
mae = mean_absolute_error(y_true, y_pred)

# Coverage Probability - for prediction intervals
def coverage_probability(y_true, y_lower, y_upper):
    covered = (y_true >= y_lower) & (y_true <= y_upper)
    return covered.mean()

# Win Rate - for lineup optimization
def win_rate(my_lineups, opponent_lineups):
    wins = sum(my.total_points > opp.total_points 
               for my, opp in zip(my_lineups, opponent_lineups))
    return wins / len(my_lineups)
```

### Feature Importance with SHAP

```python
import shap

explainer = shap.TreeExplainer(xgb_model)
shap_values = explainer.shap_values(X_test)

# Summary plot shows feature importance
shap.summary_plot(shap_values, X_test, feature_names=feature_names)

# Individual prediction explanation
shap.force_plot(explainer.expected_value, shap_values[0], X_test.iloc[0])
```

---

## 6. Recommended Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| **Data Pipeline** | nflverse, Sleeper API | Best NFL data sources |
| **Feature Engineering** | pandas, polars | Fast data manipulation |
| **ML Training** | scikit-learn | Production-proven, simple |
| **Gradient Boosting** | XGBoost, LightGBM | State-of-the-art tabular |
| **Deep Learning** | PyTorch | RL agents, neural nets |
| **Optimization** | PuLP, OR-Tools | Lineup optimization |
| **Explainability** | SHAP | Feature importance |
| **Hyperparameter Tuning** | Optuna | Efficient search |

---

## 7. Open-Source Resources

| Repository | Focus | Key Insight |
|------------|-------|-------------|
| [zzhangusf/fantasy-ml](https://github.com/zzhangusf/Predicting-Fantasy-Football-Points-Using-Machine-Learning) | Projections | Ridge beats complex models |
| [cbratkovics/fantasy-football-ai](https://github.com/cbratkovics/fantasy-football-ai) | Production ML | 100+ engineered features |
| [stranger9977/RLFantasyFootball](https://github.com/stranger9977/rlfantasyfootball) | Draft RL | DQN for draft optimization |
| [ffverse/ffopportunity](https://github.com/ffverse/ffopportunity) | Expected Points | XGBoost xFP model |
| [ashhhlynn/custom-fantasy-optimizer](https://github.com/ashhhlynn/custom-fantasy-optimizer) | Lineup Opt | PuLP linear programming |
