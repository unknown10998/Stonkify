export type AssetCategory = 'stable' | 'growth' | 'meme' | 'event' | 'index';
export type GameMode = 'endless' | 'timed' | 'survival';
export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';
export type BetType = 'market_up' | 'market_down' | 'crash' | 'sector_outperform';
export type BetStatus = 'active' | 'won' | 'lost' | 'expired';

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  category: AssetCategory;
  price: number;
  priceHistory: number[];
  baseVolatility: number;
  sentiment: number;      // -1 to 1
  momentum: number;       // -1 to 1
  stopLoss: number | null;
  takeProfit: number | null;
  isShorted: boolean;
  leverage: number;       // 1 = no leverage
}

export interface Holding {
  assetId: string;
  shares: number;
  avgBuyPrice: number;
  isShorted: boolean;
  leverage: number;
}

export interface NewsEvent {
  id: string;
  headline: string;
  body: string;
  timestamp: number;
  affectedCategories: AssetCategory[];
  affectedTicker?: string;  // specific stock (earnings / company news)
  impactMultiplier: number; // negative = bad, positive = good
  type: 'macro' | 'sector' | 'black_swan' | 'hype' | 'earnings';
}

export interface Bet {
  id: string;
  type: BetType;
  amount: number;
  multiplier: number;
  resolveAt: number;        // game tick
  targetAssetId?: string;
  targetEntryPrice?: number; // asset price at bet placement (sector_outperform)
  entrySentiment?: number;   // sentiment at bet placement (market_up / market_down)
  status: BetStatus;
  description: string;
  payout?: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  netWorth: number;
  mode: GameMode;
  date: string;
  survived: number;
}

export interface RiskMetrics {
  volatilityScore: number;    // 0-100
  exposureByCategory: Record<AssetCategory, number>;
  crashProbability: number;   // 0-100
  liquidityHealth: number;    // 0-100
  leverageRatio: number;
}

export interface TradeEntry {
  id:     string;
  tick:   number;
  type:   'buy' | 'sell' | 'short' | 'cover';
  ticker: string;
  shares: number;
  price:  number;
  total:  number;
  pnl?:   number;
}

export interface NetWorthPoint {
  tick:  number;
  value: number;
}

export interface GameState {
  status: GameStatus;
  mode: GameMode;
  tick: number;
  cash: number;
  startingCash: number;
  assets: Asset[];
  holdings: Holding[];
  bets: Bet[];
  news: NewsEvent[];
  leaderboard: LeaderboardEntry[];
  riskMetrics: RiskMetrics;
  globalSentiment: number;  // -1 to 1
  marketPhase: 'bull' | 'bear' | 'sideways' | 'panic' | 'euphoria';
  roundsRemaining: number;  // for timed mode
  playerName: string;
  totalPnl: number;
  peakNetWorth: number;
  netWorthHistory: NetWorthPoint[];
  tradeHistory: TradeEntry[];
  // Achievement tracking flags (updated during play, checked per-tick and at game over)
  hasUsedLeverage: boolean;
  hasHeldPanic: boolean;
  hasHeldEuphoria: boolean;
  hasHeldBear: boolean;
  hasSeenBlackSwan: boolean;
  hasBeenDiversified: boolean;
  hasBeenShortSqueezed: boolean;
  hasSurvivedMarginCall: boolean;
  hasWonCrashBet: boolean;
  hasWonBigBet: boolean;
  hasPlacedBet: boolean;
  hasBeenAlmostBroke: boolean;   // net worth dropped below 50% of startingCash
  maxSingleConcentration: number; // peak fraction of net worth in a single asset (0–1)
  peakMemeHoldings: number;       // most meme stocks held simultaneously
  peakHoldingsCount: number;      // most distinct assets held simultaneously
  newAchievements: string[];      // IDs earned this run (for game over display)
}
