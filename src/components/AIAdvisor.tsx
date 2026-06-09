import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useGameStore, getNetWorth } from '../store/gameStore';
import { getAIAdvisorComment } from '../engine/newsEngine';
import type { GameState } from '../types';

interface ChatMsg {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

function buildAIReply(raw: string, state: GameState): string {
  const msg   = raw.toLowerCase().trim();
  const nw    = getNetWorth(state);
  const pnl   = nw - state.startingCash;
  const pnlPct= ((pnl / state.startingCash) * 100).toFixed(1);
  const phase = state.marketPhase;
  const sent  = state.globalSentiment;
  const { volatilityScore, crashProbability, liquidityHealth } = state.riskMetrics;
  const memeExp = Math.round((state.riskMetrics.exposureByCategory.meme ?? 0) * 100);

  // --- portfolio / how am I doing ---
  if (/portfolio|how am i|how('?m| am) i doing|net worth|balance|worth/.test(msg)) {
    return `Your portfolio is currently worth $${nw.toLocaleString('en-US', { maximumFractionDigits: 0 })}, which is ${pnl >= 0 ? 'up' : 'down'} $${Math.abs(pnl).toFixed(0)} (${pnl >= 0 ? '+' : ''}${pnlPct}%) from your $10,000 start. Cash on hand: $${state.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}. ${liquidityHealth < 30 ? 'Warning: low cash — you have limited ability to react to emergencies.' : 'Liquidity looks healthy.'}`;
  }

  // --- market status ---
  if (/market|what('?s| is) happening|phase|status|update/.test(msg)) {
    const sentLabel = sent > 0.4 ? 'greedy' : sent < -0.4 ? 'fearful' : 'neutral';
    return `Market is in ${phase.toUpperCase()} phase. Sentiment is ${sentLabel} (${Math.round((sent + 1) * 50)}% greedy). Crash probability: ${crashProbability}%. ${phase === 'panic' ? 'PANIC mode — consider stable assets or cash.' : phase === 'euphoria' ? 'EUPHORIA — take profits before the reversal.' : phase === 'bull' ? 'Bull run in play — momentum is your friend.' : 'Bear market — shorts and stable assets are safer.'}`;
  }

  // --- what should I buy ---
  if (/buy|invest|what should i|recommend|pick/.test(msg)) {
    if (phase === 'panic')    return `In PANIC, I'd buy stable assets like USB or UTIL — they hold value and sometimes rise during crashes. Avoid meme stocks entirely until sentiment recovers.`;
    if (phase === 'bear')     return `Bear market — if anything, consider shorting meme stocks (DGRT, MOON) which drop hard in downturns. Growth stocks also suffer, so be selective.`;
    if (phase === 'bull')     return `Bull run in play. Growth stocks like AIMC and FNTK tend to outperform. A small meme position (≤15% of portfolio) can pay off big, but set a stop-loss.`;
    if (phase === 'euphoria') return `EUPHORIA is dangerous — everything looks good but a crash is coming. Lock in profits on positions you've held a while. Don't open large new positions now.`;
    return `Market is sideways. Accumulate positions in stable and growth stocks. Keep 20%+ in cash so you can react when a directional move happens.`;
  }

  // --- sell ---
  if (/sell|close|exit|when to sell/.test(msg)) {
    const holdings = state.holdings.filter(h => !h.isShorted);
    if (holdings.length === 0) return `You don't have any long positions open. If you're looking for an exit strategy: always set take-profit orders so you lock gains automatically.`;
    return `For your ${holdings.length} open position${holdings.length > 1 ? 's' : ''}: sell when you've hit your profit target OR if a news event hits your sector hard. In ${phase} phase, ${phase === 'panic' || phase === 'bear' ? 'consider reducing risk exposure now.' : 'hold if momentum is still positive.'}`;
  }

  // --- risk ---
  if (/risk|safe|dangerous|volatile|volatility/.test(msg)) {
    const riskLevel = volatilityScore > 70 ? 'very high' : volatilityScore > 40 ? 'moderate' : 'low';
    return `Your portfolio risk is ${riskLevel} (volatility score: ${volatilityScore}%). ${memeExp > 30 ? `You have ${memeExp}% in meme stocks — that's the biggest driver of your risk. Consider trimming.` : 'Meme exposure is manageable.'} Crash probability is ${crashProbability}%. ${crashProbability > 50 ? 'This is elevated — hedge with stable assets or cash.' : 'No immediate crash signal.'}`;
  }

  // --- what is X (term definitions) ---
  if (/what is|what('?s| does)|explain|mean|definition of/.test(msg)) {
    if (/volatility/.test(msg))   return `Volatility measures how wildly your portfolio value swings up and down. A high volatility score means your holdings can lose significant value in a single tick. Meme stocks and high leverage increase volatility.`;
    if (/liquidity/.test(msg))    return `Liquidity is how much cash you have available to act. Low liquidity means if a crash happens or a great buying opportunity appears, you can't react. Always keep at least 15–20% of your portfolio in cash.`;
    if (/sentiment/.test(msg))    return `Market sentiment is the collective mood of the market — from Fear (sellers dominate, prices fall) to Greed (buyers dominate, prices rise). It drives momentum and often becomes a self-fulfilling prophecy.`;
    if (/leverage/.test(msg))     return `Leverage lets you control a larger position than your cash allows. 5× leverage means a 1% price move = 5% gain or loss. It amplifies everything — including losses. Only use leverage if you have a stop-loss set.`;
    if (/short/.test(msg))        return `Shorting means you profit when a stock price falls. You borrow shares, sell them, then buy them back cheaper. Risk: if the price rises instead, your losses grow the higher it goes. Always set a stop-loss on shorts.`;
    if (/stop.?loss/.test(msg))   return `A stop-loss is an automatic sell order that triggers when a stock drops to a price you set. It prevents a small loss from becoming a catastrophic one. For example, set a stop-loss at 10% below your buy price to limit downside.`;
    if (/take.?profit/.test(msg)) return `A take-profit order automatically sells a position when it reaches your target price. It locks in gains without you needing to watch the screen. Pro tip: use take-profit on meme stocks since they can reverse violently.`;
    if (/meme/.test(msg))         return `Meme stocks are volatile assets driven by hype rather than fundamentals. They can rally 200% in minutes or crash 80% just as fast. Treat them like casino chips — only risk what you can afford to lose completely.`;
    if (/stable/.test(msg))       return `Stable stocks are low-volatility assets like bonds and utilities. They move slowly but hold value during market crashes. Think of them as your portfolio's safety net — park cash here when the market gets chaotic.`;
    if (/growth/.test(msg))       return `Growth stocks are trend-driven assets in sectors like AI, biotech, and fintech. They perform strongly in bull markets but can drop hard during rate hikes or bear phases. Good for momentum trading.`;
    if (/event/.test(msg))        return `Event stocks react explosively to news events. An oil fund might spike 30% on geopolitical news, then reverse. They're profitable if you catch the move early but dangerous to hold through uncertainty.`;
    if (/crash/.test(msg))        return `A market crash (PANIC phase) is a rapid, widespread price drop triggered by fear, bad news, or cascading sell orders. Signs to watch: crash probability above 60%, negative sentiment spiral, multiple bad news events in quick succession.`;
    if (/bet/.test(msg))          return `Prediction bets let you stake money on short-term market direction. Market Up/Down pays 1.8× in 5 ticks. A Crash Bet pays 8× if PANIC hits within 10 ticks. They're high-risk but can hedge your portfolio or generate bonus returns.`;
  }

  // --- help ---
  if (/help|what can you|commands|questions/.test(msg)) {
    return `You can ask me:\n• "How am I doing?" — portfolio summary\n• "What's happening in the market?" — phase & sentiment\n• "What should I buy?" — phase-based recommendation\n• "What is [term]?" — explain volatility, leverage, meme stocks, etc.\n• "Is my risk too high?" — risk analysis\n• "When should I sell?"`;
  }

  // --- fallback ---
  const fallbacks = [
    `I'm analyzing tick #${state.tick}. ${getAIAdvisorComment(nw, state.startingCash, phase, volatilityScore)}`,
    `Right now the market is ${phase} and your portfolio is ${pnl >= 0 ? 'profitable' : 'in the red'}. Ask me something specific — "what should I buy?" or "is my risk too high?"`,
    `Good question. The short answer: in ${phase} phase, ${phase === 'bull' ? 'momentum is your friend' : phase === 'panic' ? 'defense is survival' : 'patience is key'}. Ask me to explain any specific term or strategy.`,
  ];
  return fallbacks[state.tick % fallbacks.length]!;
}

export default function AIAdvisor() {
  const state = useGameStore();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'init',
      role: 'ai',
      text: "I'm your AI Risk Advisor. I'll alert you every 60 ticks with market warnings. You can also ask me anything — portfolio status, what to buy, what terms mean, or how to manage risk.",
    },
  ]);
  const [input, setInput]     = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Periodic AI broadcasts
  // useEffect(() => {
  //   if (state.tick > 0 && state.tick % 60 === 0) {
  //     const nw      = getNetWorth(state);
  //     const comment = getAIAdvisorComment(nw, state.startingCash, state.marketPhase, state.riskMetrics.volatilityScore);
  //     setMessages(prev => [...prev, { id: `auto_${state.tick}`, role: 'ai', text: comment }]);
  //   }
  // }, [state.tick]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Small delay to feel natural
    setTimeout(() => {
      const reply = buildAIReply(text, state);
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'ai', text: reply }]);
      setIsTyping(false);
    }, 400);
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-cyan-500/30 flex flex-col" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="text-cyan-400 text-xs font-bold uppercase tracking-widest">AI Risk Advisor</div>
        <div className="text-gray-500 text-xs mt-0.5">Ask anything • auto-updates every 60  ticks</div>
      </div>

      {/* Message history — scrollable */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
        style={{ maxHeight: 380, minHeight: 180 }}
      >
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line max-w-[90%] ${
                msg.role === 'user'
                  ? 'bg-yellow-700/40 text-yellow-100 rounded-br-md'
                  : 'bg-gray-800 text-gray-200 border border-gray-700/60 rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700/60 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
        {['What should I buy?', 'How am I doing?', 'Is my risk too high?'].map(q => (
          <button
            key={q}
            onClick={() => { setInput(q); }}
            className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full border border-gray-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask the advisor..."
          className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-2.5 border border-gray-700 focus:border-cyan-600 outline-none placeholder-gray-600"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="px-3 py-2.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
