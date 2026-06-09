import { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { fetchLiveQuotes, type LiveQuote } from '../services/stockService';
import { FINNHUB_API_KEY } from '../config';
import clsx from 'clsx';

const REFRESH_INTERVAL = 60; // seconds between auto-refreshes

export default function MarketScanner() {
  const assets = useGameStore(s => s.assets);

  const [quotes, setQuotes]         = useState<Record<string, LiveQuote>>({});
  const [loading, setLoading]       = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [elapsed, setElapsed]       = useState(0);
  const tickerSetRef                = useRef<string>('');

  const refresh = useCallback(async () => {
    if (!FINNHUB_API_KEY || loading) return;
    setLoading(true);
    const tickers = assets.map(a => a.ticker);
    const data = await fetchLiveQuotes(tickers);
    setQuotes(data);
    setLastRefresh(new Date());
    setElapsed(0);
    setLoading(false);
  }, [assets, loading]);

  // Fetch on mount and whenever new tickers are added
  useEffect(() => {
    const key = assets.map(a => a.ticker).sort().join(',');
    if (key === tickerSetRef.current) return;
    tickerSetRef.current = key;
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.map(a => a.ticker).join(',')]);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh every REFRESH_INTERVAL seconds
  useEffect(() => {
    if (elapsed > 0 && elapsed % REFRESH_INTERVAL === 0) refresh();
  }, [elapsed, refresh]);

  // Build display rows — use live quotes when available, fall back to game sim price
  const rows = assets
    .map(a => {
      const q = quotes[a.ticker];
      const decimals = a.price < 1 ? 4 : a.price < 10 ? 3 : 2;
      if (q) {
        return {
          id: a.id, ticker: a.ticker, name: a.name,
          price: q.price, changePct: q.changePct, change: q.change,
          high: q.high, low: q.low,
          decimals, live: true,
        };
      }
      // Fallback: sim price + tick-to-tick change
      const prev = a.priceHistory[a.priceHistory.length - 2] ?? a.price;
      const chgPct = prev > 0 ? ((a.price - prev) / prev) * 100 : 0;
      return {
        id: a.id, ticker: a.ticker, name: a.name,
        price: a.price, changePct: chgPct, change: a.price - prev,
        high: a.price, low: a.price,
        decimals, live: false,
      };
    })
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  function rowBg(pct: number) {
    const abs = Math.abs(pct);
    if (pct > 0) {
      if (abs >= 5)  return 'bg-yellow-400/20 border-yellow-400/60 shadow-[0_0_10px_rgba(250,204,21,0.2)]';
      if (abs >= 2)  return 'bg-yellow-500/10 border-yellow-600/30';
      return 'bg-green-900/15 border-green-900/25';
    }
    if (abs >= 5)  return 'bg-red-500/20 border-red-500/55 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    if (abs >= 2)  return 'bg-red-500/10 border-red-600/30';
    return 'bg-gray-800/30 border-gray-700/30';
  }

  function pctColor(pct: number) {
    const abs = Math.abs(pct);
    if (pct > 0) {
      if (abs >= 5) return 'text-yellow-300 font-black';
      if (abs >= 2) return 'text-yellow-400 font-bold';
      return 'text-green-400 font-semibold';
    }
    if (abs >= 5) return 'text-red-300 font-black';
    if (abs >= 2) return 'text-red-400 font-bold';
    return 'text-red-400/70 font-semibold';
  }

  const hasLive = Object.keys(quotes).length > 0;

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">Market Scanner</div>
        <div className="flex items-center gap-2">
          {hasLive && (
            <span className="text-xs px-1.5 py-0.5 bg-green-900/40 text-green-400 border border-green-700/40 rounded font-semibold">LIVE</span>
          )}
          {lastRefresh && (
            <span className="text-gray-600 text-xs">
              {elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading || !FINNHUB_API_KEY}
            title={!FINNHUB_API_KEY ? 'Add VITE_FINNHUB_API_KEY to .env for live data' : 'Refresh live prices'}
            className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors text-sm"
          >
            <span className={loading ? 'inline-block animate-spin' : ''}>⟳</span>
          </button>
        </div>
      </div>

      {/* Sub-header: live vs sim indicator */}
      <div className="px-4 py-1.5 border-b border-gray-800/60 flex items-center justify-between">
        <span className="text-gray-600 text-xs">
          {hasLive
            ? `${Object.keys(quotes).length}/${assets.length} live · sorted by day %`
            : FINNHUB_API_KEY ? 'Loading…' : 'Simulated prices — add Finnhub key for live data'}
        </span>
        <span className="text-gray-700 text-xs">sorted by move</span>
      </div>

      {/* Scrollable stock list — fixed height regardless of count */}
      <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
        <div className="flex flex-col gap-1 p-3">
          {rows.map(row => (
            <div
              key={row.id}
              className={clsx(
                'flex items-center justify-between rounded-xl border px-3 py-2 transition-all duration-300',
                rowBg(row.changePct)
              )}
            >
              {/* Left: ticker + name */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-black text-white text-sm font-mono w-12 shrink-0">{row.ticker}</span>
                <span className="text-gray-500 text-xs truncate hidden sm:block leading-none">
                  {row.name.split(' ').slice(0, 3).join(' ')}
                </span>
              </div>

              {/* Right: price + % change */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-gray-200 font-mono text-sm leading-none">
                    ${row.price.toFixed(row.decimals)}
                  </div>
                  {row.live && (
                    <div className="text-gray-600 text-xs font-mono leading-none mt-0.5">
                      {row.change >= 0 ? '+' : ''}{row.change.toFixed(row.price < 10 ? 3 : 2)}
                    </div>
                  )}
                </div>
                <span className={clsx('font-mono text-sm w-16 text-right', pctColor(row.changePct))}>
                  {row.changePct >= 0 ? '+' : ''}{row.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-800 text-gray-700 text-xs flex gap-3">
        <span>Yellow = big gainer</span>
        <span>Red = big loser</span>
        <span>{hasLive ? '· Real daily %' : '· Sim tick %'}</span>
      </div>
    </div>
  );
}
