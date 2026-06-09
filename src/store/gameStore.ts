import { create } from 'zustand';
import type { GameState, Holding, Bet, GameMode, BetType, LeaderboardEntry } from '../types';
import {
  createInitialAssets,
  INITIAL_ASSETS,
  EXTRA_ASSET_POOL,
  createAssetsFromPool,
  tickAssetPrice,
  updateMarketPhase,
  updateGlobalSentiment,
  gaussianRandom,
} from '../engine/marketEngine';
import { generateNewsEvent, generateInitialNews } from '../engine/newsEngine';
import { SFX } from '../engine/soundEngine';
import { fetchRealPrices } from '../services/stockService';
import { useSettingsStore } from './settingsStore';
import { useNotificationStore } from './notificationStore';
import { checkAchievements, loadAchievements, saveAchievements, getAchievement } from '../engine/achievementEngine';

function sfx(fn: () => void) {
  if (useSettingsStore.getState().soundEnabled) fn();
}

const STARTING_CASH = 10_000;
export const TIMED_ROUNDS = 60;

// ── Persistence helpers ───────────────────────────────────────────────────────
const saveKey = (name: string) => `stonkify_save_${name.trim().toLowerCase()}`;
const LB_KEY  = 'stonkify_npc_leaderboard';

function loadSavedGame(playerName: string): (GameState & { isLoadingPrices: boolean }) | null {
  try {
    const raw = localStorage.getItem(saveKey(playerName));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistGame(state: GameState) {
  if (state.status === 'menu' || state.status === 'gameover') return;
  try { localStorage.setItem(saveKey(state.playerName), JSON.stringify(state)); } catch {}
}

function clearSave(playerName: string) {
  try { localStorage.removeItem(saveKey(playerName)); } catch {}
}

function getOrCreateNPCLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (raw) {
      const lb = JSON.parse(raw) as LeaderboardEntry[];
      // Validate: must have at least one entry per mode (new 3-per-mode format)
      const valid = (['endless', 'timed', 'survival'] as GameMode[]).every(
        m => lb.some(e => e.mode === m)
      );
      if (valid) {
        // Always deduplicate on load to clean up any old duplicate runs
        return rankByMode(lb);
      }
      // Old format — fall through to regenerate
    }
  } catch {}
  const lb = generateLeaderboard();
  try { localStorage.setItem(LB_KEY, JSON.stringify(lb)); } catch {}
  return lb;
}

function persistLeaderboard(lb: LeaderboardEntry[]) {
  try { localStorage.setItem(LB_KEY, JSON.stringify(lb)); } catch {}
}

// ── Price-seed persistence (last 10 ticks per ticker across sessions) ─────────
const PRICE_SEEDS_KEY = 'stonkify_price_seeds';

function saveAssetSeeds(assets: import('../types').Asset[]) {
  const seeds = Object.fromEntries(assets.map(a => [a.ticker, a.priceHistory.slice(-10)]));
  try { localStorage.setItem(PRICE_SEEDS_KEY, JSON.stringify(seeds)); } catch {}
}

