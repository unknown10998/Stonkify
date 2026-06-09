import { create } from 'zustand';

export interface TourStep {
  title: string;
  body: string;
  target: string | null;
  tab?: 'assets' | 'news' | 'bets' | 'trades' | 'leaderboard' | 'achievements';
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Stonkify',
    body: "You start with $10,000 and 10 real-world stocks to trade. The goal: grow your wealth without getting wiped out. This tour takes under a minute — the market keeps running so you can interact with each section as it's explained.",
    target: null,
  },
  {
    title: 'Your Risk Dashboard',
    body: "The left panel is your survival headquarters:\n\n• Net Worth — your total value in real time\n• Market Phase — BULL / BEAR / PANIC / EUPHORIA\n• Sentiment Meter — market fear vs greed\n• Risk Indicators — volatility, crash probability, liquidity\n• Risk Radar — a 3D nodes graph showing your 5 risk dimensions. Bigger & redder nodes mean danger. Drag it to rotate.\n\nIf Crash Probability spikes above 60% — hedge NOW.",
    target: 'dashboard',
  },
  {
    title: 'The Stock Market',
    body: "You have 10 real stocks across 4 categories:\n\nSTABLE (TLT, XLU) — Slow, safe. Treasury bonds & utilities. Park cash here during panics.\n\nGROWTH (NVDA, MSFT, AMZN) — Trend-driven. AI, cloud, e-commerce. Ride momentum but watch reversals.\n\nMEME (GME, AMC, PLTR) — Casino-mode. Can rally 200% or crash 80% in minutes.\n\nEVENT (XOM, GLD) — Reacts explosively to news. Oil, gold. Unpredictable but profitable.",
    target: 'market-panel',
    tab: 'assets',
  },
  {
    title: 'Stock Details — Click to Expand',
    body: "Every stock card has a small ↗ expand button in the top-right corner. Click it to open the full Stock Detail modal, which shows:\n\n• A larger price chart for the session\n• Session high, low, and % change\n• A real AI-generated description of the company (powered by Gemini)\n• Full trading controls — buy, sell, short, cover\n• Stop-loss and take-profit settings\n• Category-specific trading tips\n\nUse this modal to research before committing to a position.",
    target: 'market-panel',
    tab: 'assets',
  },
  {
    title: 'How to Buy, Sell & Short',
    body: "Each stock card (and the detail modal) has 4 actions:\n\n• BUY — Go long. Profit if the price rises.\n• SELL — Close your long position and realize P&L.\n• SHORT — Bet the price will fall. Profit if it drops.\n• COVER — Close your short position.\n\nSet a quantity and leverage (2×/5×/10×) before trading.\nUse Stop-Loss to auto-sell if price drops too far.\nUse Take-Profit to lock in gains automatically.",
    target: 'market-panel',
    tab: 'assets',
  },
  {
    title: 'News Feed — The Market Moves Here',
    body: "Real market-moving events fire every few ticks:\n\n• Fed raises rates → Growth & Meme stocks tank\n• Meme stock goes viral → Could 3× overnight\n• Flash crash → Everything drops simultaneously\n• AI breakthrough → Growth sector surges\n\nEvent stocks (XOM, GLD) react the hardest and fastest to news. Check this tab after every tick.",
    target: 'market-panel',
    tab: 'news',
  },
  {
    title: 'Prediction Bets — Bonus Multipliers',
    body: "Place short-term bets on market direction:\n\n• Market Up / Down → 1.8× payout (resolves in 5 ticks)\n• Stock Up → 3× payout on a specific stock (8 ticks)\n• Crash Bet → 8× if market enters PANIC within 10 ticks\n\nBets cost real money if wrong. Never bet more than 10% of your portfolio on a single prediction.",
    target: 'market-panel',
    tab: 'bets',
  },
  {
    title: 'Trade History',
    body: "Every trade you make is logged here in real time:\n\n• Ticker, action type (buy / sell / short / cover)\n• Entry price, shares, and total value\n• Realized P&L on closes — green if profitable, red if not\n\nUse this tab to review your decisions and spot patterns. Did you buy high and sell low? The history doesn't lie.",
    target: 'market-panel',
    tab: 'trades',
  },
  {
    title: 'Leaderboard',
    body: "Your best score is saved automatically at the end of every session.\n\nThe leaderboard is filtered by game mode — Endless, Timed, and Survival — so you're always competing on a level playing field.\n\nBeat your personal best or climb above the NPCs. The top spot is yours to take.",
    target: 'market-panel',
    tab: 'leaderboard',
  },
  {
    title: 'Achievements',
    body: "31 achievements across 7 categories:\n\n• Wealth — Double, 10×, Millionaire, God of Markets\n• Survival — Diamond Hands (100 ticks), Veteran, Legend\n• Trading — First Trade, Active Trader, Day Trader\n• Shorts — First Short, Short King ($10k profit)\n• Risk — Leverage Lord, All In, Margin Survivor\n• Bets — Crash Prophet, Big Winner\n• Secret — one achievement requires $10,000,000 net worth\n\nNew unlocks appear as toast notifications mid-game.",
    target: 'market-panel',
    tab: 'achievements',
  },
  {
    title: 'AI Risk Advisor',
    body: "That cyan button at the bottom-right opens your AI advisor (powered by Gemini). It gives strategic warnings every 8 ticks and you can ask it anything:\n\n• \"What should I buy?\"\n• \"Is my risk too high?\"\n• \"What is a short squeeze?\"\n• \"How am I doing?\"\n\nThe advisor knows your live portfolio state and market conditions.",
    target: 'chat-button',
  },
  {
    title: "You're Ready. Now Trade.",
    body: "3 survival rules:\n1. Never put more than 30% in meme stocks\n2. Always keep at least 20% cash for emergencies\n3. Set stop-losses on every leveraged position\n\nYour goal: outlast the market, grow your $10,000, and top the leaderboard. Good luck.",
    target: null,
  },
];

interface TourStore {
  isActive: boolean;
  step: number;
  hasSeenTour: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

export const useTourStore = create<TourStore>((set, get) => ({
  isActive: false,
  step: 0,
  hasSeenTour: false,
  startTour: () => set({ isActive: true, step: 0 }),
  nextStep: () => {
    const { step } = get();
    if (step >= TOUR_STEPS.length - 1) set({ isActive: false, hasSeenTour: true });
    else set({ step: step + 1 });
  },
  prevStep: () => set(s => ({ step: Math.max(0, s.step - 1) })),
  endTour: () => set({ isActive: false, hasSeenTour: true }),
}));
