import type { GameState } from '../types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Wealth ────────────────────────────────────────────────────────────────────
  { id: 'first_double',    name: 'To The Moon',       icon: '🚀', description: 'Doubled your starting cash' },
  { id: 'triple',          name: 'Hat Trick',         icon: '🎩', description: 'Tripled your starting cash' },
  { id: 'moon_shot',       name: 'Moon Shot',         icon: '🌕', description: 'Reached 5× your starting cash' },
  { id: 'ten_bagger',      name: 'Ten Bagger',        icon: '💰', description: 'Reached 10× your starting cash' },
  { id: 'half_million',    name: 'Half Millionaire',  icon: '💵', description: 'Reached $500k net worth' },
  { id: 'millionaire',     name: 'Millionaire',       icon: '🤑', description: 'Reached $1M net worth' },
  { id: 'comeback_kid',    name: 'Comeback Kid',      icon: '📈', description: 'Dropped below 50% of starting cash, then 2× it' },
  // ── Survival ──────────────────────────────────────────────────────────────────
  { id: 'diamond_hands',   name: 'Diamond Hands',     icon: '💎', description: 'Survived 100 ticks' },
  { id: 'veteran',         name: 'Veteran',           icon: '🎖️', description: 'Survived 200 ticks' },
  { id: 'legend',          name: 'Legend',            icon: '🏆', description: 'Survived 500 ticks' },
  // ── Market Phases ─────────────────────────────────────────────────────────────
  { id: 'survived_panic',  name: 'Panic Survivor',    icon: '🛡️', description: 'Held active positions through a PANIC phase' },
  { id: 'euphoria_rider',  name: 'Euphoria Rider',    icon: '🎢', description: 'Held active positions through a EUPHORIA phase' },
  { id: 'bear_survivor',   name: 'Bear Market Pro',   icon: '🐻', description: 'Held active positions through a BEAR phase' },
  { id: 'black_swan',      name: 'Black Swan',        icon: '🦢', description: 'Survived a black swan event' },
  // ── Trading ───────────────────────────────────────────────────────────────────
  { id: 'first_trade',     name: 'First Blood',       icon: '🩸', description: 'Made your first trade' },
  { id: 'active_trader',   name: 'Active Trader',     icon: '📊', description: 'Made 50+ trades in one run' },
  { id: 'day_trader',      name: 'Day Trader',        icon: '🔥', description: 'Made 100+ trades in one run' },
  { id: 'big_portfolio',   name: 'Big Portfolio',     icon: '📂', description: 'Held 10+ different assets at once' },
  // ── Short Selling ─────────────────────────────────────────────────────────────
  { id: 'first_short',     name: 'Short Seller',      icon: '📉', description: 'Opened your first short position' },
  { id: 'profitable_short',name: 'Bear Whisperer',    icon: '🐻', description: 'Covered a short position for profit' },
  { id: 'short_king',      name: 'Short King',        icon: '👑', description: 'Made $10k+ total profit from short positions' },
  { id: 'short_squeezed',  name: 'Squeezed',          icon: '🍋', description: 'Had a short position hit by a squeeze' },
  // ── Leverage & Risk ───────────────────────────────────────────────────────────
  { id: 'leveraged_up',    name: 'Leverage Lord',     icon: '⚡', description: 'Opened a 2×+ leveraged position' },
  { id: 'all_in',          name: 'All In',            icon: '🎰', description: 'Had 95%+ of portfolio in a single asset' },
  { id: 'meme_lord',       name: 'Meme Lord',         icon: '🦍', description: 'Held 5+ meme stocks simultaneously' },
  { id: 'margin_survivor', name: 'Margin Survivor',   icon: '⚠️', description: 'Survived a margin call with positive net worth' },
  { id: 'diversified',     name: 'Well Diversified',  icon: '🌐', description: 'Held all 5 asset categories at once' },
  // ── Bets ──────────────────────────────────────────────────────────────────────
  { id: 'first_bet',       name: 'High Roller',       icon: '🎲', description: 'Placed your first bet' },
  { id: 'crash_prophet',   name: 'Crash Prophet',     icon: '🔮', description: 'Won a crash bet' },
  { id: 'big_winner',      name: 'Big Winner',        icon: '💸', description: 'Won a 3×+ multiplier bet' },
  // ── Secret Boss ───────────────────────────────────────────────────────────────
  { id: 'god_of_markets',  name: 'God of Markets',   icon: '👁️', description: 'Reached $10,000,000 net worth. You have transcended.' },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

const ACHIEVEMENT_KEY = 'stonkify_achievements';

export function loadAchievements(): string[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveAchievements(ids: string[]) {
  try { localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(ids)); } catch {}
}

// End-of-game sweep — catches anything that wasn't pushed mid-run
export function checkAchievements(state: GameState): string[] {
  const earned: string[] = [];
  const add = (id: string) => earned.push(id);

  // Wealth
  if (state.peakNetWorth >= state.startingCash * 2)   add('first_double');
  if (state.peakNetWorth >= state.startingCash * 3)   add('triple');
  if (state.peakNetWorth >= state.startingCash * 5)   add('moon_shot');
  if (state.peakNetWorth >= state.startingCash * 10)  add('ten_bagger');
  if (state.peakNetWorth >= 500_000)                   add('half_million');
  if (state.peakNetWorth >= 1_000_000)                 add('millionaire');
  if (state.hasBeenAlmostBroke && state.peakNetWorth >= state.startingCash * 2) add('comeback_kid');

  // Survival
  if (state.tick >= 100)  add('diamond_hands');
  if (state.tick >= 200)  add('veteran');
  if (state.tick >= 500)  add('legend');

  // Market phases
  if (state.hasHeldPanic)    add('survived_panic');
  if (state.hasHeldEuphoria) add('euphoria_rider');
  if (state.hasHeldBear)     add('bear_survivor');
  if (state.hasSeenBlackSwan) add('black_swan');

  // Trading
  if (state.tradeHistory.length > 0)   add('first_trade');
  if (state.tradeHistory.length >= 50)  add('active_trader');
  if (state.tradeHistory.length >= 100) add('day_trader');
  if (state.peakHoldingsCount >= 10)    add('big_portfolio');

  // Shorts
  if (state.tradeHistory.some(t => t.type === 'short'))                          add('first_short');
  if (state.tradeHistory.some(t => t.type === 'cover' && (t.pnl ?? 0) > 0))     add('profitable_short');
  if (state.tradeHistory.filter(t => t.type === 'cover').reduce((s, t) => s + Math.max(0, t.pnl ?? 0), 0) >= 10_000) add('short_king');
  if (state.hasBeenShortSqueezed) add('short_squeezed');

  // Leverage & risk
  if (state.hasUsedLeverage)      add('leveraged_up');
  if (state.maxSingleConcentration >= 0.95) add('all_in');
  if (state.peakMemeHoldings >= 5) add('meme_lord');
  if (state.hasSurvivedMarginCall) add('margin_survivor');
  if (state.hasBeenDiversified)    add('diversified');

  // Bets
  if (state.hasPlacedBet)    add('first_bet');
  if (state.hasWonCrashBet)  add('crash_prophet');
  if (state.hasWonBigBet)    add('big_winner');

  // Secret boss
  if (state.peakNetWorth >= 10_000_000) add('god_of_markets');

  return earned;
}