function loadAssetSeeds(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(PRICE_SEEDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function warmUpAssets(assets: import('../types').Asset[], ticks = 10): import('../types').Asset[] {
  let cur = assets;
  for (let i = 0; i < ticks; i++) cur = cur.map(a => tickAssetPrice(a, 0.05, [], 'bull'));
  return cur;
}

const NEWS_ARCHIVE_KEY = 'stonkify_news_archive';

function saveNewsArchive(news: import('../types').NewsEvent[]) {
  try { localStorage.setItem(NEWS_ARCHIVE_KEY, JSON.stringify(news.slice(0, 10))); } catch {}
}

function loadNewsArchive(): import('../types').NewsEvent[] {
  try {
    const raw = localStorage.getItem(NEWS_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const tradeHistoryKey = (name: string) => `stonkify_trade_history_${name.trim().toLowerCase()}`;

function saveTradeHistory(trades: import('../types').TradeEntry[], playerName: string) {
  try { localStorage.setItem(tradeHistoryKey(playerName), JSON.stringify(trades.slice(0, 100))); } catch {}
}

function clearTradeHistory(playerName: string) {
  try { localStorage.removeItem(tradeHistoryKey(playerName)); } catch {}
}

function loadTradeHistory(playerName: string): import('../types').TradeEntry[] {
  try {
    const raw = localStorage.getItem(tradeHistoryKey(playerName));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const NPC_NAMES = [
  'WallStreetWolf', 'DiamondHands42', 'TendiesMaster', 'BullRunnerX', 'MoonShot99',
  'BearSlayer88', 'RiskQueen01', 'CrashJockey', 'AlphaTrader', 'MarginCallMike',
  'ShortSqueeze', 'YOLOInvestor', 'HedgeLord', 'VolatilityVince', 'StonkGuru',
  'IronHands69', 'ApeStrong', 'DipBuyer420', 'LeverageLord', 'OptionsPrince',
  'IndexFundIrene', 'StopLossSally', 'PanicSeller', 'BuyTheDip', 'DeepValueDave',
];

// 3 NPC competitors per game mode, ranked within their mode
const NPC_WORTH_BY_MODE: Record<GameMode, [number, number, number]> = {
  endless:  [695_000, 392_000, 208_000],
  timed:    [548_000, 312_000, 165_000],
  survival: [432_000, 251_000, 119_000],
};

const ALL_MODES: GameMode[] = ['endless', 'timed', 'survival'];

function generateLeaderboard(): LeaderboardEntry[] {
  const shuffled = [...NPC_NAMES].sort(() => Math.random() - 0.5);
  const now = new Date();
  const entries: LeaderboardEntry[] = [];
  let ni = 0;

  for (const mode of ALL_MODES) {
    const worths = NPC_WORTH_BY_MODE[mode];
    for (let i = 0; i < 3; i++) {
      const worth   = Math.round(worths[i] * (0.78 + Math.random() * 0.44));
      const ticks   = mode === 'timed' ? 60 : Math.floor(Math.random() * 380) + 50;
      const daysAgo = Math.floor(Math.random() * 7);
      const d = new Date(now); d.setDate(d.getDate() - daysAgo);
      entries.push({
        rank: i + 1,
        name: shuffled[ni++ % shuffled.length]!,
        netWorth: worth,
        mode,
        date: d.toISOString().split('T')[0]!,
        survived: ticks,
      });
    }
  }
  return entries;
}

// Keep only each player's personal best per mode, then re-rank within each mode
function rankByMode(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return ALL_MODES.flatMap(mode => {
    const modeEntries = entries.filter(e => e.mode === mode);
    // Deduplicate: for each name keep only the highest netWorth entry
    const bestByName = new Map<string, LeaderboardEntry>();
    for (const e of modeEntries) {
      const existing = bestByName.get(e.name);
      if (!existing || e.netWorth > existing.netWorth) bestByName.set(e.name, e);
    }
    return Array.from(bestByName.values())
      .sort((a, b) => b.netWorth - a.netWorth)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  });
}

function calcNetWorth(state: Pick<GameState, 'cash' | 'holdings' | 'assets'>): number {
  return state.holdings.reduce((total, h) => {
    const asset = state.assets.find(a => a.id === h.assetId);
    if (!asset) return total;
    if (h.isShorted) {
      const pnl = (h.avgBuyPrice - asset.price) * h.shares * h.leverage;
      return total + h.avgBuyPrice * h.shares * 0.5 + pnl;
    }
    // Cost paid + leveraged gain/loss (no phantom profit at entry)
    const value = h.shares * h.avgBuyPrice + (asset.price - h.avgBuyPrice) * h.shares * h.leverage;
    return total + value;
  }, state.cash);
}

function calcRiskMetrics(state: GameState) {
  const netWorth = calcNetWorth(state);
  if (netWorth <= 0) {
    return {
      volatilityScore: 100,
      exposureByCategory: { stable: 0, growth: 0, meme: 0, event: 0, index: 0 },
      crashProbability: 100,
      liquidityHealth: 0,
      leverageRatio: 1,
    };
  }

  const exposureByCategory = { stable: 0, growth: 0, meme: 0, event: 0, index: 0 };
  let totalLeverage = 0;
  let totalPositions = 0;

  for (const h of state.holdings) {
    const asset = state.assets.find(a => a.id === h.assetId);
    if (!asset) continue;
    const posValue = h.shares * asset.price;
    exposureByCategory[asset.category] = (exposureByCategory[asset.category] || 0) + posValue / netWorth;
    totalLeverage += h.leverage;
    totalPositions++;
  }

  const memeExposure = exposureByCategory.meme || 0;
  const eventExposure = exposureByCategory.event || 0;
  const avgLeverage = totalPositions > 0 ? totalLeverage / totalPositions : 1;

  const volatilityScore = Math.min(100, memeExposure * 60 + eventExposure * 30 + (avgLeverage - 1) * 20);
  const crashProbability = Math.min(100,
    (state.globalSentiment < -0.5 ? 40 : 0) +
    (state.marketPhase === 'panic' ? 35 : 0) +
    (memeExposure > 0.5 ? 25 : 0)
  );
  const liquidityHealth = Math.min(100, (state.cash / netWorth) * 150);

  return {
    volatilityScore: Math.round(volatilityScore),
    exposureByCategory,
    crashProbability: Math.round(crashProbability),
    liquidityHealth: Math.round(liquidityHealth),
    leverageRatio: avgLeverage,
  };
}

function resolveBets(state: GameState, prevSentiment: number): { bets: Bet[]; cashDelta: number } {
  let cashDelta = 0;
  const bets = state.bets.map(bet => {
    if (bet.status !== 'active') return bet;
    if (state.tick < bet.resolveAt) return bet;

    let won = false;
    // Compare vs. state at bet placement, not vs. the previous tick
    if (bet.type === 'market_up')
      won = state.globalSentiment > (bet.entrySentiment ?? prevSentiment);
    else if (bet.type === 'market_down')
      won = state.globalSentiment < (bet.entrySentiment ?? prevSentiment);
    else if (bet.type === 'crash')
      won = state.marketPhase === 'panic';
    else if (bet.type === 'sector_outperform' && bet.targetAssetId) {
      const asset = state.assets.find(a => a.id === bet.targetAssetId);
      if (asset) won = asset.price > (bet.targetEntryPrice ?? asset.priceHistory[0]!);
    }

    const payout = won ? bet.amount * bet.multiplier : 0;
    cashDelta += payout - bet.amount;
    if (won) sfx(SFX.win); else sfx(SFX.loss);

    return { ...bet, status: won ? 'won' as const : 'lost' as const, payout };
  });

  return { bets, cashDelta };
}

// Returns updated achievement lists and fires notifications for newly unlocked IDs.
function checkAndPushAchievements(
  candidates: string[],
  curAll: string[],
  curNew: string[],
): { newAll: string[]; newNew: string[] } {
  const allSet = new Set(curAll);
  const newSet = new Set(curNew);
  const fresh: string[] = [];
  for (const id of candidates) {
    if (!allSet.has(id) && !newSet.has(id)) fresh.push(id);
  }
  if (fresh.length === 0) return { newAll: curAll, newNew: curNew };
  const newAll = [...curAll, ...fresh];
  const newNew = [...curNew, ...fresh];
  saveAchievements(newAll);
  for (const id of fresh) {
    const ach = getAchievement(id);
    if (ach) useNotificationStore.getState().push(`${ach.icon} ${ach.name}`, 'achievement', ach.description, 4000);
  }
  return { newAll, newNew };
}

interface GameStore extends GameState {
  isLoadingPrices: boolean;
  allAchievements: string[];
  startGame: (mode: GameMode, playerName: string) => Promise<void>;
  advanceTick: () => void;
  buyAsset: (assetId: string, shares: number, leverage?: number) => void;
  sellAsset: (assetId: string, shares: number) => void;
  shortAsset: (assetId: string, shares: number, leverage?: number) => void;
  coverShort: (assetId: string, shares: number) => void;
  setStopLoss: (assetId: string, price: number | null) => void;
  setTakeProfit: (assetId: string, price: number | null) => void;
  placeBet: (type: BetType, amount: number, targetAssetId?: string) => void;
  addMoreAssets: () => Promise<{ added: number; remaining: number }>;
  pauseGame: () => void;
  resumeGame: () => void;
  goToMenu: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  isLoadingPrices: false,
  allAchievements: loadAchievements(),
  status: 'menu',
  mode: 'endless',
  tick: 0,
  cash: STARTING_CASH,
  startingCash: STARTING_CASH,
  assets: createInitialAssets(),
  holdings: [],
  bets: [],
  news: [],
  netWorthHistory: [{ tick: 0, value: STARTING_CASH }],
  tradeHistory: [],
  leaderboard: getOrCreateNPCLeaderboard(),
  riskMetrics: {
    volatilityScore: 0,
    exposureByCategory: { stable: 0, growth: 0, meme: 0, event: 0, index: 0 },
    crashProbability: 0,
    liquidityHealth: 100,
    leverageRatio: 1,
  },
  globalSentiment: 0.1,
  marketPhase: 'bull',
  roundsRemaining: TIMED_ROUNDS,
  playerName: 'Player',
  totalPnl: 0,
  peakNetWorth: STARTING_CASH,
  hasUsedLeverage: false,
  hasHeldPanic: false,
  hasHeldEuphoria: false,
  hasHeldBear: false,
  hasSeenBlackSwan: false,
  hasBeenDiversified: false,
  hasBeenShortSqueezed: false,
  hasSurvivedMarginCall: false,
  hasWonCrashBet: false,
  hasWonBigBet: false,
  hasPlacedBet: false,
  hasBeenAlmostBroke: false,
  maxSingleConcentration: 0,
  peakMemeHoldings: 0,
  peakHoldingsCount: 0,
  newAchievements: [],

  startGame: async (mode, playerName) => {
    const startCash = STARTING_CASH;

    // Restore saved game if one exists for this player
    const saved = loadSavedGame(playerName);
    if (saved) {
        // Merge in any INITIAL_ASSETS that weren't in the save (e.g. newly added index funds)
        const savedTickers = new Set(saved.assets.map((a: import('../types').Asset) => a.ticker));
        const missing = INITIAL_ASSETS.filter(a => !savedTickers.has(a.ticker));
        if (missing.length > 0) {
          const missingPrices = await fetchRealPrices(missing.map(a => a.ticker));
          const newAssets = missing.map(a => ({
            ...a,
            price: missingPrices[a.ticker] ?? a.price,
            priceHistory: [missingPrices[a.ticker] ?? a.price],
          }));
          saved.assets = [...saved.assets, ...warmUpAssets(newAssets, 10)];
        }
        set({
          ...saved,
          status: 'playing',
          isLoadingPrices: false,
          allAchievements: loadAchievements(),
          newAchievements: [],
          hasUsedLeverage:        saved.hasUsedLeverage        ?? false,
          hasHeldPanic:           saved.hasHeldPanic           ?? false,
          hasHeldEuphoria:        saved.hasHeldEuphoria        ?? false,
          hasHeldBear:            saved.hasHeldBear            ?? false,
          hasSeenBlackSwan:       saved.hasSeenBlackSwan       ?? false,
          hasBeenDiversified:     saved.hasBeenDiversified     ?? false,
          hasBeenShortSqueezed:   saved.hasBeenShortSqueezed   ?? false,
          hasSurvivedMarginCall:  saved.hasSurvivedMarginCall  ?? false,
          hasWonCrashBet:         saved.hasWonCrashBet         ?? false,
          hasWonBigBet:           saved.hasWonBigBet           ?? false,
          hasPlacedBet:           saved.hasPlacedBet           ?? false,
          hasBeenAlmostBroke:     saved.hasBeenAlmostBroke     ?? false,
          maxSingleConcentration: saved.maxSingleConcentration ?? 0,
          peakMemeHoldings:       saved.peakMemeHoldings       ?? 0,
          peakHoldingsCount:      saved.peakHoldingsCount      ?? 0,
        } as Partial<GameStore>);
        return;
    }

    // Fresh game — wipe achievements from the previous run
    saveAchievements([]);

    // Seed news from last session (or generate 10 if none)
    const archivedNews = loadNewsArchive();
    const initialNews  = archivedNews.length >= 10
      ? archivedNews
      : [...archivedNews, ...generateInitialNews(10 - archivedNews.length)];

    // Start immediately with default/seeded prices so the game launches without delay
    const seeds     = loadAssetSeeds();
    const rawAssets = createInitialAssets({});
    const preSeeded = rawAssets.map(a => {
      const seed = seeds[a.ticker];
      if (seed && seed.length >= 2) return { ...a, priceHistory: [...seed.slice(-9), a.price] };
      return a;
    });
    const seeded = preSeeded.map(a =>
      a.priceHistory.length < 2 ? warmUpAssets([a], 10)[0]! : a
    );

    set({
      isLoadingPrices: true,
      status: 'playing',
      mode,
      tick: 0,
      cash: startCash,
      startingCash: startCash,
      assets: seeded,
      holdings: [],
      bets: [],
      news: initialNews,
      netWorthHistory: [{ tick: 0, value: startCash }],
      tradeHistory: mode === 'endless' ? loadTradeHistory(playerName) : [],
      globalSentiment: 0.1,
      marketPhase: 'bull',
      roundsRemaining: mode === 'timed' ? TIMED_ROUNDS : Infinity,
      playerName,
      leaderboard: getOrCreateNPCLeaderboard(),
      totalPnl: 0,
      peakNetWorth: startCash,
      allAchievements: loadAchievements(),
      hasUsedLeverage: false,
      hasHeldPanic: false,
      hasHeldEuphoria: false,
      hasHeldBear: false,
      hasSeenBlackSwan: false,
      hasBeenDiversified: false,
      hasBeenShortSqueezed: false,
      hasSurvivedMarginCall: false,
      hasWonCrashBet: false,
      hasWonBigBet: false,
      hasPlacedBet: false,
      hasBeenAlmostBroke: false,
      maxSingleConcentration: 0,
      peakMemeHoldings: 0,
      peakHoldingsCount: 0,
      newAchievements: [],
      riskMetrics: {
        volatilityScore: 0,
        exposureByCategory: { stable: 0, growth: 0, meme: 0, event: 0, index: 0 },
        crashProbability: 0,
        liquidityHealth: 100,
        leverageRatio: 1,
      },
    });

    // Fetch real prices in the background and silently update assets
    fetchRealPrices(INITIAL_ASSETS.map(a => a.ticker)).then(realPrices => {
      const s = get();
      if (s.status !== 'playing' || s.playerName !== playerName) return;
      const updatedAssets = s.assets.map(a => {
        const real = realPrices[a.ticker];
        if (!real) return a;
        return { ...a, price: real, priceHistory: [...a.priceHistory.slice(0, -1), real] };
      });
      set({ assets: updatedAssets, isLoadingPrices: false });
    }).catch(() => set({ isLoadingPrices: false }));
  },

  advanceTick: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const prevSentiment = state.globalSentiment;
    const newTick = state.tick + 1;

    // Generate news
    const newEvent = generateNewsEvent(newTick);
    const recentNews = newEvent
      ? [newEvent, ...state.news].slice(0, 20)
      : state.news;

    const activeEvents = newEvent ? [newEvent] : [];

    // Update global sentiment
    const newSentiment = updateGlobalSentiment(state.globalSentiment, state.marketPhase, activeEvents);

    // Update market phase
    const newPhase = updateMarketPhase(state.marketPhase, newSentiment, newTick);
    if (newPhase !== state.marketPhase) {
      if (newPhase === 'panic')    sfx(SFX.crash);
      if (newPhase === 'euphoria') sfx(SFX.euphoria);
    }

    // ── Feature 4: Sector correlation — macro/black_swan events generate one shared
    //   Gaussian shock per affected category so correlated assets move together.
    const categoryShocks: Record<string, number> = {};
    if (newEvent && (newEvent.type === 'macro' || newEvent.type === 'black_swan')) {
      for (const cat of newEvent.affectedCategories) {
        categoryShocks[cat] = gaussianRandom(0, Math.abs(newEvent.impactMultiplier) * 0.04);
      }
    }

    // Update asset prices (with correlated shock layered on top)
    let newAssets = state.assets.map(asset => {
      const ticked = tickAssetPrice(asset, newSentiment, activeEvents, newPhase);
      const shock = categoryShocks[asset.category] ?? 0;
      if (shock === 0) return ticked;
      const newPrice = Math.max(0.01, ticked.price * (1 + shock));
      return { ...ticked, price: newPrice, priceHistory: [...ticked.priceHistory.slice(0, -1), newPrice] };
    });

    // Apply stop-loss / take-profit auto-executions
    let newHoldings = [...state.holdings];
    let cashFromAuto = 0;

    newAssets = newAssets.map(asset => {
      const holdingIdx = newHoldings.findIndex(h => h.assetId === asset.id && !h.isShorted);
      if (holdingIdx === -1) return asset;

      const holding = newHoldings[holdingIdx]!;
      const sl = asset.stopLoss;
      const tp = asset.takeProfit;

      if ((sl !== null && asset.price <= sl) || (tp !== null && asset.price >= tp)) {
        const autoPnl = (asset.price - holding.avgBuyPrice) * holding.shares * holding.leverage;
        cashFromAuto += Math.max(0, holding.avgBuyPrice * holding.shares + autoPnl);
        newHoldings.splice(holdingIdx, 1);
        return { ...asset, stopLoss: null, takeProfit: null };
      }
      return asset;
    });

    // ── Feature 2: Short squeeze — heavily shorted meme stocks can spike
    let squeezeHitShort = false;
    newAssets = newAssets.map(asset => {
      if (asset.category !== 'meme') return asset;
      const shortedShares = newHoldings
        .filter(h => h.assetId === asset.id && h.isShorted)
        .reduce((sum, h) => sum + h.shares, 0);
      if (shortedShares === 0) return asset;
      const shortValue = shortedShares * asset.price;
      const squeezeProbability = Math.min(0.08, shortValue / 80_000);
      if (Math.random() >= squeezeProbability) return asset;
      squeezeHitShort = true;
      const spikeMultiplier = 1 + 0.05 + Math.random() * 0.18;
      const newPrice = asset.price * spikeMultiplier;
      useNotificationStore.getState().push(
        `SHORT SQUEEZE: ${asset.ticker} +${((spikeMultiplier - 1) * 100).toFixed(0)}%`,
        'event',
        'Shorts scrambling to cover',
      );
      return {
        ...asset,
        price: newPrice,
        priceHistory: [...asset.priceHistory.slice(0, -1), newPrice],
        momentum: Math.min(1, asset.momentum + 0.4),
      };
    });

    // Resolve bets — check for crash/big-winner achievements
    const tempState = { ...state, tick: newTick, globalSentiment: newSentiment, marketPhase: newPhase, assets: newAssets };
    const { bets: resolvedBets, cashDelta } = resolveBets(tempState, prevSentiment);

    const justWon = resolvedBets.filter(b => {
      const old = state.bets.find(ob => ob.id === b.id);
      return b.status === 'won' && old?.status === 'active';
    });
    const wonCrashBet = state.hasWonCrashBet || justWon.some(b => b.type === 'crash');
    const wonBigBet   = state.hasWonBigBet   || justWon.some(b => b.multiplier >= 3);

    // Clean up expired bets older than 5 ticks
    const activeBets = resolvedBets.filter(b => b.status === 'active' || newTick - b.resolveAt < 5);

    const newCash = state.cash + cashDelta + cashFromAuto;
    let finalHoldings = newHoldings;
    let finalCash = newCash;

    // ── Feature 3: Leverage cap
    let marginCallFired = false;
    const LEVERAGE_CAP = 4;
    const leveragedLongs = finalHoldings.filter(h => !h.isShorted && h.leverage > 1);
    if (leveragedLongs.length > 0) {
      const leverageExposure = leveragedLongs.reduce((sum, h) => {
        const asset = newAssets.find(a => a.id === h.assetId);
        return asset ? sum + h.leverage * h.shares * asset.price : sum;
      }, 0);
      const netWorthEstimate = calcNetWorth({ cash: finalCash, holdings: finalHoldings, assets: newAssets });
      if (netWorthEstimate > 0 && leverageExposure > LEVERAGE_CAP * netWorthEstimate) {
        const toLiquidate = leveragedLongs.reduce((max, h) => h.leverage > max.leverage ? h : max);
        const asset = newAssets.find(a => a.id === toLiquidate.assetId);
        if (asset) {
          const pnl = (asset.price - toLiquidate.avgBuyPrice) * toLiquidate.shares * toLiquidate.leverage;
          finalCash += Math.max(0, toLiquidate.avgBuyPrice * toLiquidate.shares + pnl);
          finalHoldings = finalHoldings.filter(h => h !== toLiquidate);
          marginCallFired = true;
          useNotificationStore.getState().push(
            `MARGIN CALL: ${asset.ticker} liquidated`,
            'loss',
            `Leverage exposure exceeded ${LEVERAGE_CAP}× net worth`,
          );
        }
      }
    }

    // ── Compute updated achievement tracking flags ──────────────────────────────
    const cats = new Set(finalHoldings.map(h => newAssets.find(a => a.id === h.assetId)?.category).filter(Boolean));
    const memeCount    = [...finalHoldings].filter(h => newAssets.find(a => a.id === h.assetId)?.category === 'meme').length;
    const holdingCount = new Set(finalHoldings.map(h => h.assetId)).size;

    const nextState: Partial<GameState> = {
      tick: newTick,
      assets: newAssets,
      holdings: finalHoldings,
      bets: activeBets,
      news: recentNews,
      globalSentiment: newSentiment,
      marketPhase: newPhase,
      cash: finalCash,
      roundsRemaining: state.mode === 'timed' ? state.roundsRemaining - 1 : Infinity,
      hasHeldPanic:          state.hasHeldPanic   || (newPhase === 'panic'    && finalHoldings.length > 0),
      hasHeldEuphoria:       state.hasHeldEuphoria|| (newPhase === 'euphoria' && finalHoldings.length > 0),
      hasHeldBear:           state.hasHeldBear    || (newPhase === 'bear'     && finalHoldings.length > 0),
      hasSeenBlackSwan:      state.hasSeenBlackSwan  || newEvent?.type === 'black_swan',
      hasBeenDiversified:    state.hasBeenDiversified || cats.size >= 5,
      hasBeenShortSqueezed:  state.hasBeenShortSqueezed || squeezeHitShort,
      hasSurvivedMarginCall: state.hasSurvivedMarginCall || marginCallFired,
      hasWonCrashBet:        wonCrashBet,
      hasWonBigBet:          wonBigBet,
      peakMemeHoldings:      Math.max(state.peakMemeHoldings, memeCount),
      peakHoldingsCount:     Math.max(state.peakHoldingsCount, holdingCount),
    };

    const netWorth = calcNetWorth({ cash: finalCash, holdings: finalHoldings, assets: newAssets });
    const riskMetrics = calcRiskMetrics({ ...state, ...nextState } as GameState);

    nextState.riskMetrics = riskMetrics;
    nextState.totalPnl    = netWorth - state.startingCash;
    nextState.peakNetWorth = Math.max(state.peakNetWorth, netWorth);
    nextState.netWorthHistory = [
      ...state.netWorthHistory.slice(-299),
      { tick: newTick, value: Math.round(netWorth) },
    ];
    nextState.hasBeenAlmostBroke = state.hasBeenAlmostBroke || netWorth < state.startingCash * 0.5;

    // Per-asset concentration for all_in achievement
    const maxConc = netWorth > 0 ? finalHoldings.reduce((max, h) => {
      const asset = newAssets.find(a => a.id === h.assetId);
      if (!asset) return max;
      const val = Math.abs(h.isShorted
        ? h.avgBuyPrice * h.shares * 0.5 + (h.avgBuyPrice - asset.price) * h.shares * h.leverage
        : h.avgBuyPrice * h.shares + (asset.price - h.avgBuyPrice) * h.shares * h.leverage);
      return Math.max(max, val / netWorth);
    }, 0) : 0;
    nextState.maxSingleConcentration = Math.max(state.maxSingleConcentration, maxConc);

    // ── Per-tick achievement check ──────────────────────────────────────────────
    const peakNW = nextState.peakNetWorth!;
    const achCandidates: string[] = [];
    if (netWorth >= state.startingCash * 2)  achCandidates.push('first_double');
    if (peakNW  >= state.startingCash * 3)   achCandidates.push('triple');
    if (peakNW  >= state.startingCash * 5)   achCandidates.push('moon_shot');
    if (peakNW  >= state.startingCash * 10)  achCandidates.push('ten_bagger');
    if (peakNW  >= 500_000)                  achCandidates.push('half_million');
    if (peakNW  >= 1_000_000)                achCandidates.push('millionaire');
    if (nextState.hasBeenAlmostBroke && peakNW >= state.startingCash * 2) achCandidates.push('comeback_kid');
    if (newTick >= 1000) achCandidates.push('diamond_hands');
    if (newTick >= 2000) achCandidates.push('veteran');
    if (newTick >= 5000) achCandidates.push('legend');
    if (nextState.hasHeldPanic)    achCandidates.push('survived_panic');
    if (nextState.hasHeldEuphoria) achCandidates.push('euphoria_rider');
    if (nextState.hasHeldBear)     achCandidates.push('bear_survivor');
    if (nextState.hasSeenBlackSwan) achCandidates.push('black_swan');
    if (nextState.hasBeenDiversified) achCandidates.push('diversified');
    if (nextState.hasBeenShortSqueezed) achCandidates.push('short_squeezed');
    if (nextState.hasSurvivedMarginCall) achCandidates.push('margin_survivor');
    if (nextState.hasWonCrashBet) achCandidates.push('crash_prophet');
    if (nextState.hasWonBigBet)   achCandidates.push('big_winner');
    if (nextState.maxSingleConcentration! >= 0.95) achCandidates.push('all_in');
    if (nextState.peakMemeHoldings! >= 5)  achCandidates.push('meme_lord');
    if (nextState.peakHoldingsCount! >= 10) achCandidates.push('big_portfolio');
    if (state.hasUsedLeverage) achCandidates.push('leveraged_up');
    if (state.hasPlacedBet)    achCandidates.push('first_bet');
    if (state.tradeHistory.length > 0)   achCandidates.push('first_trade');
    if (state.tradeHistory.length >= 50)  achCandidates.push('active_trader');
    if (state.tradeHistory.length >= 100) achCandidates.push('day_trader');
    if (state.tradeHistory.some(t => t.type === 'short')) achCandidates.push('first_short');
    if (state.tradeHistory.some(t => t.type === 'cover' && (t.pnl ?? 0) > 0)) achCandidates.push('profitable_short');
    if (state.tradeHistory.filter(t => t.type === 'cover').reduce((s, t) => s + Math.max(0, t.pnl ?? 0), 0) >= 10_000) achCandidates.push('short_king');
    if (peakNW >= 10_000_000) achCandidates.push('god_of_markets');

    const { newAll, newNew } = checkAndPushAchievements(achCandidates, state.allAchievements, state.newAchievements);

    // Check game over conditions
    const isLiquidated = netWorth < 100;
    const isTimedEnd = state.mode === 'timed' && (nextState.roundsRemaining as number) <= 0;

    if (isLiquidated || isTimedEnd) {
      const finalWorth  = Math.max(0, Math.round(netWorth));
      const existingBest = state.leaderboard.find(
        e => e.name === state.playerName && e.mode === state.mode
      );

      let newLeaderboard: LeaderboardEntry[];
      if (!existingBest || finalWorth > existingBest.netWorth) {
        const entry: LeaderboardEntry = {
          rank: 0,
          name: state.playerName,
          netWorth: finalWorth,
          mode: state.mode,
          date: new Date().toISOString().split('T')[0]!,
          survived: newTick,
        };
        const without = state.leaderboard.filter(
          e => !(e.name === state.playerName && e.mode === state.mode)
        );
        newLeaderboard = rankByMode([...without, entry]);
      } else {
        newLeaderboard = state.leaderboard;
      }

      // Final achievement sweep (catches anything missed mid-run)
      const gameStateAtEnd = { ...state, ...nextState, tick: newTick } as GameState;
      const sweepEarned = checkAchievements(gameStateAtEnd);
      const allNewSet = new Set(newNew);
      const sweepNew = sweepEarned.filter(id => !new Set(newAll).has(id));
      if (sweepNew.length > 0) {
        const combined = [...newAll, ...sweepNew];
        saveAchievements(combined);
        sweepNew.forEach(id => allNewSet.add(id));
      }
      const finalNewNew = [...allNewSet];
      const finalNewAll = sweepNew.length > 0 ? [...newAll, ...sweepNew] : newAll;

      saveNewsArchive(state.news);
      saveAssetSeeds(newAssets);
      clearTradeHistory(state.playerName);
      persistLeaderboard(newLeaderboard);
      clearSave(state.playerName);
      set({
        ...nextState,
        status: 'gameover',
        holdings: [],
        leaderboard: newLeaderboard,
        allAchievements: finalNewAll,
        newAchievements: finalNewNew,
      } as Partial<GameStore>);
      return;
    }

    set({ ...nextState, allAchievements: newAll, newAchievements: newNew } as Partial<GameStore>);
  },

  buyAsset: (assetId, shares, leverage = 1) => {
    const state = get();
    const asset = state.assets.find(a => a.id === assetId);
    if (!asset) return;

    const cost = shares * asset.price;
    if (state.cash < cost) return;

    const existingIdx = state.holdings.findIndex(h => h.assetId === assetId && !h.isShorted);
    let newHoldings = [...state.holdings];

    if (existingIdx >= 0) {
      const existing = newHoldings[existingIdx]!;
      const totalShares = existing.shares + shares;
      const avgPrice = (existing.avgBuyPrice * existing.shares + asset.price * shares) / totalShares;
      newHoldings[existingIdx] = { ...existing, shares: totalShares, avgBuyPrice: avgPrice };
    } else {
      newHoldings.push({ assetId, shares, avgBuyPrice: asset.price, isShorted: false, leverage });
    }

    const entry: import('../types').TradeEntry = {
      id: `t_${Date.now()}`, tick: state.tick, type: 'buy',
      ticker: asset.ticker, shares, price: asset.price, total: cost,
    };
    sfx(SFX.buy);
    const newTradeHistory = [entry, ...state.tradeHistory].slice(0, 200);
    const buyCandidates: string[] = [];
    if (state.tradeHistory.length === 0)  buyCandidates.push('first_trade');
    if (newTradeHistory.length >= 50)      buyCandidates.push('active_trader');
    if (newTradeHistory.length >= 100)     buyCandidates.push('day_trader');
    if (leverage >= 2) buyCandidates.push('leveraged_up');
    const buyAch = checkAndPushAchievements(buyCandidates, state.allAchievements, state.newAchievements);
    set({
      cash: state.cash - cost,
      holdings: newHoldings,
      tradeHistory: newTradeHistory,
      ...(leverage >= 2 ? { hasUsedLeverage: true } : {}),
      allAchievements: buyAch.newAll,
      newAchievements: buyAch.newNew,
    });
  },

  sellAsset: (assetId, shares) => {
    const state = get();
    const asset = state.assets.find(a => a.id === assetId);
    if (!asset) return;

    const holdingIdx = state.holdings.findIndex(h => h.assetId === assetId && !h.isShorted);
    if (holdingIdx === -1) return;

    const holding = state.holdings[holdingIdx]!;
    if (holding.shares < shares) return;

    const pnl = (asset.price - holding.avgBuyPrice) * shares * holding.leverage;
    const proceeds = Math.max(0, holding.avgBuyPrice * shares + pnl);
    let newHoldings = [...state.holdings];

    if (holding.shares === shares) {
      newHoldings.splice(holdingIdx, 1);
    } else {
      newHoldings[holdingIdx] = { ...holding, shares: holding.shares - shares };
    }
    sfx(pnl >= 0 ? SFX.sell : SFX.loss);
    const entry: import('../types').TradeEntry = {
      id: `t_${Date.now()}`, tick: state.tick, type: 'sell',
      ticker: asset.ticker, shares, price: asset.price, total: proceeds, pnl,
    };
    const sellHistory = [entry, ...state.tradeHistory].slice(0, 200);
    const sellCandidates: string[] = [];
    if (sellHistory.length >= 50)  sellCandidates.push('active_trader');
    if (sellHistory.length >= 100) sellCandidates.push('day_trader');
    const sellAch = checkAndPushAchievements(sellCandidates, state.allAchievements, state.newAchievements);
    set({
      cash: state.cash + proceeds,
      holdings: newHoldings,
      tradeHistory: sellHistory,
      allAchievements: sellAch.newAll,
      newAchievements: sellAch.newNew,
    });
  },

  shortAsset: (assetId, shares, leverage = 1) => {
    const state = get();
    const asset = state.assets.find(a => a.id === assetId);
    if (!asset) return;

    const marginRequired = shares * asset.price * 0.5;
    if (state.cash < marginRequired) return;

    const newHolding: Holding = {
      assetId,
      shares,
      avgBuyPrice: asset.price,
      isShorted: true,
      leverage,
    };

    sfx(SFX.short);
    const entry: import('../types').TradeEntry = {
      id: `t_${Date.now()}`, tick: state.tick, type: 'short',
      ticker: asset.ticker, shares, price: asset.price, total: marginRequired,
    };
    const shortHistory = [entry, ...state.tradeHistory].slice(0, 200);
    const shortCandidates: string[] = ['first_short'];
    if (leverage >= 2) shortCandidates.push('leveraged_up');
    if (shortHistory.length >= 50)  shortCandidates.push('active_trader');
    if (shortHistory.length >= 100) shortCandidates.push('day_trader');
    const shortAch = checkAndPushAchievements(shortCandidates, state.allAchievements, state.newAchievements);
    set({
      cash: state.cash - marginRequired,
      holdings: [...state.holdings, newHolding],
      tradeHistory: shortHistory,
      ...(leverage >= 2 ? { hasUsedLeverage: true } : {}),
      allAchievements: shortAch.newAll,
      newAchievements: shortAch.newNew,
    });
  },

  coverShort: (assetId, shares) => {
    const state = get();
    const asset = state.assets.find(a => a.id === assetId);
    if (!asset) return;

    const holdingIdx = state.holdings.findIndex(h => h.assetId === assetId && h.isShorted);
    if (holdingIdx === -1) return;

    const holding = state.holdings[holdingIdx]!;
    const pnl = (holding.avgBuyPrice - asset.price) * shares * holding.leverage;
    const marginReturn = shares * holding.avgBuyPrice * 0.5;
    const proceeds = marginReturn + pnl;

    let newHoldings = [...state.holdings];
    if (holding.shares <= shares) {
      newHoldings.splice(holdingIdx, 1);
    } else {
      newHoldings[holdingIdx] = { ...holding, shares: holding.shares - shares };
    }

    sfx(pnl >= 0 ? SFX.cover : SFX.loss);
    const entry: import('../types').TradeEntry = {
      id: `t_${Date.now()}`, tick: state.tick, type: 'cover',
      ticker: asset.ticker, shares, price: asset.price, total: proceeds, pnl,
    };
    const coverHistory = [entry, ...state.tradeHistory].slice(0, 200);
    const totalShortProfit = coverHistory.filter(t => t.type === 'cover').reduce((s, t) => s + Math.max(0, t.pnl ?? 0), 0);
    const coverCandidates: string[] = [];
    if (pnl > 0) coverCandidates.push('profitable_short');
    if (totalShortProfit >= 10_000) coverCandidates.push('short_king');
    if (coverHistory.length >= 50)  coverCandidates.push('active_trader');
    if (coverHistory.length >= 100) coverCandidates.push('day_trader');
    const coverAch = checkAndPushAchievements(coverCandidates, state.allAchievements, state.newAchievements);
    set({
      cash: state.cash + proceeds,
      holdings: newHoldings,
      tradeHistory: coverHistory,
      allAchievements: coverAch.newAll,
      newAchievements: coverAch.newNew,
    });
  },

  setStopLoss: (assetId, price) => {
    set(state => ({
      assets: state.assets.map(a => a.id === assetId ? { ...a, stopLoss: price } : a),
    }));
  },

  setTakeProfit: (assetId, price) => {
    set(state => ({
      assets: state.assets.map(a => a.id === assetId ? { ...a, takeProfit: price } : a),
    }));
  },

  placeBet: (type, amount, targetAssetId) => {
    const state = get();
    if (state.cash < amount) return;

    const BET_CONFIGS: Record<BetType, { multiplier: number; duration: number; description: string }> = {
      market_up: { multiplier: 1.8, duration: 5, description: 'Market sentiment rises next 5 ticks' },
      market_down: { multiplier: 1.8, duration: 5, description: 'Market sentiment falls next 5 ticks' },
      crash: { multiplier: 8, duration: 10, description: 'Market enters PANIC within 10 ticks' },
      sector_outperform: { multiplier: 3, duration: 8, description: 'Selected asset beats market next 8 ticks' },
    };

    const config = BET_CONFIGS[type];
    const bet: Bet = {
      id: `bet_${Date.now()}`,
      type,
      amount,
      multiplier: config.multiplier,
      resolveAt: state.tick + config.duration,
      targetAssetId,
      // Snapshot entry state so resolution compares over the full bet duration
      entrySentiment: (type === 'market_up' || type === 'market_down')
        ? state.globalSentiment : undefined,
      targetEntryPrice: type === 'sector_outperform' && targetAssetId
        ? state.assets.find(a => a.id === targetAssetId)?.price : undefined,
      status: 'active',
      description: config.description,
    };

    const betAch = checkAndPushAchievements(['first_bet'], state.allAchievements, state.newAchievements);
    set({
      cash: state.cash - amount,
      bets: [...state.bets, bet],
      hasPlacedBet: true,
      allAchievements: betAch.newAll,
      newAchievements: betAch.newNew,
    });
  },

  addMoreAssets: async () => {
    const state = get();
    const existingIds = new Set(state.assets.map(a => a.id));
    const available   = EXTRA_ASSET_POOL.filter(a => !existingIds.has(a.id));
    const batch       = available.slice(0, 10);
    if (batch.length === 0) return { added: 0, remaining: 0 };
    const symbols   = batch.map(a => a.ticker);
    const prices    = await fetchRealPrices(symbols);
    const newAssets = createAssetsFromPool(batch, prices);
    set({ assets: [...state.assets, ...newAssets] });
    return { added: newAssets.length, remaining: available.length - newAssets.length };
  },

  pauseGame: () => set({ status: 'paused' }),
  resumeGame: () => set({ status: 'playing' }),
  goToMenu: () => {
    const state = get();
    // If leaving an active game, record the player's current score as a personal best
    if (state.status === 'playing' || state.status === 'paused') {
      const netWorth    = calcNetWorth(state);
      const finalWorth  = Math.max(0, Math.round(netWorth));
      const existingBest = state.leaderboard.find(
        e => e.name === state.playerName && e.mode === state.mode
      );
      if (!existingBest || finalWorth > existingBest.netWorth) {
        const entry: LeaderboardEntry = {
          rank: 0, name: state.playerName, netWorth: finalWorth,
          mode: state.mode, date: new Date().toISOString().split('T')[0]!,
          survived: state.tick,
        };
        const without      = state.leaderboard.filter(
          e => !(e.name === state.playerName && e.mode === state.mode)
        );
        const newLeaderboard = rankByMode([...without, entry]);
        persistLeaderboard(newLeaderboard);
        saveAssetSeeds(state.assets);
        if (state.mode === 'endless') saveTradeHistory(state.tradeHistory, state.playerName);
        set({ status: 'menu', leaderboard: newLeaderboard });
        return;
      }
    }
    saveAssetSeeds(state.assets);
    if (state.mode === 'endless') saveTradeHistory(state.tradeHistory, state.playerName);
    set({ status: 'menu' });
  },
}));

export function getNetWorth(state: GameState): number {
  return calcNetWorth(state);
}

// Auto-save whenever the game is in an active state
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useGameStore.subscribe(state => {
  if (state.status !== 'playing' && state.status !== 'paused') return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => persistGame(state), 800);
});

// Flush all pending state immediately when the tab is closed
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useGameStore.getState();
    if (state.status !== 'playing' && state.status !== 'paused') return;
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    persistGame(state);
    saveAssetSeeds(state.assets);
    saveNewsArchive(state.news);
    if (state.mode === 'endless') saveTradeHistory(state.tradeHistory, state.playerName);
  });
}
