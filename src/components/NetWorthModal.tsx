import { X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useGameStore, getNetWorth } from '../store/gameStore';
import clsx from 'clsx';

interface Props { onClose: () => void }

export default function NetWorthModal({ onClose }: Props) {
  const state    = useGameStore();
  const { netWorthHistory, startingCash, peakNetWorth, tradeHistory } = state;
  const netWorth = getNetWorth(state);
  const pnl      = netWorth - startingCash;
  const pnlPct   = (pnl / startingCash) * 100;
  const isUp     = pnl >= 0;

  const chartData = netWorthHistory.map(p => ({ tick: p.tick, value: p.value }));
  const minVal    = Math.min(...chartData.map(d => d.value)) * 0.995;
  const maxVal    = Math.max(...chartData.map(d => d.value)) * 1.005;

  // Realized P&L from closed trades
  const realizedPnl = tradeHistory
    .filter(t => t.pnl !== undefined)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const winTrades  = tradeHistory.filter(t => t.pnl !== undefined && t.pnl > 0).length;
  const lossTrades = tradeHistory.filter(t => t.pnl !== undefined && t.pnl < 0).length;
  const totalClosed = winTrades + lossTrades;
  const winRate    = totalClosed > 0 ? (winTrades / totalClosed) * 100 : 0;

  const drawdown = peakNetWorth > 0
    ? ((peakNetWorth - netWorth) / peakNetWorth) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '820px', maxWidth: '96vw', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-800 flex-shrink-0">
          <div>
            <div className="text-white font-black text-xl">Portfolio Performance</div>
            <div className="text-gray-500 text-sm mt-0.5">Net worth over time</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-7 flex flex-col gap-6">
          {/* Key stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Net Worth',
                value: `$${netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                sub: `${isUp ? '+' : ''}${pnlPct.toFixed(1)}% total`,
                color: isUp ? 'text-green-400' : 'text-red-400',
              },
              {
                label: 'All-Time High',
                value: `$${peakNetWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                sub: drawdown > 0.1 ? `${drawdown.toFixed(1)}% drawdown` : 'At all-time high',
                color: drawdown > 5 ? 'text-red-400' : 'text-gray-400',
              },
              {
                label: 'Realized P&L',
                value: `${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                sub: `${totalClosed} closed trades`,
                color: realizedPnl >= 0 ? 'text-green-400' : 'text-red-400',
              },
              {
                label: 'Win Rate',
                value: totalClosed > 0 ? `${winRate.toFixed(0)}%` : '—',
                sub: `${winTrades}W / ${lossTrades}L`,
                color: winRate >= 50 ? 'text-green-400' : winRate > 0 ? 'text-red-400' : 'text-gray-500',
              },
            ].map(s => (
              <div key={s.label} className="bg-gray-950 rounded-xl border border-gray-800 p-4">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{s.label}</div>
                <div className={clsx('font-black text-xl font-mono', s.color)}>{s.value}</div>
                <div className="text-gray-600 text-xs mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-gray-950 rounded-2xl border border-gray-800 p-5">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Net Worth History</div>
            {chartData.length < 2 ? (
              <div className="text-gray-600 text-sm text-center py-12">Play a few ticks to see your chart.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tick" tick={{ fill: '#4b5563', fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Tick', position: 'insideBottom', offset: -2, fill: '#4b5563', fontSize: 10 }} />
                  <YAxis
                    domain={[minVal, maxVal]}
                    tick={{ fill: '#4b5563', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <Tooltip
                    content={({ payload, label }) => {
                      if (!payload?.[0]) return null;
                      const val = payload[0].value as number;
                      const chg = val - startingCash;
                      return (
                        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm shadow-xl">
                          <div className="text-gray-400 text-xs mb-1">Tick #{label}</div>
                          <div className="text-white font-bold font-mono">${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                          <div className={clsx('text-xs font-mono font-semibold mt-0.5', chg >= 0 ? 'text-green-400' : 'text-red-400')}>
                            {chg >= 0 ? '+' : ''}${chg.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={startingCash} stroke="#374151" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isUp ? '#22c55e' : '#ef4444'}
                    strokeWidth={2}
                    fill="url(#nwGrad)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div className="text-gray-700 text-xs mt-2 text-right">Dashed line = starting cash (${startingCash.toLocaleString()})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
