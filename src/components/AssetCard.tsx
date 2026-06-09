import { useState, useRef } from 'react';
import { Shield, Target, Maximize2 } from 'lucide-react';
import type { Asset } from '../types';
import { useGameStore } from '../store/gameStore';
import { useNotificationStore } from '../store/notificationStore';
import { useSettingsStore } from '../store/settingsStore';
import PriceChart from './PriceChart';
import clsx from 'clsx';

const SIZE = {
  sm: { pad: 'p-3',   tickerText: 'text-base', priceText: 'text-lg',  chartH: 0,   btnPy: 'py-2',   showTip: false },
  md: { pad: 'p-4',   tickerText: 'text-lg',   priceText: 'text-xl',  chartH: 80,  btnPy: 'py-3',   showTip: true  },
  lg: { pad: 'p-5',   tickerText: 'text-xl',   priceText: 'text-2xl', chartH: 120, btnPy: 'py-3.5', showTip: true  },
};

const CATEGORY_COLORS = {
  stable: 'border-blue-500/40 bg-blue-950/20',
  growth: 'border-purple-500/40 bg-purple-950/20',
  meme:   'border-yellow-500/40 bg-yellow-950/20',
  event:  'border-orange-500/40 bg-orange-950/20',
  index:  'border-teal-500/40 bg-teal-950/20',
};

const CATEGORY_BADGES = {
  stable: { label: 'STABLE', cls: 'bg-blue-900/60 text-blue-300',     tip: 'Low risk, slow & steady. Safe haven during crashes.' },
  growth: { label: 'GROWTH', cls: 'bg-purple-900/60 text-purple-300', tip: 'Trend-driven. Big swings. Loves AI/biotech hype cycles.' },
  meme:   { label: 'MEME',   cls: 'bg-yellow-900/60 text-yellow-300', tip: 'Casino-mode. Can 5x or collapse 80% in minutes.' },
  event:  { label: 'EVENT',  cls: 'bg-orange-900/60 text-orange-300', tip: 'Explodes on news. Oil, geopolitics — unpredictable.' },
  index:  { label: 'INDEX',  cls: 'bg-teal-900/60 text-teal-300',     tip: 'Tracks a broad market index. Low volatility, follows overall sentiment.' },
};

