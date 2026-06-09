import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useChatStore } from '../store/chatStore';
import { useGameStore, getNetWorth } from '../store/gameStore';
import { GEMINI_API_KEY } from '../config';
import { getAIAdvisorComment } from '../engine/newsEngine';
import type { GameState } from '../types';

async function callGemini(userMessage: string, history: { role: string; text: string }[], state: GameState, apiKey: string): Promise<string> {
  const nw  = getNetWorth(state);
  const pnl = nw - state.startingCash;

  const systemInstruction = `You are an AI Risk Advisor inside a stock trading simulation game called Stonkify. Respond with concise, actionable advice (2-4 sentences max).

Current game state:
- Tick: #${state.tick}
- Market Phase: ${state.marketPhase.toUpperCase()}
- Net Worth: $${nw.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)} P&L)
- Cash: $${state.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}
- Volatility: ${state.riskMetrics.volatilityScore}%
- Crash Probability: ${state.riskMetrics.crashProbability}%
- Sentiment: ${Math.round((state.globalSentiment + 1) * 50)}% greedy
- Open Positions: ${state.holdings.length}`;

  const ai = new GoogleGenAI({ apiKey });

  const contents = [
    ...history.slice(-6).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: { systemInstruction },
    contents,
  });

  return response.text?.trim() ?? 'No response from Gemini.';
}

