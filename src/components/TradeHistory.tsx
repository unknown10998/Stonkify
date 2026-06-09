import { useGameStore } from '../store/gameStore';
import clsx from 'clsx';

const TYPE_STYLE = {
  buy:   { label: 'BUY',   cls: 'bg-green-900/60 text-green-300 border-green-700/50'   },
  sell:  { label: 'SELL',  cls: 'bg-red-900/60 text-red-300 border-red-700/50'         },
  short: { label: 'SHORT', cls: 'bg-purple-900/60 text-purple-300 border-purple-700/50' },
  cover: { label: 'COVER', cls: 'bg-pink-900/60 text-pink-300 border-pink-700/50'       },
};

export default function TradeHistory() {
  const tradeHistory = useGameStore(s => s.tradeHistory);

  const totalPnl     = tradeHistory.filter(t => t.pnl !== undefined).reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins         = tradeHistory.filter(t => (t.pnl ?? 0) > 0).length;
  const losses       = tradeHistory.filter(t => (t.pnl ?? 0) < 0).length;
  const closed       = wins + losses;
  const winRate      = closed > 0 ? (wins / closed) * 100 : 0;

  if (tradeHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-gray-700 text-sm font-semibold mb-2">Trade Log</div>
        <div className="text-gray-500 text-base font-semibold">No trades yet</div>
        <div className="text-gray-700 text-sm mt-1">Buy or sell a stock to see your trade log here.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Trades', value: tradeHistory.length.toString(), color: 'text-white' },
          { label: 'Realized P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Win Rate', value: closed > 0 ? `${winRate.toFixed(0)}%` : '—', color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
          { label: 'W / L', value: `${wins} / ${losses}`, color: 'text-gray-300' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">{s.label}</div>
            <div className={clsx('font-black text-lg font-mono', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-semibold">Tick</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Ticker</th>
              <th className="text-right px-4 py-3 font-semibold">Shares</th>
              <th className="text-right px-4 py-3 font-semibold">Price</th>
              <th className="text-right px-4 py-3 font-semibold">Total</th>
              <th className="text-right px-4 py-3 font-semibold">P&L</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.map((t, i) => {
              const style = TYPE_STYLE[t.type];
              const decimals = t.price < 1 ? 4 : t.price < 10 ? 3 : 2;
              return (
                <tr
                  key={t.id}
                  className={clsx(
                    'border-b border-gray-800/50 transition-colors',
                    i % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/30',
                    'hover:bg-gray-800/40'
                  )}
                >
                  <td className="px-4 py-2.5 text-gray-600 font-mono">#{t.tick}</td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('text-xs font-bold px-2 py-0.5 rounded border', style.cls)}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white font-black font-mono">{t.ticker}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300 font-mono">{t.shares.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300 font-mono">${t.price.toFixed(decimals)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300 font-mono">${t.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold">
                    {t.pnl !== undefined
                      ? <span className={t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      : <span className="text-gray-700">—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