const STOCK_DESC: Record<string, string> = {
  TLT:  'Tracks 20+ year U.S. Treasury bonds — the most interest-rate-sensitive bond ETF available.',
  XLU:  'Holds large U.S. utility companies offering stable dividends and defensive protection during downturns.',
  NVDA: 'Designs GPUs that dominate AI training and data center workloads — the central hardware pick of the AI boom.',
  MSFT: 'Operates Azure cloud, Office 365, and GitHub while embedding AI across every product via its OpenAI partnership.',
  AMZN: 'Runs the world\'s largest e-commerce platform alongside AWS, the dominant cloud provider funding its expansion.',
  GME:  'A struggling video game retailer turned meme-stock icon whose price is driven by social media sentiment and retail traders.',
  AMC:  'The world\'s largest movie theater chain, kept alive by meme-stock capital raises and dependent on Hollywood\'s box office.',
  PLTR: 'Builds AI analytics platforms for U.S. defense agencies and enterprises with long-term government contracts at its core.',
  XOM:  'One of the world\'s largest oil and gas producers, with earnings tightly tied to crude prices, OPEC decisions, and refining margins.',
  GLD:  'The world\'s largest gold-backed ETF, tracking gold prices driven by real interest rates, dollar strength, and geopolitical risk.',
  BND:  'Tracks the full U.S. investment-grade bond market, serving as a low-volatility portfolio anchor.',
  VYM:  'Holds high-dividend U.S. large-caps, offering income-focused equity exposure with below-market volatility.',
  SCHD: 'Tracks quality U.S. dividend-growth stocks screened for yield sustainability and consistent payout history.',
  AAPL: 'The world\'s most valuable company, generating revenue from iPhones, the App Store ecosystem, and fast-growing services.',
  META: 'Owns Facebook, Instagram, and WhatsApp, monetizing them through digital advertising while investing heavily in AI infrastructure.',
  GOOG: 'Parent of Google Search, YouTube, and Google Cloud, earning most of its revenue from the world\'s largest digital ad platform.',
  TSLA: 'Designs and sells electric vehicles and energy storage, with a stock price driven as much by Elon Musk\'s vision as by fundamentals.',
  AMD:  'Makes CPUs and GPUs competing with Intel and NVIDIA, with its MI-series AI chips gaining meaningful data center market share.',
  NFLX: 'The world\'s leading streaming platform with 270M+ subscribers, expanding into live events and ad-supported tiers.',
  SPOT: 'The world\'s largest music streaming service, monetizing 600M+ monthly users through premium subscriptions and podcast advertising.',
  COIN: 'The largest U.S. crypto exchange, with revenue directly correlated to Bitcoin and Ethereum trading volumes.',
  RIVN: 'An EV startup backed by Amazon producing electric delivery vans and consumer trucks while scaling costly manufacturing operations.',
  HOOD: 'A commission-free retail brokerage whose revenue depends on payment-for-order-flow and crypto trading activity.',
  RBLX: 'An online gaming platform where users build and play user-generated games, monetized through its Robux virtual currency.',
  SNAP: 'Operates Snapchat, a Gen-Z-focused social app generating revenue through digital advertising on ephemeral content.',
  BB:   'A former smartphone giant now focused on enterprise cybersecurity software and IoT operating systems.',
  BP:   'A British integrated oil major producing crude globally while investing in offshore wind and low-carbon energy transition.',
  F:    'A century-old U.S. automaker racing to electrify its lineup with the F-150 Lightning while defending pickup truck dominance.',
  NKE:  'The world\'s largest athletic footwear and apparel brand, selling through its own channels and wholesale retail partners globally.',
  DIS:  'Owns Marvel, Star Wars, Disney+, and its theme parks — balancing streaming losses against blockbuster IP revenue.',
  SLV:  'Tracks silver prices driven by industrial demand (solar, electronics) alongside investment and safe-haven flows.',
  USO:  'Tracks near-month WTI crude oil futures, providing direct exposure to oil prices driven by OPEC+ and global demand.',
  // Index funds
  SPY:  'Tracks the S&P 500 — the 500 largest U.S. companies — making it the most widely-held ETF in the world.',
  QQQ:  'Tracks the NASDAQ-100, concentrated in the largest non-financial tech companies like Apple, NVIDIA, and Microsoft.',
  VTI:  'Covers the entire U.S. stock market across large, mid, and small caps — the broadest possible domestic equity exposure.',
  VOO:  'Vanguard\'s S&P 500 fund, near-identical to SPY but with a lower expense ratio — a long-term investor favourite.',
  IWM:  'Tracks 2,000 small-cap U.S. companies — more sensitive to domestic economic conditions than large-cap indices.',
  DIA:  'Tracks the Dow Jones Industrial Average — 30 iconic blue-chip American companies including Boeing, Goldman, and Nike.',
  ARKK: 'ARK\'s actively managed disruptive-innovation fund holding Tesla, Coinbase, and speculative tech — high conviction, high volatility.',
};

interface Props { asset: Asset; onOpen?: () => void }

