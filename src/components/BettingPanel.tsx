import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useNotificationStore } from '../store/notificationStore';
import type { BetType } from '../types';
import clsx from 'clsx';

const BET_OPTIONS: {
  type: BetType; label: string; multiplier: number; duration: number;
  description: string; detail: string; color: string; highlight: string;
}[] = [
  {
    type: 'market_up', label: 'Market Up', multiplier: 1.8, duration: 5,
    description: 'Bet that market sentiment rises in the next 5 ticks.',
    detail: 'Win if the global sentiment index is higher at resolution. Good when market is recovering from a dip.',
    color: 'border-green-500/40 bg-green-950/20 hover:bg-green-900/30', highlight: 'text-green-400',
  },
  {
    type: 'market_down', label: 'Market Down', multiplier: 1.8, duration: 5,
    description: 'Bet that market sentiment falls in the next 5 ticks.',
    detail: 'Win if sentiment index is lower at resolution. Good when market looks overheated.',
    color: 'border-red-500/40 bg-red-950/20 hover:bg-red-900/30', highlight: 'text-red-400',
  },
  {
    type: 'crash', label: 'Crash Bet', multiplier: 8.0, duration: 10,
    description: 'Bet the market enters PANIC within 10 ticks.',
    detail: 'Highest payout. Wins if market phase = PANIC before the timer. Use when crash probability is above 40%.',
    color: 'border-red-700/60 bg-red-950/30 hover:bg-red-900/40', highlight: 'text-red-300',
  },
  {
    type: 'sector_outperform', label: 'Stock Up', multiplier: 3.0, duration: 8,
    description: 'Bet a specific stock rises in the next 8 ticks.',
    detail: 'Win if your chosen stock is higher than its current price when the bet resolves. Best after a news event that targets that sector.',
    color: 'border-purple-500/40 bg-purple-950/20 hover:bg-purple-900/30', highlight: 'text-purple-400',
  },
];

