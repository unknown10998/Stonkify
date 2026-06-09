# Stonkify

A browser-based stock market simulation game where real trading mechanics meet casino-style intensity. Start with $10,000 in virtual capital and grow your wealth by trading stocks, reacting to breaking news, managing risk, and placing prediction bets — all without risking real money.

---

## Features

### Three Game Modes
| Mode | Description |
|------|-------------|
| **Endless** | Build wealth with no time limit |
| **Timed** | Maximize net worth in exactly 60 ticks |
| **Survival** | Survive brutal volatility without liquidation |

### Asset Classes
- **Index ETFs** (SPY, QQQ, VTI) — low volatility, trend-following
- **Stable Assets** (TLT, XLU) — bonds & utilities; safe during crashes
- **Growth Stocks** (NVDA, MSFT, AMZN, TSLA) — high volatility, sentiment-driven
- **Meme Stocks** (GME, AMC, PLTR, COIN) — extreme swings with a 5% chance of a ±15% casino spike per tick
- **Event-Driven** (XOM, GLD) — react hard to geopolitical and commodity news

Start with 12 assets and expand your portfolio with 20+ additional tickers via the "Add More Stocks" button.

### Dynamic Market Simulation
- **Market Phases:** Bull, Bear, Sideways, Panic, Euphoria
- **Price Engine:** Gaussian random walk with drift from global sentiment, momentum, and news shocks
- **Global Sentiment:** −1 to +1 scale that shifts with market events
- **Real Prices:** Live data fetched from the Finnhub API at game start (falls back gracefully if key is missing)

### Trading & Risk Management
- Buy, sell, short, and cover positions across all asset classes
- Set **stop-loss** and **take-profit** orders per asset
- Use **leverage** (1×–5×+) for amplified exposure
- Live **Risk Dashboard** showing:
  - Volatility Score (0–100)
  - Crash Probability
  - Liquidity Health
  - Leverage Ratio
  - Portfolio Exposure pie chart

### News & Market Events
Five event types — Macro (Fed actions), Sector (AI breakthroughs), Hype (viral memes), Black Swan (crashes), and Earnings — drive price movements. Earnings hits land 5× harder on their specific ticker.

### Prediction Betting
| Bet | Payout | Condition |
|-----|--------|-----------|
| Market Up | 1.8× | Sentiment rises in 5 ticks |
| Market Down | 1.8× | Sentiment falls in 5 ticks |
| Stock Up | 3× | Target stock outperforms in 8 ticks |
| Crash Bet | 8× | Market enters PANIC in 10 ticks |

### AI Risk Advisor (Gemini)
- **Chat Modal:** Ask the AI advisor questions about your portfolio in plain English
- **Auto-Generated Feed:** Context-aware bullish/bearish/warning messages based on live portfolio state
- Powered by **Google Gemini 2.5 Flash**; degrades gracefully if the key is missing

### Achievements
40+ achievements across 7 categories: wealth milestones, survival, market phases, trading activity, short selling, leverage/risk, and prediction bets. A secret **God of Markets** achievement unlocks at $10M net worth.

### Leaderboard & Persistence
All game state — leaderboard, achievements, trade history, price seeds — persists via `localStorage`. No backend required.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| State | Zustand 4 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| AI Advisor | Google Generative AI (Gemini 2.5 Flash) |
| Live Prices | Finnhub API |

---

## Getting Started

### Prerequisites
- Node.js 18+
- (Optional) [Finnhub API key](https://finnhub.io) — free tier
- (Optional) [Google AI Studio API key](https://aistudio.google.com) — free tier

### Installation

```bash
git clone https://github.com/unknown10998/stonkify.git
cd stonkify
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_FINNHUB_API_KEY=your_finnhub_key_here
```

Both keys are optional. Without them, the game uses hardcoded fallback prices and disables the AI advisor.

### Run

```bash
# Development server
npm run dev
# Open http://localhost:5173

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Project Structure

```
src/
├── App.tsx                  # App router (auth → menu → game → game over)
├── types.ts                 # TypeScript interfaces
├── config.ts                # API key configuration
├── components/              # UI components (AssetCard, BettingPanel, RiskDashboard, ...)
├── screens/                 # Full-page views (Auth, Menu, Game, GameOver)
├── store/                   # Zustand stores (game, auth, settings, notifications, ...)
├── engine/                  # Core game logic
│   ├── marketEngine.ts      # Price simulation & market phase transitions
│   ├── newsEngine.ts        # Event generation & AI advisor messages
│   ├── achievementEngine.ts # Achievement definitions & unlock logic
│   └── soundEngine.ts       # Web Audio API (music & SFX)
├── services/
│   └── stockService.ts      # Finnhub API integration
└── hooks/
    └── useBackgroundMusic.ts
```

---

## Gameplay Loop

1. **Create an account** (stored locally)
2. **Choose a mode** — Endless, Timed, or Survival
3. **Trade stocks** — buy, sell, short, or cover with optional SL/TP and leverage
4. **React to news** — events shift sentiment and spike individual tickers
5. **Place bets** — predict market direction for bonus payouts
6. **Consult the AI advisor** — get real-time portfolio analysis from Gemini
7. **Survive or maximize wealth** until the game ends
8. **Review results** — final P&L, new achievements, and updated leaderboard

Every tick (0.2–2 seconds depending on speed setting), prices update, bets resolve, stop-losses trigger, and market phases can shift.

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `stonkify-auth` | User accounts |
| `stonkify_save_{playerName}` | Active game session |
| `stonkify_npc_leaderboard` | Global leaderboard |
| `stonkify_price_seeds` | Last 10 ticks of price history |
| `stonkify_news_archive` | Last 10 news events |
| `stonkify_achievements` | Globally unlocked achievements |

---

## License

MIT