export default function AssetCard({ asset, onOpen }: Props) {
  const { cash, holdings, buyAsset, sellAsset, shortAsset, coverShort, setStopLoss, setTakeProfit } = useGameStore();
  const push     = useNotificationStore(s => s.push);
  const itemSize = useSettingsStore(s => s.itemSize);
  const sz       = SIZE[itemSize];
  const [qty, setQty] = useState('1');
  const [leverage, setLeverage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [slInput, setSlInput] = useState('');
  const [tpInput, setTpInput] = useState('');
  const [flashClass, setFlashClass] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const holding      = holdings.find(h => h.assetId === asset.id && !h.isShorted);
  const shortHolding = holdings.find(h => h.assetId === asset.id && h.isShorted);
  const prevPrice    = asset.priceHistory[asset.priceHistory.length - 2] ?? asset.price;
  const change       = asset.price - prevPrice;
  const changePct    = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
  const isUp         = change >= 0;
  const decimals     = asset.price < 1 ? 4 : asset.price < 10 ? 3 : 2;
  const qtyNum       = parseFloat(qty) || 0;
  const canBuy   = cash >= qtyNum * asset.price && qtyNum > 0;
  const canSell  = (holding?.shares ?? 0) >= qtyNum && qtyNum > 0;
  const canShort = cash >= qtyNum * asset.price * 0.5 && qtyNum > 0;
  const canCover = (shortHolding?.shares ?? 0) >= qtyNum && qtyNum > 0;

  const flash = (cls: 'flash-buy' | 'flash-sell') => {
    setFlashClass(cls);
    setTimeout(() => setFlashClass(''), 700);
  };

  function handleBuy() {
    if (!canBuy) return;
    buyAsset(asset.id, qtyNum, leverage);
    push(`Bought ${qtyNum} ${asset.ticker}`, 'buy', `@ $${asset.price.toFixed(decimals)} · ${leverage}× leverage`);
    flash('flash-buy');
  }

  function handleSell() {
    if (!canSell) return;
    const proceeds = qtyNum * asset.price;
    const cost     = holding ? holding.avgBuyPrice * qtyNum : proceeds;
    const pnl      = proceeds - cost;
    sellAsset(asset.id, qtyNum);
    push(`Sold ${qtyNum} ${asset.ticker}`, pnl >= 0 ? 'sell' : 'loss',
      `+$${proceeds.toFixed(0)} · PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`);
    flash(pnl >= 0 ? 'flash-buy' : 'flash-sell');
  }

  function handleShort() {
    if (!canShort) return;
    shortAsset(asset.id, qtyNum, leverage);
    push(`Shorted ${qtyNum} ${asset.ticker}`, 'short', `@ $${asset.price.toFixed(decimals)}`);
    flash('flash-sell');
  }

  function handleCover() {
    if (!canCover) return;
    const pnl = shortHolding ? (shortHolding.avgBuyPrice - asset.price) * qtyNum : 0;
    coverShort(asset.id, qtyNum);
    push(`Covered ${qtyNum} ${asset.ticker}`, pnl >= 0 ? 'win' : 'loss',
      `PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`);
    flash(pnl >= 0 ? 'flash-buy' : 'flash-sell');
  }

  const badge = CATEGORY_BADGES[asset.category];

  return (
    <div
      ref={cardRef}
      className={clsx('rounded-2xl border flex flex-col gap-3 transition-all', sz.pad, CATEGORY_COLORS[asset.category], flashClass)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('text-white font-black', sz.tickerText)}>{asset.ticker}</span>
            <span
              className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', badge.cls)}
              title={badge.tip}
            >
              {badge.label}
            </span>
          </div>
          <div className="text-gray-400 text-sm">{asset.name}</div>
          {STOCK_DESC[asset.ticker] && (
            <div className="text-gray-600 text-xs mt-0.5 leading-snug">{STOCK_DESC[asset.ticker]}</div>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="text-right">
            <div className={clsx('text-white font-mono font-bold', sz.priceText)}>
              ${asset.price.toFixed(decimals)}
            </div>
            <div className={clsx('text-sm font-mono font-semibold', isUp ? 'text-green-400' : 'text-red-400')}>
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </div>
          </div>
          {onOpen && (
            <button
              onClick={onOpen}
              className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-500 hover:text-white transition-colors border border-gray-700/50"
              title="Open stock details"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>

      {sz.chartH > 0 && <PriceChart asset={asset} height={sz.chartH} />}

      {/* Holdings */}
      {(holding || shortHolding) && (
        <div className="text-sm bg-gray-900/60 rounded-xl p-3 flex flex-col gap-1.5 border border-gray-700/40">
          {holding && (
            <div className="flex justify-between">
              <span className="text-gray-400">Long: {holding.shares.toFixed(2)} @ ${holding.avgBuyPrice.toFixed(decimals)}</span>
              <span className={clsx('font-semibold', (asset.price - holding.avgBuyPrice) >= 0 ? 'text-green-400' : 'text-red-400')}>
                {((asset.price - holding.avgBuyPrice) / holding.avgBuyPrice * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {shortHolding && (
            <div className="flex justify-between">
              <span className="text-gray-400">Short: {shortHolding.shares.toFixed(2)} @ ${shortHolding.avgBuyPrice.toFixed(decimals)}</span>
              <span className={clsx('font-semibold', (shortHolding.avgBuyPrice - asset.price) >= 0 ? 'text-green-400' : 'text-red-400')}>
                {((shortHolding.avgBuyPrice - asset.price) / shortHolding.avgBuyPrice * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {asset.stopLoss   && <div className="text-orange-400 text-xs">Stop-Loss: ${asset.stopLoss.toFixed(decimals)}</div>}
          {asset.takeProfit && <div className="text-cyan-400 text-xs">Take-Profit: ${asset.takeProfit.toFixed(decimals)}</div>}
        </div>
      )}

      {/* Trade controls row */}
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="w-20 bg-gray-800 text-white text-sm rounded-lg px-3 py-2.5 border border-gray-600 font-mono"
          min="0.01"
          step="0.01"
        />
        <select
          value={leverage}
          onChange={e => setLeverage(Number(e.target.value))}
          className="bg-gray-800 text-white text-sm rounded-lg px-2 py-2.5 border border-gray-600"
        >
          {[1,2,5,10].map(v => <option key={v} value={v}>{v}×</option>)}
        </select>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={clsx('p-2.5 rounded-lg border text-sm transition-colors',
            showSettings ? 'bg-cyan-900/50 border-cyan-600 text-cyan-300' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white')}
          title="Set Stop-Loss / Take-Profit"
        >
          <Target size={15} />
        </button>
      </div>

      {/* SL / TP inputs */}
      {showSettings && (
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex gap-2 items-center">
            <Shield size={13} className="text-orange-400 shrink-0" />
            <input
              type="number"
              placeholder="Stop-loss price"
              value={slInput}
              onChange={e => setSlInput(e.target.value)}
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-orange-600/40 text-sm"
            />
            <button
              onClick={() => { setStopLoss(asset.id, parseFloat(slInput) || null); setShowSettings(false); }}
              className="px-3 py-2 bg-orange-800 hover:bg-orange-700 rounded-lg text-orange-200 text-sm font-semibold"
            >Set</button>
          </div>
          <div className="flex gap-2 items-center">
            <Target size={13} className="text-cyan-400 shrink-0" />
            <input
              type="number"
              placeholder="Take-profit price"
              value={tpInput}
              onChange={e => setTpInput(e.target.value)}
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-cyan-600/40 text-sm"
            />
            <button
              onClick={() => { setTakeProfit(asset.id, parseFloat(tpInput) || null); setShowSettings(false); }}
              className="px-3 py-2 bg-cyan-800 hover:bg-cyan-700 rounded-lg text-cyan-200 text-sm font-semibold"
            >Set</button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleBuy}
          disabled={!canBuy}
          className={clsx(sz.btnPy, 'text-sm font-black rounded-xl bg-green-700 hover:bg-green-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors tracking-wide')}
        >
          BUY
        </button>
        <button
          onClick={handleSell}
          disabled={!canSell}
          className={clsx(sz.btnPy, 'text-sm font-black rounded-xl bg-red-700 hover:bg-red-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors tracking-wide')}
        >
          SELL
        </button>
        <button
          onClick={handleShort}
          disabled={!canShort}
          className={clsx(sz.btnPy, 'text-sm font-black rounded-xl bg-purple-700 hover:bg-purple-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors tracking-wide')}
        >
          SHORT
        </button>
        <button
          onClick={handleCover}
          disabled={!canCover}
          className={clsx(sz.btnPy, 'text-sm font-black rounded-xl bg-pink-700 hover:bg-pink-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors tracking-wide')}
        >
          COVER
        </button>
      </div>
    </div>
  );
}