export default function BettingPanel() {
  const { cash, bets, assets, placeBet } = useGameStore();
  const push = useNotificationStore(s => s.push);
  const [selectedBet, setSelectedBet] = useState<BetType>('market_up');
  const [betAmount, setBetAmount] = useState('100');
  const [targetAsset, setTargetAsset] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const amt      = parseFloat(betAmount) || 0;
  const canBet   = cash >= amt && amt > 0 && (selectedBet !== 'sector_outperform' || !!targetAsset);
  const selected = BET_OPTIONS.find(b => b.type === selectedBet)!;
  const activeBets = bets.filter(b => b.status === 'active');
  const recentBets = bets.filter(b => b.status !== 'active').slice(-6).reverse();

  function handleBet() {
    if (!canBet) return;
    placeBet(selectedBet, amt, selectedBet === 'sector_outperform' ? targetAsset : undefined);
    push(`Bet placed: ${selected.label}`, 'buy', `$${amt} · ${selected.multiplier}× payout`);
    setBetAmount('100');
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-gray-300 text-sm font-bold uppercase tracking-widest">Prediction Bets</span>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
        >
          How it works
        </button>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-2xl p-5 text-sm leading-relaxed">
          <div className="text-yellow-400 font-bold mb-3">How Prediction Bets Work</div>
          <div className="text-gray-300 space-y-2">
            <p>Bets are short-term predictions about market direction. You stake real cash — if you're right, you win a multiplied payout. If wrong, you lose your stake.</p>
            <p><span className="text-white font-semibold">Resolution:</span> Each bet has a tick countdown. When the timer hits zero, the outcome is evaluated and cash is added or deducted automatically.</p>
            <p><span className="text-white font-semibold">Strategy tip:</span> Use the Crash Bet (8×) after bad news piles up. Use Stock Up (3×) right after a sector-specific news event fires.</p>
            <p className="text-yellow-400">Never bet more than 10–15% of your portfolio on a single prediction.</p>
          </div>
        </div>
      )}

      {/* Bet type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BET_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => setSelectedBet(opt.type)}
            className={clsx(
              'rounded-2xl border p-5 text-left transition-all',
              opt.color,
              selectedBet === opt.type ? 'ring-2 ring-white/30' : ''
            )}
          >
            <div className="mb-2">
              <span className="text-white text-base font-bold">{opt.label}</span>
            </div>
            <div className={clsx('text-2xl font-black font-mono mb-2', opt.highlight)}>{opt.multiplier}×</div>
            <div className="text-gray-400 text-sm leading-snug">{opt.description}</div>
          </button>
        ))}
      </div>

      {/* Selected bet detail */}
      {selected && (
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4 text-sm text-gray-400 leading-relaxed">
          <span className="text-gray-300 font-semibold">{selected.label} ({selected.duration} ticks): </span>
          {selected.detail}
        </div>
      )}

      {/* Asset selector for sector_outperform */}
      {selectedBet === 'sector_outperform' && (
        <select
          value={targetAsset}
          onChange={e => setTargetAsset(e.target.value)}
          className="bg-gray-800 text-white text-base rounded-xl px-4 py-3 border border-gray-600 w-full"
        >
          <option value="">Choose a stock to bet on...</option>
          {assets.map(a => (
            <option key={a.id} value={a.id}>{a.ticker} — {a.name} (${a.price.toFixed(2)})</option>
          ))}
        </select>
      )}

      {/* Amount */}
      <div>
        <div className="text-gray-500 text-xs uppercase tracking-widest mb-3">Stake Amount</div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-400 text-lg">$</span>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(e.target.value)}
            className="flex-1 bg-gray-900 text-white text-xl font-mono rounded-xl px-4 py-3 border border-gray-700 focus:border-yellow-500 outline-none"
            min="10" step="10"
          />
        </div>
        <div className="flex gap-2 mt-2">
          {[50, 100, 250, 500].map(v => (
            <button
              key={v}
              onClick={() => setBetAmount(String(v))}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg transition-colors"
            >
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* Payout preview */}
      <div className="flex justify-between items-center bg-gray-900/60 border border-gray-700 rounded-xl px-5 py-3">
        <div className="text-gray-400 text-sm">Potential payout</div>
        <div>
          <span className="text-yellow-400 text-2xl font-black font-mono">
            ${(amt * selected.multiplier).toFixed(0)}
          </span>
          <span className="text-gray-600 text-sm ml-2">({selected.multiplier}×)</span>
        </div>
      </div>

      <button
        onClick={handleBet}
        disabled={!canBet}
        className="w-full py-5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-black rounded-2xl transition-colors tracking-wide"
      >
        PLACE BET — ${amt.toLocaleString()}
      </button>

      {/* Active bets */}
      {activeBets.length > 0 && (
        <div>
          <div className="text-gray-500 text-xs uppercase tracking-widest mb-3">Active Bets</div>
          <div className="flex flex-col gap-2">
            {activeBets.map(bet => (
              <div key={bet.id} className="bg-gray-900/60 rounded-xl border border-yellow-500/20 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white text-sm font-semibold">{bet.description}</div>
                    <div className="text-gray-500 text-xs mt-1">Resolves tick #{bet.resolveAt}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold font-mono">{bet.multiplier}×</div>
                    <div className="text-gray-500 text-xs">${bet.amount} stake</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent results */}
      {recentBets.length > 0 && (
        <div>
          <div className="text-gray-500 text-xs uppercase tracking-widest mb-3">Recent Results</div>
          <div className="flex flex-col gap-2">
            {recentBets.map(bet => (
              <div
                key={bet.id}
                className={clsx(
                  'flex justify-between items-center rounded-xl px-4 py-3 text-sm font-semibold',
                  bet.status === 'won' ? 'bg-green-950/40 text-green-400 border border-green-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'
                )}
              >
                <span>{bet.status === 'won' ? '✓ WON' : '✗ LOST'} — {bet.description}</span>
                <span className="font-mono font-black text-base">
                  {bet.status === 'won'
                    ? `+$${((bet.payout ?? 0) - bet.amount).toFixed(0)}`
                    : `-$${bet.amount}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
