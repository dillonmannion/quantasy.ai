# 🏈 Quantasy Stage 1: MVP of the MVP
## FINAL IMPLEMENTATION PLAN

---

## ✅ Confirmed Decisions

| # | Decision | Status |
|----|-----------|---------|
| 1 | **Fly.io + Supabase** ($3-10/mo total) | ✅ Confirmed |
| 2 | **Algorithms: Tier 1 → Tier 2** (Simple → Advanced) | ✅ Confirmed |
| 3 | **Live Scoring: ESPN Hidden API** (Free, simple polling) | ✅ Confirmed |
| 4 | **Data: nflverse (historical) + Sleeper (league)** | ✅ Confirmed |
| 5 | **Landing: Balatro-esque** - score increase / kaching aesthetics | ✅ Confirmed |
| 6 | **Transparency: "Show Your Work"** panels for all algorithms | ✅ Confirmed |
| 7 | **Tier 3 Future: Audio/NLP/FantasyCalc** (after solid state) | ✅ Confirmed |
| 8 | **Alpha Testing: 5-10 friends, 8-week timeline** | ✅ Confirmed |

---

## 🎨 Balatro-Esque Design System

### Visual Philosophy
Inspired by Balatro's satisfying visual feedback:
- **Card reveals** with dramatic animations
- **Score pop-ups** with satisfying "kaching!" effects
- **Winnings multipliers** visualized
- **Streak counters** with flame/bonus animations
- **Progression bars** that fill dramatically
- **Particle effects** for algorithmic wins
- **Screen shake** on big recommendations
- **Juice** everywhere - micro-interactions feel great

### Color Palette (Balatro-Inspired)

```typescript
// tailwind.config.ts
const colors = {
  background: '#1a1a2e',      // Dark purple-black
  card: '#2d2d44',            // Card backing
  accent: '#ff6b6b',            // Victory red
  gold: '#ffd700',               // Ka-ching gold
  success: '#4ade80',            // Success green
  info: '#4facfe',              // Info blue
  warning: '#ffa502',            // Warning orange
  purple: '#a855f7',            // Mystical purple
  pink: '#ec4899',             // Bonus pink
}

export default {
  theme: {
    extend: {
      colors,
      animation: {
        'bounce-x': 'bounceX 0.5s',
        'kaching': 'kaching 0.8s',
        'score-pop': 'scorePop 0.6s',
        'card-flip': 'cardFlip 0.4s',
        'win-pulse': 'winPulse 1s',
      },
      keyframes: {
        kaching: {
          '0%': { transform: 'scale(1)', opacity: '0' },
          '50%': { transform: 'scale(1.5)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0', translateY: '-20px' },
        },
        scorePop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        winPulse: {
          '0%, 100%': { boxShadow: '0 0 0 transparent' },
          '50%': { boxShadow: '0 0 30px rgba(255, 215, 0, 0.8)' },
        },
      },
    },
  },
}
```

### UI Components with "Juice"

#### Ka-Ching Score Popup
```tsx
// components/landing/kaching-popup.tsx
import { motion, AnimatePresence } from 'framer-motion';

interface KachingProps {
  points: number;
  multiplier?: number;
  show: boolean;
}

export function KachingPopup({ points, multiplier = 1, show }: KachingProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, y: -100 }}
          transition={{ type: 'spring', bounce: 0.6 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <div className="relative">
            {/* Floating coins */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: (i - 2) * 60 + Math.random() * 30,
                  y: -50 - Math.random() * 50,
                  opacity: 0,
                  rotate: Math.random() * 360 - 180,
                }}
                transition={{ delay: i * 0.05, duration: 1 }}
                className="absolute text-4xl"
              >
                🪙
              </motion.div>
            ))}

            {/* Main score popup */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl px-12 py-8 shadow-2xl border-4 border-yellow-300"
            >
              <div className="text-6xl font-black text-center">
                {multiplier > 1 && (
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-purple-600 mr-2"
                  >
                    {multiplier}x
                  </motion.span>
                )}
                +{points}
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1.2, rotate: [0, -10, 10, -5, 0] }}
                  className="inline-block ml-2"
                >
                  🎰
                </motion.span>
              </div>
              {multiplier > 1 && (
                <div className="text-xl font-bold text-purple-700 text-center mt-2">
                  WINNING STREAK!
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### Draft Pick Card (Balatro Style)
```tsx
// components/draft/player-card-pick.tsx
import { motion, useMotionValue } from 'framer-motion';

