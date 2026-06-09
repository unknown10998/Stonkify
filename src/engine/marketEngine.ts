import type { Asset, AssetCategory, NewsEvent, GameState } from '../types';

const CATEGORY_VOLATILITY: Record<AssetCategory, number> = {
  stable: 0.008,
  growth: 0.025,
  meme:   0.08,
  event:  0.045,
  index:  0.013,
};

export function gaussianRandom(mean = 0, std = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function tickAssetPrice(
  asset: Asset,
  globalSentiment: number,
  activeEvents: NewsEvent[],
  marketPhase: GameState['marketPhase'],
): Asset {
  const baseVol = CATEGORY_VOLATILITY[asset.category];

  let phaseMultiplier = 1;
  if (marketPhase === 'bull') phaseMultiplier = 1.3;
  else if (marketPhase === 'bear') phaseMultiplier = 0.7;
  else if (marketPhase === 'panic') phaseMultiplier = 0.5;
  else if (marketPhase === 'euphoria') phaseMultiplier = 1.6;

  // Base random walk
  let drift = gaussianRandom(0, baseVol);

  // Sentiment influence
  drift += globalSentiment * 0.005;
  drift += asset.sentiment * 0.004;

  // Momentum (mean reversion + FOMO)
  drift += asset.momentum * 0.003;

  // Event shocks — ticker-specific events (earnings) hit 5× harder than category events
  for (const event of activeEvents) {
    if (event.affectedTicker && event.affectedTicker === asset.ticker) {
      drift += event.impactMultiplier * 0.10;
    } else if (event.affectedCategories.includes(asset.category)) {
      drift += event.impactMultiplier * 0.02;
    }
  }

  // Phase influence
  drift *= phaseMultiplier;

  // Meme stocks: extra casino randomness
  if (asset.category === 'meme' && Math.random() < 0.05) {
    drift += gaussianRandom(0, 0.15);
  }

  const newPrice = Math.max(0.01, asset.price * (1 + drift));
  const newMomentum = asset.momentum * 0.85 + drift * 5;
  const newSentiment = asset.sentiment * 0.92 + (drift > 0 ? 0.05 : -0.05);

  const priceHistory = [...asset.priceHistory, newPrice].slice(-100);

  return {
    ...asset,
    price: newPrice,
    priceHistory,
    momentum: Math.max(-1, Math.min(1, newMomentum)),
    sentiment: Math.max(-1, Math.min(1, newSentiment)),
  };
}

export function updateMarketPhase(
  currentPhase: GameState['marketPhase'],
  globalSentiment: number,
  _tick: number,
): GameState['marketPhase'] {
  const rand = Math.random();

  if (globalSentiment > 0.6 && rand < 0.1) return 'euphoria';
  if (globalSentiment < -0.6 && rand < 0.15) return 'panic';
  if (globalSentiment > 0.2 && rand < 0.15) return 'bull';
  if (globalSentiment < -0.2 && rand < 0.15) return 'bear';
  if (rand < 0.05) return 'sideways';

  return currentPhase;
}

export function updateGlobalSentiment(
  current: number,
  marketPhase: GameState['marketPhase'],
  events: NewsEvent[],
): number {
  let delta = gaussianRandom(0, 0.04);

  if (marketPhase === 'panic') delta -= 0.06;
  if (marketPhase === 'euphoria') delta += 0.06;

  for (const e of events) {
    delta += e.impactMultiplier * 0.08;
  }

  // Mean reversion
  delta -= current * 0.1;

  return Math.max(-1, Math.min(1, current + delta));
}

// Fallback prices used when Finnhub key is missing or call fails
const FALLBACK_PRICES: Record<string, number> = {
  SPY:  543,
  QQQ:  470,
  VTI:  269,
  TLT:  94,
  XLU:  71,
  NVDA: 131,
  MSFT: 424,
  AMZN: 192,
  GME:  27,
  AMC:  3.2,
  PLTR: 26,
  XOM:  108,
  GLD:  237,
};

export const INITIAL_ASSETS: Omit<Asset, 'priceHistory'>[] = [
  // ── Index ─────────────────────────────────────────────────────────────────
  { id: 'SPY',  name: 'SPDR S&P 500 ETF Trust',             ticker: 'SPY',  category: 'index',  price: 543,  baseVolatility: 0.012, sentiment: 0.1,  momentum: 0.05, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'QQQ',  name: 'Invesco QQQ Trust (NASDAQ-100)',      ticker: 'QQQ',  category: 'index',  price: 470,  baseVolatility: 0.018, sentiment: 0.15, momentum: 0.05, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'VTI',  name: 'Vanguard Total Stock Market ETF',     ticker: 'VTI',  category: 'index',  price: 269,  baseVolatility: 0.011, sentiment: 0.1,  momentum: 0.04, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Stable ────────────────────────────────────────────────────────────────
  { id: 'TLT',  name: 'iShares 20+ Year Treasury Bond ETF', ticker: 'TLT',  category: 'stable', price: FALLBACK_PRICES['TLT']!,  baseVolatility: 0.006, sentiment: 0,    momentum: 0,   stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'XLU',  name: 'Utilities Select Sector SPDR Fund',  ticker: 'XLU',  category: 'stable', price: FALLBACK_PRICES['XLU']!,  baseVolatility: 0.008, sentiment: 0.1,  momentum: 0,   stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Growth ────────────────────────────────────────────────────────────────
  { id: 'NVDA', name: 'NVIDIA Corporation',                 ticker: 'NVDA', category: 'growth', price: FALLBACK_PRICES['NVDA']!, baseVolatility: 0.035, sentiment: 0.35, momentum: 0.15,stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'MSFT', name: 'Microsoft Corporation',              ticker: 'MSFT', category: 'growth', price: FALLBACK_PRICES['MSFT']!, baseVolatility: 0.018, sentiment: 0.2,  momentum: 0.05,stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'AMZN', name: 'Amazon.com Inc.',                    ticker: 'AMZN', category: 'growth', price: FALLBACK_PRICES['AMZN']!, baseVolatility: 0.022, sentiment: 0.15, momentum: 0,   stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Meme ──────────────────────────────────────────────────────────────────
  { id: 'GME',  name: 'GameStop Corp.',                     ticker: 'GME',  category: 'meme',   price: FALLBACK_PRICES['GME']!,  baseVolatility: 0.09,  sentiment: 0.4,  momentum: 0.2, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'AMC',  name: 'AMC Entertainment Holdings',         ticker: 'AMC',  category: 'meme',   price: FALLBACK_PRICES['AMC']!,  baseVolatility: 0.12,  sentiment: 0.5,  momentum: 0.3, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'PLTR', name: 'Palantir Technologies Inc.',         ticker: 'PLTR', category: 'meme',   price: FALLBACK_PRICES['PLTR']!, baseVolatility: 0.07,  sentiment: 0.45, momentum: 0.1, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Event ─────────────────────────────────────────────────────────────────
  { id: 'XOM',  name: 'Exxon Mobil Corporation',            ticker: 'XOM',  category: 'event',  price: FALLBACK_PRICES['XOM']!,  baseVolatility: 0.038, sentiment: 0,    momentum: 0,   stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'GLD',  name: 'SPDR Gold Shares ETF',               ticker: 'GLD',  category: 'event',  price: FALLBACK_PRICES['GLD']!,  baseVolatility: 0.014, sentiment: -0.05,momentum: 0,   stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
];

export function createInitialAssets(realPrices: Record<string, number> = {}): Asset[] {
  return INITIAL_ASSETS.map(a => ({
    ...a,
    price: realPrices[a.ticker] ?? a.price,
    priceHistory: [realPrices[a.ticker] ?? a.price],
  }));
}

// Additional stocks available via the "Add more stocks" button (batches of 10)
export const EXTRA_ASSET_POOL: Omit<Asset, 'priceHistory'>[] = [
  // ── Index ──────────────────────────────────────────────────────────────────
  { id: 'VOO',  name: 'Vanguard S&P 500 ETF',              ticker: 'VOO',  category: 'index',  price: 499, baseVolatility: 0.012, sentiment: 0.1,  momentum: 0.04, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'IWM',  name: 'iShares Russell 2000 ETF',           ticker: 'IWM',  category: 'index',  price: 200, baseVolatility: 0.02,  sentiment: 0.05, momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'DIA',  name: 'SPDR Dow Jones Industrial Avg ETF',  ticker: 'DIA',  category: 'index',  price: 395, baseVolatility: 0.011, sentiment: 0.1,  momentum: 0.03, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'ARKK', name: 'ARK Innovation ETF',                 ticker: 'ARKK', category: 'index',  price: 50,  baseVolatility: 0.045, sentiment: 0.3,  momentum: 0.1,  stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Stable ─────────────────────────────────────────────────────────────────
  { id: 'BND',  name: 'Vanguard Total Bond Market ETF',  ticker: 'BND',  category: 'stable', price: 72,  baseVolatility: 0.004, sentiment: 0,     momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'VYM',  name: 'Vanguard High Dividend Yield ETF',ticker: 'VYM',  category: 'stable', price: 125, baseVolatility: 0.006, sentiment: 0.05,  momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'SCHD', name: 'Schwab US Dividend Equity ETF',   ticker: 'SCHD', category: 'stable', price: 79,  baseVolatility: 0.005, sentiment: 0.05,  momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Growth ─────────────────────────────────────────────────────────────────
  { id: 'AAPL', name: 'Apple Inc.',                      ticker: 'AAPL', category: 'growth', price: 195, baseVolatility: 0.018, sentiment: 0.2,   momentum: 0.05, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'META', name: 'Meta Platforms Inc.',             ticker: 'META', category: 'growth', price: 520, baseVolatility: 0.028, sentiment: 0.3,   momentum: 0.1,  stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'GOOG', name: 'Alphabet Inc.',                   ticker: 'GOOG', category: 'growth', price: 175, baseVolatility: 0.02,  sentiment: 0.15,  momentum: 0.05, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'TSLA', name: 'Tesla Inc.',                      ticker: 'TSLA', category: 'growth', price: 178, baseVolatility: 0.055, sentiment: 0.3,   momentum: 0.15, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'AMD',  name: 'Advanced Micro Devices Inc.',     ticker: 'AMD',  category: 'growth', price: 155, baseVolatility: 0.04,  sentiment: 0.25,  momentum: 0.1,  stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'NFLX', name: 'Netflix Inc.',                    ticker: 'NFLX', category: 'growth', price: 680, baseVolatility: 0.032, sentiment: 0.2,   momentum: 0.05, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'SPOT', name: 'Spotify Technology S.A.',        ticker: 'SPOT', category: 'growth', price: 380, baseVolatility: 0.038, sentiment: 0.15,  momentum: 0.05, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Meme ───────────────────────────────────────────────────────────────────
  { id: 'COIN', name: 'Coinbase Global Inc.',            ticker: 'COIN', category: 'meme',   price: 225, baseVolatility: 0.1,   sentiment: 0.45,  momentum: 0.2,  stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'RIVN', name: 'Rivian Automotive Inc.',          ticker: 'RIVN', category: 'meme',   price: 11,  baseVolatility: 0.13,  sentiment: 0.35,  momentum: 0.1,  stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'HOOD', name: 'Robinhood Markets Inc.',          ticker: 'HOOD', category: 'meme',   price: 22,  baseVolatility: 0.11,  sentiment: 0.5,   momentum: 0.25, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'RBLX', name: 'Roblox Corporation',              ticker: 'RBLX', category: 'meme',   price: 41,  baseVolatility: 0.09,  sentiment: 0.4,   momentum: 0.15, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'SNAP', name: 'Snap Inc.',                       ticker: 'SNAP', category: 'meme',   price: 11,  baseVolatility: 0.12,  sentiment: 0.35,  momentum: 0.1,  stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'BB',   name: 'BlackBerry Ltd.',                 ticker: 'BB',   category: 'meme',   price: 2.8, baseVolatility: 0.14,  sentiment: 0.3,   momentum: 0.05, stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  // ── Event ──────────────────────────────────────────────────────────────────
  { id: 'BP',   name: 'BP PLC',                          ticker: 'BP',   category: 'event',  price: 38,  baseVolatility: 0.035, sentiment: -0.05, momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'F',    name: 'Ford Motor Company',              ticker: 'F',    category: 'event',  price: 11,  baseVolatility: 0.042, sentiment: 0,     momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'NKE',  name: 'Nike Inc.',                       ticker: 'NKE',  category: 'event',  price: 75,  baseVolatility: 0.028, sentiment: 0,     momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'DIS',  name: 'The Walt Disney Company',         ticker: 'DIS',  category: 'event',  price: 90,  baseVolatility: 0.036, sentiment: 0.05,  momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'SLV',  name: 'iShares Silver Trust',            ticker: 'SLV',  category: 'event',  price: 28,  baseVolatility: 0.022, sentiment: -0.05, momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
  { id: 'USO',  name: 'United States Oil Fund',          ticker: 'USO',  category: 'event',  price: 78,  baseVolatility: 0.048, sentiment: 0,     momentum: 0,    stopLoss: null, takeProfit: null, isShorted: false, leverage: 1 },
];

export function createAssetsFromPool(
  batch: typeof EXTRA_ASSET_POOL,
  realPrices: Record<string, number> = {}
): Asset[] {
  return batch.map(a => ({
    ...a,
    price: realPrices[a.ticker] ?? a.price,
    priceHistory: [realPrices[a.ticker] ?? a.price],
  }));
}
