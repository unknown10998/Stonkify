import { useGameStore, getNetWorth, TIMED_ROUNDS } from '../store/gameStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import RiskGraph3D from './RiskGraph3D';

const METER_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

function getMeterColor(value: number) {
  if (value < 30) return METER_COLORS[0]!;
  if (value < 60) return METER_COLORS[1]!;
  if (value < 80) return METER_COLORS[2]!;
  return METER_COLORS[3]!;
}

function Meter({ label, value, inverse = false, tooltip }: { label: string; value: number; inverse?: boolean; tooltip?: string }) {
  const color = getMeterColor(inverse ? 100 - value : value);
  return (
    <div className="flex flex-col gap-1.5" title={tooltip}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-300 font-medium">{label}</span>
        <span style={{ color }} className="font-bold font-mono">{value}%</span>
      </div>
      <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      {tooltip && <div className="text-gray-600 text-xs leading-snug">{tooltip}</div>}
    </div>
  );
}

const PHASE_CONFIGS = {
  bull:      { label: 'BULL',     color: 'text-green-400',                bg: 'bg-green-900/30 border-green-500/50' },
  bear:      { label: 'BEAR',     color: 'text-red-400',                  bg: 'bg-red-900/30 border-red-500/50' },
  sideways:  { label: 'SIDEWAYS', color: 'text-gray-400',                 bg: 'bg-gray-800/30 border-gray-500/50' },
  panic:     { label: 'PANIC',    color: 'text-red-300 animate-pulse',    bg: 'bg-red-900/50 border-red-400 animate-pulse' },
  euphoria:  { label: 'EUPHORIA', color: 'text-yellow-300 animate-pulse', bg: 'bg-yellow-900/50 border-yellow-400 animate-pulse' },
};

const EXPOSURE_COLORS: Record<string, string> = {
  stable: '#3b82f6',
  growth: '#a855f7',
  meme:   '#eab308',
  event:  '#f97316',
  index:  '#14b8a6',
};