interface PlayerCardProps {
  player: Player;
  vbdScore: number;
  rank: number;
  onPick?: () => void;
}

export function PlayerCardPick({ player, vbdScore, rank, onPick }: PlayerCardProps) {
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);

  // Card flip animation
  return (
    <motion.div
      style={{ scale, rotate }}
      whileHover={{ scale: 1.05, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onPick}
      className="relative bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 cursor-pointer shadow-2xl border-2 border-yellow-400 overflow-hidden"
    >
      {/* Shimmer effect */}
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      {/* VBD Badge */}
      {vbdScore > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 -right-3 bg-yellow-400 text-black font-bold rounded-full px-3 py-1 shadow-lg"
        >
          +{vbdScore.toFixed(1)} VBD
        </motion.div>
      )}

      {/* Player Info */}
      <div className="relative z-10">
        <div className="text-yellow-300 text-sm mb-1">
          #{rank}
        </div>
        <div className="text-3xl font-black text-white mb-2">
          {player.name}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xl text-blue-200">
            {player.team} • {player.position}
          </span>
          <motion.span
            animate={{ rotate: [0, 10, -10, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl"
          >
            {player.position === 'QB' && '🏈'}
            {player.position === 'RB' && '🏃'}
            {player.position === 'WR' && '🤸'}
            {player.position === 'TE' && '🤝'}
          </motion.span>
        </div>
      </div>

      {/* Corner decorations (Balatro style) */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-yellow-400 rounded-tl-lg" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-yellow-400 rounded-tr-lg" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-yellow-400
rounded-bl-lg" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-yellow-400 rounded-br-lg" />
    </motion.div>
  );
}
```

#### Trade Success Animation
```tsx
// components/trade/trade-success.tsx
export function TradeSuccess({ valueGain, fairness }: { valueGain: number; fairness: number })
{
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div className="text-center">
        {/* Spinning card */}
        <motion.div
          animate={{ rotate: [0, 360, 720] }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="text-9xl mb-8"
        >
          🃏
        </motion.div>

        {/* Success text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-5xl font-black text-yellow-400 mb-4">
            FAIR TRADE!
          </div>
          <div className="text-2xl text-white mb-6">
            <span className="text-green-400 font-bold">+{valueGain}</span>
            {' '}points gained
          </div>

          {/* Kaching particles */}
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            className="text-4xl"
          >
            💰 KACHING! 💰
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
```

---

## 📊 Updated Landing Page (Balatro-Style)

```tsx
// app/routes/_index.tsx
import { motion } from 'framer-motion';
import { Link } from '@remix-run/react';
import { KachingPopup } from '~/components/landing/kaching-popup';
import { useState } from 'react';

export default function Index() {
  const [showKaching, setShowKaching] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">

      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -20, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              repeat: Infinity,
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
            }}
            className="absolute text-6xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            {['🏈', '🪙', '🎰', '⚡'][Math.floor(Math.random() * 4)]}
          </motion.div>
        ))}
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Title with pop-in effect */}
          <div className="mb-12">
            <motion.h1
              initial={{ scale: 0, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 mb-4"
            >
              QUANTASY
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl text-gray-300 mb-8"
            >
              Draft smarter. Trade fairer. Win bigger.
            </motion.p>
          </div>

          {/* Enter Button with hover effects */}
          <Link to="/auth/login">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowKaching(true)}
              className="relative bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black font-black text-2xl py-6 px-16 rounded-2xl shadow-2xl border-4 border-yellow-300 overflow-hidden"
            >
              {/* Shimmer on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />

              <span className="relative z-10 flex items-center gap-3">
                ENTER <motion.span animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 2 }}>🎰</motion.span> QUANTASY
              </span>

              {/* Corner decorations */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-yellow-300" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-yellow-300" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-yellow-300" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-yellow-300" />
            </motion.button>
          </Link>

          {/* What You'll See Cards */}
          <div className="grid md:grid-cols-4 gap-6 mt-20">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 100, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.5 + i * 0.15, type: 'spring' }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl relative overflow-hidden"
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />

                <div className="relative z-10">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>

                  {/* VBD badge preview */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.15 }}
                    className="mt-4 bg-purple-600 text-yellow-300 text-sm font-bold rounded-lg
