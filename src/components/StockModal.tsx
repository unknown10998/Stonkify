import { useEffect, useState, useRef } from 'react';
import { X, Shield, Target, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import type { Asset } from '../types';
import { useGameStore } from '../store/gameStore';
import { useNotificationStore } from '../store/notificationStore';
import { GEMINI_API_KEY } from '../config';
import PriceChart from './PriceChart';
import clsx from 'clsx';

// ── Fallback descriptions (shown when Gemini is unavailable) ──────────────────
const FALLBACK_DESC: Record<string, string> = {
  TLT: "TLT tracks U.S. Treasury bonds with maturities over 20 years, making it highly sensitive to interest rate decisions by the Federal Reserve. When the Fed raises rates, TLT typically falls sharply; when rates drop or the economy weakens, TLT surges as investors flee to safety. Traders use it as a safe-haven hedge during equity market crashes or recessions. Its long duration makes it one of the most interest-rate-sensitive bond ETFs available.",
  XLU: "XLU holds large-cap U.S. utility companies like NextEra Energy, Duke Energy, and Southern Company, which provide essential services regardless of economic conditions. The sector is considered defensive — utilities maintain steady dividends and tend to hold value when growth stocks sell off. It underperforms in rising-rate environments because utility yields compete with bonds for income-seeking investors. During stock market panics, XLU often holds up far better than cyclical or meme sectors.",
  NVDA: "NVIDIA designs GPUs that have become the dominant hardware for AI model training and inference, powering data centers at Microsoft, Google, Amazon, and Meta. The company's H100 and Blackwell chips are at the center of the global AI arms race, making NVDA stock a direct proxy for AI capital spending trends. Demand consistently outstrips supply, and export restrictions on advanced chips to China add geopolitical risk to the upside story. NVIDIA has grown to become one of the world's most valuable companies on the back of the generative AI boom.",
  MSFT: "Microsoft is a diversified technology giant operating across cloud computing (Azure), productivity software (Office 365), gaming (Xbox), and enterprise AI through its deep partnership with OpenAI. Azure's quarterly growth rate is closely watched by investors as a proxy for overall enterprise cloud adoption and AI workload demand. The company has aggressively integrated AI 'Copilot' features across its entire product suite, from Windows to GitHub. Microsoft's strong free cash flow, recurring revenue model, and dividend growth make it attractive to both growth and income investors.",
  AMZN: "Amazon operates the world's largest e-commerce marketplace alongside Amazon Web Services (AWS), the dominant cloud infrastructure provider that generates the majority of Amazon's operating profit. AWS growth rates are the single most important metric for the stock, as the cloud segment subsidizes Amazon's massive investment in logistics, advertising, and consumer technology. The company's advertising business has emerged as a high-margin revenue stream that rivals Meta and Google in scale. Amazon is also investing heavily in AI, robotics for its fulfillment centers, and the Kuiper satellite internet project.",
  GME: "GameStop is a brick-and-mortar video game retailer that became the center of the 2021 meme stock frenzy when Reddit's WallStreetBets community coordinated a short squeeze, sending shares from under $5 to nearly $500. The company has struggled to find a profitable business model in an era of digital game downloads and streaming, though it accumulated significant cash reserves through share offerings at inflated prices. Its stock remains heavily driven by social media sentiment, Ryan Cohen's involvement, and periodic retail investor surges rather than any fundamental business narrative. GME is the defining symbol of retail trader power versus institutional short sellers.",
  AMC: "AMC Entertainment is the world's largest movie theater chain, which faced near-bankruptcy during the COVID-19 pandemic when theaters were forced to close globally. Like GameStop, it became a meme stock phenomenon in 2021 when retail traders piled in to squeeze short sellers, and the company used the elevated prices to raise capital and survive. AMC's fortunes now depend on Hollywood's theatrical release calendar, competition from streaming services, and whether the post-pandemic moviegoing habit has permanently changed. The stock remains a speculative vehicle closely tied to retail investor sentiment rather than box office fundamentals.",
  PLTR: "Palantir builds AI and data analytics platforms used by government intelligence agencies and large enterprises across defense, healthcare, and finance. Its Gotham platform serves U.S. and allied defense and intelligence clients, while Foundry and the AIP platform target commercial AI use cases including factory automation and supply chain optimization. Palantir generates significant and sticky revenue from long-term U.S. government contracts and has been rapidly growing its commercial customer base. The stock trades at a high premium relative to revenue, making it extremely sensitive to AI sentiment, government budget cycles, and growth narrative shifts.",
  XOM: "ExxonMobil is one of the world's largest publicly traded oil and gas companies, producing millions of barrels of oil equivalent per day across upstream exploration, downstream refining, and chemicals. Its stock price is tightly correlated with global crude oil benchmarks like Brent and WTI, which are driven by OPEC+ production decisions, geopolitical conflicts, and global economic growth expectations. The company has been returning billions to shareholders through dividends and buybacks while making selective investments in carbon capture and lower-emission technologies. ExxonMobil's 2024 acquisition of Pioneer Natural Resources significantly expanded its Permian Basin footprint and production capacity.",
  GLD: "GLD is the world's largest gold-backed ETF, holding physical gold bars in vaults in London and New York, and serves as the most liquid vehicle for gaining direct exposure to gold prices. Gold prices are primarily driven by real interest rates (gold rises when inflation-adjusted yields fall), the U.S. dollar index, geopolitical uncertainty, and central bank reserve buying — particularly by China and emerging market central banks. Central banks globally have been net buyers of gold since 2022 at a historically elevated pace, providing a structural demand floor. Many portfolio managers hold GLD as a non-correlated asset to hedge against equity market drawdowns, dollar debasement, and systemic financial risk.",
};

function getFallback(ticker: string, name: string): string {
  return FALLBACK_DESC[ticker] ?? `${name} (${ticker}) is a financial instrument actively traded in this simulation. Its price responds to market phase transitions, global sentiment shifts, and in-game news events. Monitor its volatility score and category characteristics to time your entries and exits. Use stop-losses on leveraged positions to limit downside risk.`;
}

// ── Module-level description cache ────────────────────────────────────────────
const descCache: Record<string, string> = {};

async function fetchDescription(ticker: string, name: string): Promise<string> {
  if (descCache[ticker]) return descCache[ticker]!;
  if (!GEMINI_API_KEY) return getFallback(ticker, name);

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: `In exactly 3–4 sentences, describe what ${name} (ticker: ${ticker}) is, what it does or holds, and what factors most drive its stock or ETF price. Include why traders and investors watch it closely. Be factual, concise, and written for an intermediate investor.` }],
      }],
    });
    const text = res.text?.trim() ?? getFallback(ticker, name);
    descCache[ticker] = text;
    return text;
  } catch {
    const fb = getFallback(ticker, name);
    descCache[ticker] = fb;
    return fb;
  }
}