export default function RiskDashboard() {
  const state = useGameStore();
  const { riskMetrics, marketPhase, globalSentiment, tick, mode, roundsRemaining, playerName } = state;
  const netWorth = getNetWorth(state);
  const pnl    = netWorth - state.startingCash;
  const pnlPct = (pnl / state.startingCash) * 100;
  const phase  = PHASE_CONFIGS[marketPhase];

  const pieData = Object.entries(riskMetrics.exposureByCategory)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: Math.round(v * 100) }));

  const radarData = [
    { subject: 'Volatility', value: riskMetrics.volatilityScore },
    { subject: 'Crash Risk', value: riskMetrics.crashProbability },
    { subject: 'Meme Exp',   value: Math.round((riskMetrics.exposureByCategory.meme || 0) * 100) },
    { subject: 'Leverage',   value: Math.min(100, (riskMetrics.leverageRatio - 1) * 20) },
    { subject: 'Illiquidity',value: 100 - riskMetrics.liquidityHealth },
  ];

  const sentimentPct = Math.round((globalSentiment + 1) * 50);

  return (
    <div className="flex flex-col gap-5">

      {/* Net Worth */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-500 text-xs uppercase tracking-widest">Net Worth</div>
          <div className="text-gray-300 text-sm font-bold truncate max-w-[120px]" title={playerName}>{playerName}</div>
        </div>
        <div className="text-3xl font-black font-mono text-white">
          ${netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
        <div className={`text-base font-mono font-bold mt-1 ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({pnlPct.toFixed(1)}%)
        </div>
        <div className="text-gray-500 text-sm mt-2">Cash: ${state.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        {mode === 'timed' && roundsRemaining < Infinity && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className={roundsRemaining <= 10 ? 'text-red-400 font-bold animate-pulse' : 'text-yellow-400 font-semibold'}>
                {roundsRemaining} round{roundsRemaining !== 1 ? 's' : ''} left
              </span>
              <span className="text-gray-600">{TIMED_ROUNDS} total</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={roundsRemaining <= 10 ? 'h-full rounded-full transition-all duration-500 animate-pulse' : 'h-full rounded-full transition-all duration-500'}
                style={{
                  width: `${Math.round((roundsRemaining / TIMED_ROUNDS) * 100)}%`,
                  backgroundColor: roundsRemaining <= 10 ? '#ef4444' : roundsRemaining <= 20 ? '#f97316' : '#eab308',
                }}
              />
            </div>
          </div>
        )}
        <div className="text-gray-700 text-xs mt-1">Tick #{tick}</div>
      </div>

      {/* Market Phase */}
      <div className={`rounded-2xl border p-4 ${phase.bg}`}>
        <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Market Phase</div>
        <div className={`text-xl font-black ${phase.color}`}>{phase.label}</div>
        <div className="text-gray-500 text-xs mt-1">
          {marketPhase === 'panic'    && 'Prices are crashing. Hedge or hold cash.'}
          {marketPhase === 'euphoria' && 'Irrational highs. Expect a reversal soon.'}
          {marketPhase === 'bull'     && 'Upward momentum. Ride trend, watch reversals.'}
          {marketPhase === 'bear'     && 'Falling prices. Consider shorts or stable assets.'}
          {marketPhase === 'sideways' && 'Low movement. Good time to accumulate.'}
        </div>
      </div>

      {/* Sentiment */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-red-400 font-semibold">Fear</span>
          <span className="text-gray-400 text-xs uppercase tracking-widest">Market Sentiment</span>
          <span className="text-green-400 font-semibold">Greed</span>
        </div>
        <div className="h-3 bg-gradient-to-r from-red-900 via-gray-700 to-green-900 rounded-full relative">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-gray-400 transition-all duration-500"
            style={{ left: `calc(${sentimentPct}% - 8px)` }}
          />
        </div>
        <div className="text-center text-sm text-gray-300 mt-2 font-semibold">{sentimentPct}% Greedy</div>
      </div>

      {/* Risk Meters */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4 flex flex-col gap-4">
        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">Risk Indicators</div>
        <Meter
          label="Volatility Score"
          value={riskMetrics.volatilityScore}
          tooltip="How wildly your portfolio swings. High meme/leveraged exposure raises this."
        />
        <Meter
          label="Crash Probability"
          value={riskMetrics.crashProbability}
          tooltip="Estimated chance of a market PANIC event. Above 60% — consider hedging."
        />
        <Meter
          label="Liquidity Health"
          value={riskMetrics.liquidityHealth}
          inverse
          tooltip="How much cash you have available. Low liquidity means you can't react to opportunities or emergencies."
        />
      </div>

      {/* Exposure Pie */}
      {pieData.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
          <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Portfolio Exposure</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={55} dataKey="value" isAnimationActive={false}>
                {pieData.map(entry => (
                  <Cell key={entry.name} fill={EXPOSURE_COLORS[entry.name] ?? '#666'} />
                ))}
              </Pie>
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
                      {(payload[0].payload as { name: string }).name}: {payload[0].value}%
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EXPOSURE_COLORS[d.name] }} />
                <span className="text-gray-400 capitalize">{d.name} {d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Radar — 3D nodes graph */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Risk Radar</div>
        <div className="text-gray-400 text-xs mb-3 leading-snug">
          Each node is a risk dimension. <span className="text-white font-semibold">Bigger & redder = higher risk.</span> Drag to rotate.
        </div>
        <RiskGraph3D nodes={radarData} />

        {/* Glossary */}
        <div className="mt-3 pt-3 border-t border-gray-800 flex flex-col gap-2">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">What these mean</div>
          {[
            { term: 'Volatility',   def: 'How much your portfolio swings. High = risky.' },
            { term: 'Crash Risk',   def: 'Odds of a sudden PANIC event hitting your assets.' },
            { term: 'Meme Exp',     def: 'Exposure to meme stocks — casino-level risk.' },
            { term: 'Leverage',     def: 'Borrowed multiplier on your trades. 10× = 10× gains AND losses.' },
            { term: 'Illiquidity',  def: 'Low cash = you can\'t react to emergencies or opportunities.' },
          ].map(({ term, def }) => (
            <div key={term} className="text-xs leading-snug">
              <span className="text-gray-300 font-semibold">{term} — </span>
              <span className="text-gray-500">{def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
