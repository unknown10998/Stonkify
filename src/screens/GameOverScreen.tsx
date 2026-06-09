import { useGameStore, getNetWorth } from '../store/gameStore';
import Leaderboard from '../components/Leaderboard';
import { ACHIEVEMENTS, loadAchievements, getAchievement } from '../engine/achievementEngine';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

export default function GameOverScreen() {
  const state = useGameStore();
  const { startGame, goToMenu, playerName, mode, tick, startingCash, peakNetWorth,
          tradeHistory, netWorthHistory, newAchievements } = state;
  const netWorth = getNetWorth(state);
  const pnl    = netWorth - startingCash;
  const pnlPct = (pnl / startingCash) * 100;
  const isWin  = pnl >= 0;

  // Trade stats
  const closingTrades = tradeHistory.filter(t => t.type === 'sell' || t.type === 'cover');
  const bestTrade  = closingTrades.length > 0
    ? closingTrades.reduce((b, t) => (t.pnl ?? -Infinity) > (b.pnl ?? -Infinity) ? t : b)
    : null;
  const worstTrade = closingTrades.length > 0
    ? closingTrades.reduce((w, t) => (t.pnl ?? Infinity) < (w.pnl ?? Infinity) ? t : w)
    : null;

  // Achievements
  const allUnlocked = new Set(loadAchievements());
  const newSet = new Set(newAchievements);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start p-6 overflow-y-auto">
      <div className="w-full max-w-lg py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2">{isWin ? 'NICE RUN!' : 'LIQUIDATED'}</h1>
          <p className="text-gray-400 text-sm">
            {netWorth < 100
              ? 'Your portfolio was wiped out.'
              : `${mode === 'timed' ? "Time's up!" : 'Game over.'} Here's how you did.`}
          </p>
        </div>

        {/* Main stats card */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 mb-4">
          <div className="text-center mb-4">
            <div className="text-3xl font-mono font-black text-white">
              ${netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className={`text-lg font-mono ${isWin ? 'text-green-400' : 'text-red-400'}`}>
              {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({pnlPct.toFixed(1)}%)
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <div className="text-white font-bold">{tick}</div>
              <div className="text-gray-500 text-xs">Ticks Survived</div>
            </div>
            <div>
              <div className="text-white font-bold">${startingCash.toLocaleString()}</div>
              <div className="text-gray-500 text-xs">Started With</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold">
                ${peakNetWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-gray-500 text-xs">Peak Value</div>
            </div>
          </div>

          {/* Net worth sparkline */}
          {netWorthHistory.length > 2 && (
            <div className="mb-4">
              <div className="text-gray-600 text-xs uppercase tracking-widest mb-1">Net Worth Over Time</div>
              <ResponsiveContainer width="100%" height={64}>
                <LineChart data={netWorthHistory}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isWin ? '#4ade80' : '#f87171'}
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      return (
                        <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white">
                          ${(payload[0].value as number).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trade breakdown */}
          {tradeHistory.length > 0 && (
            <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-gray-800">
              <div>
                <div className="text-white font-bold">{tradeHistory.length}</div>
                <div className="text-gray-500 text-xs">Total Trades</div>
              </div>
              <div>
                <div className={`font-bold ${bestTrade && (bestTrade.pnl ?? 0) > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {bestTrade
                    ? `+$${Math.round(bestTrade.pnl ?? 0).toLocaleString()}`
                    : '—'}
                </div>
                <div className="text-gray-500 text-xs">Best Trade{bestTrade ? ` (${bestTrade.ticker})` : ''}</div>
              </div>
              <div>
                <div className={`font-bold ${worstTrade && (worstTrade.pnl ?? 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {worstTrade
                    ? `$${Math.round(worstTrade.pnl ?? 0).toLocaleString()}`
                    : '—'}
                </div>
                <div className="text-gray-500 text-xs">Worst Trade{worstTrade ? ` (${worstTrade.ticker})` : ''}</div>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-700 text-center">
            <span className="text-gray-400 text-xs">{playerName} — {mode} mode</span>
          </div>
        </div>

        {/* New achievements earned this run */}
        {newAchievements.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-600/40 rounded-xl p-4 mb-4">
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-3">
              Achievements Unlocked This Run
            </div>
            <div className="flex flex-col gap-3">
              {newAchievements.map(id => {
                const ach = getAchievement(id);
                if (!ach) return null;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-2xl">{ach.icon}</span>
                    <div>
                      <div className="text-white font-bold text-sm">{ach.name}</div>
                      <div className="text-gray-400 text-xs">{ach.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All achievements */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 mb-6">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">All Achievements</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = allUnlocked.has(ach.id);
              const isNew = newSet.has(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    isNew    ? 'bg-yellow-900/30 border border-yellow-600/40' :
                    unlocked ? 'bg-gray-800' :
                               'opacity-35'
                  }`}
                >
                  <span className="text-xl">{ach.icon}</span>
                  <div>
                    <div className={`text-xs font-bold ${unlocked ? 'text-white' : 'text-gray-600'}`}>
                      {ach.name}
                    </div>
                    <div className="text-gray-600 text-xs leading-snug">{ach.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <Leaderboard />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => startGame(mode, playerName)}
            className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-sm transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={goToMenu}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-sm transition-colors"
          >
            Main Menu
          </button>
        </div>

      </div>
    </div>
  );
}