function buildAIReply(raw: string, state: GameState): string {
  const msg    = raw.toLowerCase().trim();
  const nw     = getNetWorth(state);
  const pnl    = nw - state.startingCash;
  const pnlPct = ((pnl / state.startingCash) * 100).toFixed(1);
  const phase  = state.marketPhase;
  const { volatilityScore, crashProbability, liquidityHealth } = state.riskMetrics;
  const memeExp = Math.round((state.riskMetrics.exposureByCategory.meme ?? 0) * 100);

  if (/portfolio|how am i|how('?m| am) i doing|net worth|balance|worth/.test(msg)) {
    return `Your portfolio is $${nw.toLocaleString('en-US', { maximumFractionDigits: 0 })}, ${pnl >= 0 ? 'up' : 'down'} $${Math.abs(pnl).toFixed(0)} (${pnl >= 0 ? '+' : ''}${pnlPct}%) from $10,000. Cash: $${state.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}. ${liquidityHealth < 30 ? 'Warning: low cash — limited ability to react to emergencies.' : 'Liquidity looks healthy.'}`;
  }
  if (/market|what('?s| is) happening|phase|status|update/.test(msg)) {
    const sentLabel = state.globalSentiment > 0.4 ? 'greedy' : state.globalSentiment < -0.4 ? 'fearful' : 'neutral';
    return `Market is in ${phase.toUpperCase()} phase. Sentiment is ${sentLabel} (${Math.round((state.globalSentiment + 1) * 50)}% greedy). Crash probability: ${crashProbability}%. ${phase === 'panic' ? 'PANIC — consider stable assets or cash.' : phase === 'euphoria' ? 'EUPHORIA — take profits before the reversal.' : phase === 'bull' ? 'Bull run in play — momentum is your friend.' : 'Bear market — shorts and stable assets are safer.'}`;
  }
  if (/buy|invest|what should i|recommend|pick/.test(msg)) {
    if (phase === 'panic')    return `In PANIC, buy stable assets like USB or UTIL — they hold value during crashes. Avoid meme stocks entirely until sentiment recovers.`;
    if (phase === 'bear')     return `Bear market — consider shorting meme stocks (DGRT, MOON) which drop hard. Growth stocks also suffer, so be selective.`;
    if (phase === 'bull')     return `Bull run. Growth stocks like AIMC and FNTK tend to outperform. A small meme position (15% max) can pay off big, but set a stop-loss.`;
    if (phase === 'euphoria') return `EUPHORIA is dangerous — everything looks good but a crash is coming. Lock in profits on existing positions. Don't open large new positions now.`;
    return `Market is sideways. Accumulate stable and growth stocks. Keep 20%+ in cash so you can react when a direction move happens.`;
  }
  if (/sell|close|exit|when to sell/.test(msg)) {
    const holdings = state.holdings.filter(h => !h.isShorted);
    if (holdings.length === 0) return `No long positions open. Tip: always set take-profit orders so you lock gains automatically.`;
    return `You have ${holdings.length} open position${holdings.length > 1 ? 's' : ''}. In ${phase} phase — ${phase === 'panic' || phase === 'bear' ? 'consider reducing risk exposure now.' : 'hold if momentum is still positive.'}`;
  }
  if (/risk|safe|dangerous|volatile|volatility/.test(msg)) {
    const level = volatilityScore > 70 ? 'very high' : volatilityScore > 40 ? 'moderate' : 'low';
    return `Portfolio risk is ${level} (volatility: ${volatilityScore}%). ${memeExp > 30 ? `${memeExp}% meme exposure is the biggest driver — trim it.` : 'Meme exposure is manageable.'} Crash probability: ${crashProbability}%.${crashProbability > 50 ? ' Elevated — hedge now.' : ' No immediate crash signal.'}`;
  }
  if (/what is|what('?s| does)|explain|mean|definition of/.test(msg)) {
    if (/volatility/.test(msg))   return `Volatility measures how wildly your portfolio swings. High meme/leveraged exposure raises this. Aim to keep it below 40%.`;
    if (/liquidity/.test(msg))    return `Liquidity = how much cash you have available. Low liquidity means you can't react to crashes or opportunities. Keep at least 15–20% in cash.`;
    if (/sentiment/.test(msg))    return `Market sentiment is the collective mood — from Fear (prices fall) to Greed (prices rise). It drives momentum and becomes self-fulfilling.`;
    if (/leverage/.test(msg))     return `Leverage multiplies your position size. 5x leverage means a 1% price move = 5% gain or loss. Always set a stop-loss when using leverage.`;
    if (/short/.test(msg))        return `Shorting means you profit when a stock falls. You borrow shares, sell them, then buy back cheaper. If the price rises instead, your loss grows — use stop-losses.`;
    if (/stop.?loss/.test(msg))   return `A stop-loss auto-sells when a stock hits a price you set. It prevents small losses from becoming catastrophic. Set it 10–15% below your buy price.`;
    if (/take.?profit/.test(msg)) return `A take-profit auto-sells when your target price is hit, locking in gains. Essential for meme stocks which can reverse violently.`;
    if (/meme/.test(msg))         return `Meme stocks are hype-driven assets. They can rally 200% or crash 80% in minutes. Treat them like casino chips — only risk what you can afford to lose.`;
    if (/stable/.test(msg))       return `Stable stocks (bonds, utilities) move slowly but hold value during crashes. They're your safety net — park cash here when the market gets chaotic.`;
    if (/growth/.test(msg))       return `Growth stocks (AI, biotech, fintech) perform strongly in bull markets but drop hard during rate hikes or bear phases.`;
    if (/event/.test(msg))        return `Event stocks react explosively to news. An oil fund can spike 30% on geopolitical news then reverse just as fast.`;
    if (/crash/.test(msg))        return `A crash (PANIC phase) is a rapid widespread drop triggered by fear or bad news. Watch: crash probability above 60%, negative sentiment, multiple bad news events.`;
    if (/bet/.test(msg))          return `Prediction bets let you stake money on short-term direction. Market Up/Down pays 1.8x in 5 ticks. A Crash Bet pays 8x if PANIC hits in 10 ticks.`;
  }
  if (/help|what can you|commands/.test(msg)) {
    return `Ask me:\n• "How am I doing?" — portfolio summary\n• "What's happening?" — market phase & sentiment\n• "What should I buy?" — phase-based recommendation\n• "Is my risk too high?" — risk analysis\n• "What is [term]?" — explain any trading term\n• "When should I sell?"`;
  }
  const fallbacks = [
    `Currently at tick #${state.tick}. ${getAIAdvisorComment(nw, state.startingCash, phase, volatilityScore)}`,
    `Market is ${phase}, your portfolio is ${pnl >= 0 ? 'profitable' : 'in the red'}. Ask me something specific like "what should I buy?" or "is my risk too high?"`,
  ];
  return fallbacks[state.tick % fallbacks.length]!;
}

export default function ChatModal() {
  const { open, messages, closeChat, addMessage } = useChatStore();
  const state = useGameStore();
  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState('');
  const chatRef  = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping, open]);


  async function send() {
    const text = input.trim();
    if (!text) return;
    addMessage({ id: `u_${Date.now()}`, role: 'user', text });
    setInput('');
    setIsTyping(true);
    setApiError('');

    if (GEMINI_API_KEY) {
      try {
        const history = messages.map(m => ({ role: m.role, text: m.text }));
        const reply = await callGemini(text, history, state, GEMINI_API_KEY);
        addMessage({ id: `a_${Date.now()}`, role: 'ai', text: reply });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setApiError(msg);
        addMessage({ id: `a_${Date.now()}`, role: 'ai', text: buildAIReply(text, state) });
      }
      setIsTyping(false);
    } else {
      setTimeout(() => {
        addMessage({ id: `a_${Date.now()}`, role: 'ai', text: buildAIReply(text, state) });
        setIsTyping(false);
      }, 380);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeChat} />

      {/* Modal */}
      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-2xl flex flex-col shadow-2xl"
        style={{ width: '920px', height: '960px', maxWidth: '95vw', maxHeight: '95vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="text-white font-black text-xl">AI Risk Advisor</div>
              {GEMINI_API_KEY
                ? <span className="text-xs px-2.5 py-1 bg-green-900/50 text-green-400 border border-green-700/50 rounded-full font-semibold">Gemini</span>
                : <span className="text-xs px-2.5 py-1 bg-gray-800 text-gray-500 border border-gray-700 rounded-full font-semibold">Built-in</span>
              }
            </div>
            <div className="text-gray-500 text-sm mt-0.5">Ask anything about your portfolio, market conditions, or trading strategy</div>
          </div>
          <button onClick={closeChat} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div className="mx-7 mt-3 px-4 py-2.5 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-xs flex items-center justify-between flex-shrink-0">
            <span>Gemini error: {apiError} — fell back to built-in response.</span>
            <button onClick={() => setApiError('')} className="ml-3 text-red-500 hover:text-red-300"><X size={12} /></button>
          </div>
        )}

        {/* Suggested prompts */}
        <div className="px-7 py-3 flex gap-2 flex-wrap flex-shrink-0 border-b border-gray-800/60">
          {['What should I buy?', 'How am I doing?', 'Is my risk too high?', "What's happening in the market?", 'What is volatility?'].map(q => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-sm px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full border border-gray-700 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center flex-shrink-0 mr-3 mt-1 text-xs font-bold text-cyan-400">AI</div>
              )}
              <div className={`rounded-2xl px-5 py-3.5 text-base leading-relaxed whitespace-pre-line max-w-[75%] ${
                msg.role === 'user'
                  ? 'bg-yellow-700/40 text-yellow-100 rounded-br-md'
                  : 'bg-gray-800 text-gray-200 border border-gray-700/60 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center mr-3 flex-shrink-0 text-xs font-bold text-cyan-400">AI</div>
              <div className="bg-gray-800 border border-gray-700/60 rounded-2xl rounded-bl-md px-5 py-4">
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-7 py-5 border-t border-gray-800 flex gap-3 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask the advisor anything..."
            className="flex-1 bg-gray-800 text-white text-base rounded-xl px-5 py-3.5 border border-gray-700 focus:border-cyan-600 outline-none placeholder-gray-600"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="px-5 py-3.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold flex items-center gap-2"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
