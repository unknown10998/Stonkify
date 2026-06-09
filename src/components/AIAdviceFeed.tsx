import { useEffect, useState } from 'react';
import { useGameStore, getNetWorth } from '../store/gameStore';
import clsx from 'clsx';

type AdviceType = 'bullish' | 'bearish' | 'warning' | 'info';

interface AdviceMsg {
  id: string;
  tick: number;
  type: AdviceType;
  text: string;
}

const TYPE_STYLES: Record<AdviceType, { dot: string; label: string; text: string }> = {
  bullish: { dot: 'bg-green-400',  label: 'BULL',  text: 'text-green-400'  },
  bearish: { dot: 'bg-red-400',    label: 'BEAR',  text: 'text-red-400'    },
  warning: { dot: 'bg-yellow-400', label: 'WARN',  text: 'text-yellow-400' },
  info:    { dot: 'bg-cyan-400',   label: 'INFO',  text: 'text-cyan-400'   },
};

function generateAdvice(state: ReturnType<typeof useGameStore.getState>): AdviceMsg {
  const nw          = getNetWorth(state);
  const pnlPct      = ((nw - state.startingCash) / state.startingCash) * 100;
  const { volatilityScore, crashProbability, liquidityHealth, exposureByCategory } = state.riskMetrics;
  const phase       = state.marketPhase;
  const memeExp     = Math.round((exposureByCategory.meme ?? 0) * 100);
  const cashPct     = Math.round((state.cash / nw) * 100);
  const tick        = state.tick;

  const candidates: { type: AdviceType; text: string; weight: number }[] = [
    // Phase-based
    { type: 'bullish', text: `${phase === 'bull' ? 'Bull run confirmed' : 'Market recovering'} — momentum stocks (AIMC, FNTK) tend to outperform right now. Ride the wave but set stop-losses.`, weight: phase === 'bull' ? 4 : 1 },
    { type: 'bearish', text: `Bear market in play. Shorting meme stocks (DGRT, MOON) or parking cash in stable assets (USB, UTIL) is the safer play here.`, weight: phase === 'bear' ? 4 : 1 },
    { type: 'warning', text: `PANIC phase — do not panic sell. Either hedge to stable assets or hold through the dip. Selling at the bottom locks in losses permanently.`, weight: phase === 'panic' ? 6 : 0 },
    { type: 'warning', text: `EUPHORIA detected. Every asset looks cheap right now — that's the trap. Take partial profits and tighten stop-losses before the inevitable reversal.`, weight: phase === 'euphoria' ? 5 : 0 },

    // Crash probability
    { type: 'warning', text: `Crash probability at ${crashProbability}% — elevated risk. Consider reducing leveraged positions and keeping 25%+ in cash as a buffer.`, weight: crashProbability > 60 ? 5 : 0 },
    { type: 'warning', text: `Crash odds climbing (${crashProbability}%). A defensive rotation into stable assets now costs little if wrong but saves big if right.`, weight: crashProbability > 40 && crashProbability <= 60 ? 3 : 0 },

    // Volatility
    { type: 'warning', text: `Portfolio volatility at ${volatilityScore}% — dangerously high. One black swan event could wipe out recent gains. Trim the riskiest positions.`, weight: volatilityScore > 70 ? 4 : 0 },
    { type: 'info',    text: `Low volatility (${volatilityScore}%) — the market is calm. Good time to accumulate growth positions before the next breakout.`, weight: volatilityScore < 20 ? 2 : 0 },

    // Meme exposure
    { type: 'warning', text: `${memeExp}% in meme stocks is above the 30% safety threshold. One coordinated dump and your portfolio takes a serious hit — trim or add a stop-loss.`, weight: memeExp > 30 ? 4 : 0 },
    { type: 'bullish', text: `Meme exposure at ${memeExp}% — within safe limits. You can afford a small top-up if sentiment is trending up.`, weight: memeExp > 5 && memeExp <= 30 ? 1 : 0 },

    // Cash / liquidity
    { type: 'warning', text: `Only ${cashPct}% cash remaining. You have limited room to react to a crash or capitalize on a sudden dip. Consider lightening one position.`, weight: cashPct < 10 ? 4 : 0 },
    { type: 'info',    text: `${cashPct}% cash on hand — good liquidity. You're ready to strike on the next big dip or news event.`, weight: cashPct > 35 ? 2 : 0 },

    // P&L milestones
    { type: 'bullish', text: `Portfolio up ${pnlPct.toFixed(1)}% — solid performance. Lock in some profits; a 20% drawdown from here still leaves you green.`, weight: pnlPct > 40 ? 3 : 0 },
    { type: 'bearish', text: `Down ${Math.abs(pnlPct).toFixed(1)}% overall. Avoid revenge trading — focus on high-conviction setups only and keep position sizes smaller.`, weight: pnlPct < -20 ? 3 : 0 },

    // Holdings
    { type: 'info',    text: `${state.holdings.length} open positions. Diversification helps, but more than 6–7 positions makes active management harder. Consider consolidating.`, weight: state.holdings.length > 6 ? 2 : 0 },
    { type: 'info',    text: `No open positions. Cash is a position too — but the market rewards those who act on conviction. Pick your best setup.`, weight: state.holdings.length === 0 ? 2 : 0 },

    // General wisdom (always available)
    { type: 'info',    text: `Tick #${tick}: The trend is your friend until it bends. Use the news feed — event stocks move first and fastest.`, weight: 1 },
    { type: 'info',    text: `Buy the rumor, sell the news — especially true for event stocks. Position before the headline, exit into the spike.`, weight: 1 },
    { type: 'info',    text: `Never risk more than 10% of your portfolio on a single prediction bet. The 8x crash bet is tempting — but it expires worthless most of the time.`, weight: 1 },
    { type: 'bullish', text: `Stable stocks (USB, UTIL) are boring by design. In PANIC or BEAR phases they become the only green in your portfolio.`, weight: 1 },
  ];

  const pool = candidates.flatMap(c => Array(c.weight).fill(c));
  const pick = pool[Math.floor(Math.random() * pool.length)]!;

  return {
    id: `adv_${tick}_${Math.random().toString(36).slice(2, 6)}`,
    tick,
    type: pick.type,
    text: pick.text,
  };
}

const MAX_MESSAGES = 12;
const ADVICE_INTERVAL = 8; // every 8 ticks

export default function AIAdviceFeed() {
  const state   = useGameStore();
  const [feed, setFeed] = useState<AdviceMsg[]>(() => [generateAdvice(useGameStore.getState())]);

  useEffect(() => {
    if (state.tick > 0 && state.tick % ADVICE_INTERVAL === 0) {
      setFeed(prev => {
        const next = [generateAdvice(useGameStore.getState()), ...prev];
        return next.slice(0, MAX_MESSAGES);
      });
    }
  }, [state.tick]);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">AI Advice Feed</div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-gray-600 text-xs">Live</span>
        </div>
      </div>

      <div className="overflow-y-auto flex flex-col gap-2 p-3" style={{ maxHeight: '340px' }}>
        {feed.map((msg, i) => {
          const style = TYPE_STYLES[msg.type];
          return (
            <div
              key={msg.id}
              className={clsx(
                'rounded-xl p-3 border transition-opacity',
                i === 0 ? 'bg-gray-800/80 border-gray-600/60' : 'bg-gray-800/40 border-gray-700/40 opacity-80'
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
                <span className={clsx('text-xs font-bold', style.text)}>{style.label}</span>
                <span className="text-gray-600 text-xs ml-auto">tick #{msg.tick}</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">{msg.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