// ── Category styling ──────────────────────────────────────────────────────────
const CAT = {
  stable: { badge: 'bg-blue-900/60 text-blue-300 border-blue-500/40',     border: 'border-blue-500/30'   },
  growth: { badge: 'bg-purple-900/60 text-purple-300 border-purple-500/40', border: 'border-purple-500/30' },
  meme:   { badge: 'bg-yellow-900/60 text-yellow-300 border-yellow-500/40', border: 'border-yellow-500/30' },
  event:  { badge: 'bg-orange-900/60 text-orange-300 border-orange-500/40', border: 'border-orange-500/30' },
  index:  { badge: 'bg-teal-900/60 text-teal-300 border-teal-500/40',     border: 'border-teal-500/30'   },
};

interface Props {
  asset: Asset;
  onClose: () => void;
}

export default function StockModal({ asset, onClose }: Props) {
  const { cash, holdings, buyAsset, sellAsset, shortAsset, coverShort, setStopLoss, setTakeProfit } = useGameStore();
  const push = useNotificationStore(s => s.push);

  const [qty, setQty]             = useState('1');
  const [leverage, setLeverage]   = useState(1);
  const [slInput, setSlInput]     = useState(asset.stopLoss?.toString() ?? '');
  const [tpInput, setTpInput]     = useState(asset.takeProfit?.toString() ?? '');
  const [desc, setDesc]           = useState('');
  const [loadingDesc, setLoading] = useState(true);
  const [flashClass, setFlash]    = useState('');
  const fetchedRef                = useRef(false);

  const holding      = holdings.find(h => h.assetId === asset.id && !h.isShorted);
  const shortHolding = holdings.find(h => h.assetId === asset.id && h.isShorted);
  const history      = asset.priceHistory;
  const sessionHigh  = Math.max(...history);
  const sessionLow   = Math.min(...history);
  const sessionStart = history[0] ?? asset.price;
  const sessionChg   = ((asset.price - sessionStart) / sessionStart) * 100;
  const decimals     = asset.price < 1 ? 4 : asset.price < 10 ? 3 : 2;
  const prevPrice    = history[history.length - 2] ?? asset.price;
  const tickChange   = ((asset.price - prevPrice) / prevPrice) * 100;
  const isUp         = tickChange >= 0;
  const qtyNum       = parseFloat(qty) || 0;
  const canBuy   = cash >= qtyNum * asset.price && qtyNum > 0;
  const canSell  = (holding?.shares ?? 0) >= qtyNum && qtyNum > 0;
  const canShort = cash >= qtyNum * asset.price * 0.5 && qtyNum > 0;
  const canCover = (shortHolding?.shares ?? 0) >= qtyNum && qtyNum > 0;

  const cat = CAT[asset.category];

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchDescription(asset.ticker, asset.name).then(t => {
      setDesc(t);
      setLoading(false);
    });
  }, [asset.ticker, asset.name]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function flash(cls: 'flash-buy' | 'flash-sell') {
    setFlash(cls);
    setTimeout(() => setFlash(''), 700);
  }

  function handleBuy() {
    if (!canBuy) return;
    buyAsset(asset.id, qtyNum, leverage);
    push(`Bought ${qtyNum} ${asset.ticker}`, 'buy', `@ $${asset.price.toFixed(decimals)} · ${leverage}×`);
    flash('flash-buy');
  }
  function handleSell() {
    if (!canSell) return;
    const proceeds = qtyNum * asset.price;
    const cost = holding ? holding.avgBuyPrice * qtyNum : proceeds;
    const pnl = proceeds - cost;
    sellAsset(asset.id, qtyNum);
    push(`Sold ${qtyNum} ${asset.ticker}`, pnl >= 0 ? 'sell' : 'loss', `PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`);
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
    push(`Covered ${qtyNum} ${asset.ticker}`, pnl >= 0 ? 'win' : 'loss', `PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`);
    flash(pnl >= 0 ? 'flash-buy' : 'flash-sell');
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={clsx('relative z-10 bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border', cat.border, flashClass)}
        style={{ width: '900px', maxWidth: '96vw', maxHeight: '94vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-7 py-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white font-black text-2xl tracking-tight">{asset.ticker}</span>
              <span className={clsx('text-xs px-2.5 py-1 rounded-full font-bold border', cat.badge)}>
                {asset.category.toUpperCase()}
              </span>
              <span className={clsx('text-sm font-semibold flex items-center gap-1', isUp ? 'text-green-400' : 'text-red-400')}>
                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isUp ? '+' : ''}{tickChange.toFixed(2)}% this tick
              </span>
            </div>
            <div className="text-gray-400 text-sm mt-0.5 truncate">{asset.name}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-white font-black text-3xl font-mono">${asset.price.toFixed(decimals)}</div>
            <div className={clsx('text-sm font-mono', sessionChg >= 0 ? 'text-green-400' : 'text-red-400')}>
              {sessionChg >= 0 ? '+' : ''}{sessionChg.toFixed(2)}% session
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* ── Body: two columns on md+, stacked on mobile ── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">

          {/* Left — Chart + Stats + Description */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 border-b md:border-b-0 md:border-r border-gray-800">

            {/* Price chart */}
            <div className="bg-gray-950 rounded-2xl border border-gray-800 p-4">
              <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Price History (this session)</div>
              <PriceChart asset={asset} height={200} />
            </div>

            {/* Session stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Session High', value: `$${sessionHigh.toFixed(decimals)}`, color: 'text-green-400' },
                { label: 'Session Low',  value: `$${sessionLow.toFixed(decimals)}`,  color: 'text-red-400'   },
                { label: 'Session Δ',    value: `${sessionChg >= 0 ? '+' : ''}${sessionChg.toFixed(2)}%`, color: sessionChg >= 0 ? 'text-green-400' : 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-950 rounded-xl p-3 border border-gray-800 text-center">
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{s.label}</div>
                  <div className={clsx('font-mono font-bold text-lg', s.color)}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* AI Description */}
            <div className="bg-gray-950 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">About This Asset</div>
                {GEMINI_API_KEY && (
                  <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-400 border border-green-700/40 rounded-full">Gemini</span>
                )}
              </div>
              {loadingDesc ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Fetching description…
                </div>
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed">{desc}</p>
              )}
            </div>
          </div>

          {/* Right — Trade panel */}
          <div className="w-full md:w-72 flex-shrink-0 overflow-y-auto p-4 md:p-5 flex flex-col gap-4">

            {/* Cash available */}
            <div className="bg-gray-950 rounded-xl border border-gray-800 p-3 text-sm">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Available Cash</div>
              <div className="text-white font-mono font-bold">${cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>

            {/* Current position */}
            {(holding || shortHolding) && (
              <div className="bg-gray-950 rounded-xl border border-gray-800 p-4 flex flex-col gap-2">
                <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Your Position</div>
                {holding && (() => {
                  const pnlPct = ((asset.price - holding.avgBuyPrice) / holding.avgBuyPrice) * 100;
                  const pnlDol = (asset.price - holding.avgBuyPrice) * holding.shares;
                  return (
                    <div className="text-sm">
                      <div className="text-gray-300">Long: <span className="font-mono text-white">{holding.shares.toFixed(2)} shares</span></div>
                      <div className="text-gray-500">Avg cost: ${holding.avgBuyPrice.toFixed(decimals)}</div>
                      <div className={clsx('font-semibold mt-1', pnlPct >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% ({pnlPct >= 0 ? '+' : ''}${pnlDol.toFixed(0)})
                      </div>
                    </div>
                  );
                })()}
                {shortHolding && (() => {
                  const pnlPct = ((shortHolding.avgBuyPrice - asset.price) / shortHolding.avgBuyPrice) * 100;
                  const pnlDol = (shortHolding.avgBuyPrice - asset.price) * shortHolding.shares;
                  return (
                    <div className="text-sm">
                      <div className="text-gray-300">Short: <span className="font-mono text-white">{shortHolding.shares.toFixed(2)} shares</span></div>
                      <div className="text-gray-500">Entry: ${shortHolding.avgBuyPrice.toFixed(decimals)}</div>
                      <div className={clsx('font-semibold mt-1', pnlPct >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% ({pnlPct >= 0 ? '+' : ''}${pnlDol.toFixed(0)})
                      </div>
                    </div>
                  );
                })()}
                {asset.stopLoss   && <div className="text-orange-400 text-xs">Stop-Loss: ${asset.stopLoss.toFixed(decimals)}</div>}
                {asset.takeProfit && <div className="text-cyan-400 text-xs">Take-Profit: ${asset.takeProfit.toFixed(decimals)}</div>}
              </div>
            )}

            {/* Qty + Leverage */}
            <div className="flex flex-col gap-3">
              <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Order</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-gray-500 text-xs mb-1">Quantity</div>
                  <input
                    type="number"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2.5 border border-gray-600 font-mono"
                    min="0.01" step="0.01"
                  />
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Leverage</div>
                  <select
                    value={leverage}
                    onChange={e => setLeverage(Number(e.target.value))}
                    className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2.5 border border-gray-600 h-full"
                  >
                    {[1, 2, 5, 10].map(v => <option key={v} value={v}>{v}×</option>)}
                  </select>
                </div>
              </div>
              <div className="text-gray-600 text-xs">
                Cost: <span className="text-gray-400 font-mono">${(qtyNum * asset.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                {leverage > 1 && <span className="text-orange-400 ml-2">({leverage}× leveraged)</span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleBuy}   disabled={!canBuy}   className="py-3 text-sm font-black rounded-xl bg-green-700 hover:bg-green-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors">BUY</button>
              <button onClick={handleSell}  disabled={!canSell}  className="py-3 text-sm font-black rounded-xl bg-red-700 hover:bg-red-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors">SELL</button>
              <button onClick={handleShort} disabled={!canShort} className="py-3 text-sm font-black rounded-xl bg-purple-700 hover:bg-purple-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors">SHORT</button>
              <button onClick={handleCover} disabled={!canCover} className="py-3 text-sm font-black rounded-xl bg-pink-700 hover:bg-pink-600 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors">COVER</button>
            </div>

            {/* Stop-Loss / Take-Profit */}
            <div className="flex flex-col gap-3 pt-1">
              <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Risk Controls</div>
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
                  onClick={() => setStopLoss(asset.id, parseFloat(slInput) || null)}
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
                  onClick={() => setTakeProfit(asset.id, parseFloat(tpInput) || null)}
                  className="px-3 py-2 bg-cyan-800 hover:bg-cyan-700 rounded-lg text-cyan-200 text-sm font-semibold"
                >Set</button>
              </div>
              <div className="text-gray-600 text-xs leading-snug">
                Stop-loss auto-sells if price falls below target. Take-profit locks in gains when target is hit.
              </div>
            </div>

            {/* Category tips */}
            <div className="bg-gray-950 rounded-xl border border-gray-800 p-4 text-xs text-gray-500 leading-relaxed">
              {asset.category === 'stable'  && 'Stable assets drift slowly. Great safe-haven during PANIC — park cash here when the market crashes.'}
              {asset.category === 'growth'  && 'Growth stocks thrive in BULL/EUPHORIA phases. They drop hard in bear or panic — watch momentum.'}
              {asset.category === 'meme'    && 'Meme stocks can 5× or crash 80% in minutes. Never put more than 15% of your portfolio here. Always set a stop-loss.'}
              {asset.category === 'event'   && 'Event stocks react explosively to news. Check the News tab constantly — one headline can move 20%+.'}
              {asset.category === 'index'   && 'Index funds track broad market baskets. Low volatility and good diversification — they rise with BULL/EUPHORIA and fall with PANIC, but rarely make extreme moves.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
