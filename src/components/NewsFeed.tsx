import { useGameStore } from '../store/gameStore';
import clsx from 'clsx';

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  macro:      { color: 'text-blue-400',   bg: 'border-blue-500/30 bg-blue-950/20',     label: 'MACRO'      },
  sector:     { color: 'text-purple-400', bg: 'border-purple-500/30 bg-purple-950/20', label: 'SECTOR'     },
  black_swan: { color: 'text-red-400',    bg: 'border-red-500/50 bg-red-950/30',       label: 'BLACK SWAN' },
  hype:       { color: 'text-yellow-400', bg: 'border-yellow-500/30 bg-yellow-950/20', label: 'HYPE'       },
  earnings:   { color: 'text-cyan-400',   bg: 'border-cyan-500/30 bg-cyan-950/20',     label: 'EARNINGS'   },
};

const CAT_COLORS: Record<string, string> = {
  stable: 'text-blue-300 bg-blue-900/40 border-blue-700/40',
  growth: 'text-purple-300 bg-purple-900/40 border-purple-700/40',
  meme:   'text-yellow-300 bg-yellow-900/40 border-yellow-700/40',
  event:  'text-orange-300 bg-orange-900/40 border-orange-700/40',
  index:  'text-teal-300 bg-teal-900/40 border-teal-700/40',
};

export default function NewsFeed() {
  const { news, assets } = useGameStore();

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1">
        <span className="text-gray-300 text-sm font-bold uppercase tracking-widest">Live Market Feed</span>
      </div>
      <div className="text-gray-500 text-sm mb-2">
        Events fire every few ticks and move prices immediately. React fast — especially Event stocks.
      </div>

      <div className="flex flex-col gap-3">
        {news.length === 0 && (
          <div className="text-gray-600 text-base text-center py-8 border border-gray-800 rounded-2xl">
            Monitoring markets for events…
          </div>
        )}

        {news.map(event => {
          const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG['macro']!;
          const isPositive = event.impactMultiplier > 0;

          // Stocks in the affected categories, with their live price + tick change
          const affectedStocks = assets
            .filter(a => event.affectedCategories.includes(a.category))
            .map(a => {
              const prev = a.priceHistory[a.priceHistory.length - 2] ?? a.price;
              const chgPct = prev > 0 ? ((a.price - prev) / prev) * 100 : 0;
              const sessionStart = a.priceHistory[0] ?? a.price;
              const sessionChg = sessionStart > 0 ? ((a.price - sessionStart) / sessionStart) * 100 : 0;
              const decimals = a.price < 1 ? 4 : a.price < 10 ? 3 : 2;
              return { ...a, chgPct, sessionChg, decimals };
            });

          return (
            <div key={event.id} className={clsx('rounded-2xl border p-5 flex flex-col gap-3', cfg.bg)}>

              {/* Header row */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={clsx('text-xs font-bold uppercase tracking-wider', cfg.color)}>
                    {cfg.label}
                  </span>
                  <span className="text-gray-600 text-xs">tick #{event.timestamp}</span>
                </div>
                <div className="text-white text-base font-bold leading-snug">{event.headline}</div>
                <div className="text-gray-400 text-sm leading-relaxed">{event.body}</div>
              </div>

              {/* Impact + category tags */}
              <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-white/5">
                <span className={clsx(
                  'text-sm font-bold px-3 py-1 rounded-full',
                  isPositive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                )}>
                  {isPositive ? '+' : ''}{(event.impactMultiplier * 100).toFixed(0)}% impact
                </span>
                <div className="flex gap-2 flex-wrap">
                  {event.affectedCategories.map(cat => (
                    <span key={cat} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full capitalize">
                      #{cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Affected stocks with live state */}
              {affectedStocks.length > 0 && (
                <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                  <div className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Affected stocks</div>
                  <div className="grid grid-cols-2 gap-2">
                    {affectedStocks.map(stock => (
                      <div
                        key={stock.id}
                        className={clsx(
                          'rounded-xl border px-3 py-2 flex items-center justify-between gap-2',
                          CAT_COLORS[stock.category] ?? 'text-gray-300 bg-gray-800 border-gray-700'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm font-mono">{stock.ticker}</div>
                          <div className="text-xs opacity-70 truncate">{stock.name}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-sm">${stock.price.toFixed(stock.decimals)}</div>
                          <div className={clsx(
                            'text-xs font-semibold font-mono',
                            stock.chgPct >= 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {stock.chgPct >= 0 ? '+' : ''}{stock.chgPct.toFixed(2)}%
                          </div>
                          <div className={clsx(
                            'text-xs opacity-60',
                            stock.sessionChg >= 0 ? 'text-green-300' : 'text-red-300'
                          )}>
                            {stock.sessionChg >= 0 ? '+' : ''}{stock.sessionChg.toFixed(1)}% session
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