px-3 py-1 inline-block"
                  >
                    +{(i + 1) * 127} VBD
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Kaching popup */}
      <KachingPopup
        show={showKaching}
        points={420}
        multiplier={2}
        onClose={() => setShowKaching(false)}
      />
    </div>
  );
}

const features = [
  {
    title: "Draft Assistant",
    description: "VBD-based picks with full transparency",
    icon: "🎯",
  },
  {
    title: "Trade Calculator",
    description: "Multi-factor analysis reveals fair deals",
    icon: "⚖️",
  },
  {
    title: "Waiver Wire",
    description: "ML-powered recommendations + FAAB bids",
    icon: "⚡",
  },
  {
    title: "Live Scores",
    description: "Real-time updates with kaching celebrations",
    icon: "🏆",
  },
];
```

---

## 📅 Final 8-Week Roadmap

### Week 1: Foundation + Balatro Landing ✨
- [ ] Initialize Remix + TypeScript
- [ ] Set up Fly.io deployment
- [ ] Configure Tailwind with Balatro color palette
- [ ] Implement Framer Motion animations library
- [ ] Integrate Clerk authentication
- [ ] **Build Balatro-style landing page**
  - [ ] Hero section with pop-in effects
  - [ ] Floating background elements
  - [ ] "Enter Quantasy" button with shimmer
  - [ ] Feature cards with flip animations
  - [ ] Kaching popup on CTA click
- [ ] Set up Supabase database
- [ ] Deploy to Fly.io
- [ ] **Cost Check**: <$5/mo verified

### Week 2: Dashboard + Data Layer 📊
- [ ] Build dashboard with tool grid
- [ ] Implement Sleeper API client
- [ ] Set up Redis cache (Fly.io)
- [ ] Create nflverse Python client
- [ ] Build "Connect League" flow
- [ ] Add Balatro-style animations to dashboard
  - [ ] Score pop-ups on actions
  - [ ] Streak counters
  - [ ] Card flip effects
- [ ] Create mock data for testing
- [ ] Deploy and test with friend

### Week 3: Tier 1 Draft Algorithm 🎯
- [ ] Implement basic VBD calculation
- [ ] Integrate FantasyConsensus projections
- [ ] Build draft assistant UI
  - [ ] Player cards with VBD badges
  - [ ] Kaching effect on picks
  - [ ] Score counter animations
- [ ] Create draft board
- [ ] Add "Show Your Work" transparency panel
- [ ] Test with mock draft

### Week 4: Tier 1 Roster + Trade ⚖️
- [ ] Implement greedy lineup optimizer
- [ ] Build roster optimizer UI
- [ ] Create basic trade value calc
- [ ] Build trade calculator (drag-drop)
  - [ ] Card flip animations
  - [ ] Success celebration with kaching
  - [ ] Value gain popup
- [ ] Add transparency panels
- [ ] Test with Sleeper league

### Week 5: Tier 1 Waivers + Live Scores ⚡
- [ ] Implement waiver priority algorithm
- [ ] Build waiver recommendation list
  - [ ] Waiver pick animations
  - [ ] Streak counter for successful adds
- [ ] Integrate ESPN live scoring
  - [ ] Real-time score updates
  - [ ] Kaching on TDs/big plays
- [ ] Create injury dashboard
- [ ] Test Sunday scenarios

### Week 6: Tier 2 Advanced Algorithms 🧠
- [ ] Implement Expected VBD (Monte Carlo 1000 sims)
- [ ] Set up Python PuLP backend
- [ ] Create Python bridge service
- [ ] Implement multi-factor trade system
- [ ] Build EWI + FAAB prediction
- [ ] Add algorithm toggle (Simple/Advanced)
- [ ] Update animations for advanced mode

### Week 7: Transparency + Documentation 📝
- [ ] Create algorithm docs pages
- [ ] Build "Show Your Work" for all tools
- [ ] Add calculation breakdowns
- [ ] Implement nflverse attribution
- [ ] Add confidence intervals
- [ ] Create "How It Works" explainer

### Week 8: Alpha Testing + Polish 🚀
- [ ] Deploy production to Fly.io
- [ ] Invite 5-10 friends/family
- [ ] Run mock drafts (watch kaching celebrations!)
- [ ] Test trade scenarios
- [ ] Simulate waiver frenzy
- [ ] Test Sunday live scoring
- [ ] Collect feedback
- [ ] Optimize performance
- [ ] Mobile responsive audit
- [ ] **Celebrate completion!** 🎉🎰

---

## 📋 Final Complete File Structure

```
qai/
├── app/
│   ├── routes/
│   │   ├── _index.tsx                   # Balatro landing
│   │   ├── auth/
│   │   │   ├── _index.tsx               # Login (flashy)
│   │   │   └── callback.tsx
│   │   ├── dashboard.tsx                # Main dashboard
│   │   ├── draft/
│   │   │   ├── _index.tsx
│   │   │   ├── assistant.tsx           # Draft tool + kaching
│   │   │   ├── board.tsx
│   │   │   └── rankings.tsx
│   │   ├── roster/
│   │   │   ├── _index.tsx
│   │   │   └── optimize.tsx
│   │   ├── trade/
│   │   │   ├── _index.tsx
│   │   │   └── calculator.tsx           # Trade + kaching
│   │   └── waivers/
│   │       ├── _index.tsx
│   │       └── recommendations.tsx
│   └── root.tsx
├── server/
│   ├── loaders/
│   ├── actions/
│   ├── services/
│   │   ├── sleeper.ts
│   │   ├── nflverse.py
│   │   ├── espn_live.ts
│   │   ├── redis.ts
│   │   ├── supabase.ts
│   │   ├── projections/fantasyconsensus.ts
│   │   └── algorithms/
│   │       ├── tier1/
│   │       │   ├── vbd.ts
│   │       │   ├── lineup.ts
│   │       │   ├── trade.ts
│   │       │   └── waivers.ts
│   │       └── tier2/
│   │           ├── monte_carlo_vbd.py
│   │           ├── ilp_optimizer.py
│   │           ├── trade_advanced.ts
│   │           └── waivers_ml.py
│   └── middleware/
├── components/
│   ├── ui/                            # shadcn/ui
│   ├── landing/
│   │   ├── hero-section.tsx
│   │   ├── kaching-popup.tsx            # ✨ Balatro style
│   │   ├── feature-cards.tsx
│   │   └── login-card.tsx
│   ├── dashboard/
│   │   ├── tools-grid.tsx
│   │   ├── score-counter.tsx
│   │   └── streak-display.tsx
│   ├── draft/
│   │   ├── player-card-pick.tsx        # ✨ Flip animation
│   │   ├── vbd-badge.tsx
│   │   └── transparency-panel.tsx
│   ├── trade/
│   │   ├── trade-calculator.tsx
│   │   ├── trade-success.tsx            # ✨ Kaching success
│   │   └── value-breakdown.tsx
│   └── waivers/
│       ├── waiver-card.tsx
│       └── faab-bid.tsx
├── public/
│   ├── docs/                          # Algorithm transparency
│   │   ├── algorithms/
│   │   │   ├── vbd.md
│   │   │   ├── monte-carlo.md
│   │   │   ├── trade-value.md
│   │   │   └── waivers.md
│   │   ├── data-sources.md
│   │   └── attribution.md
│   └── images/
├── scripts/
│   ├── sync_nflverse.py
│   ├── cache_warmup.ts
│   └── deploy.sh
├── fly.toml
├── package.json
├── tsconfig.json
├── tailwind.config.ts                    # ✨ Balatro colors
└── README.md
```

---

## 🎯 Summary: What I Will Build

### Week 1-2: Foundation ✨
- Fly.io deployment with <$5/mo cost
- Balatro-style landing with kaching celebrations
- Flashy login modal
- Dashboard with animated tool grid
- Data layer (Sleeper + nflverse + ESPN)

### Week 3-5: Tier 1 Algorithms (Simple)
- VBD draft assistant with score pop-ups
- Greedy roster optimizer
- Basic trade calculator with flip animations
- Simple waiver recommendations
- ESPN live scoring with real-time updates

### Week 6-7: Tier 2 Algorithms (Advanced)
- Expected VBD with Monte Carlo (1000 sims)
- ILP optimizer via Python/PuLP
- Multi-factor trade system
- EWI + FAAB prediction
- Algorithm toggle (Simple/Advanced)

### Week 8: Alpha Testing
- Deploy to production
- Invite 5-10 friends
- Test all tools with Balatro-style celebrations
- Collect feedback for Stage 2
