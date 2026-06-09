import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import Leaderboard from '../components/Leaderboard';
import type { GameMode } from '../types';
import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';

type NavTab = 'play' | 'leaderboard' | 'how';

const MODES: { mode: GameMode; label: string; description: string; color: string; selectedRing: string }[] = [
  {
    mode: 'endless',
    label: 'Endless Mode',
    description: 'Grow wealth as long as possible with no time limit. The market never sleeps.',
    color: 'border-blue-500/40 bg-blue-950/20 hover:bg-blue-900/30',
    selectedRing: 'ring-2 ring-blue-400/60',
  },
  {
    mode: 'timed',
    label: 'Timed Challenge',
    description: 'Maximize your net worth in exactly 60 rounds. Every tick counts.',
    color: 'border-yellow-500/40 bg-yellow-950/20 hover:bg-yellow-900/30',
    selectedRing: 'ring-2 ring-yellow-400/60',
  },
  {
    mode: 'survival',
    label: 'Survival Mode',
    description: 'Avoid liquidation as long as you can. Brutal volatility. No mercy.',
    color: 'border-red-500/40 bg-red-950/20 hover:bg-red-900/30',
    selectedRing: 'ring-2 ring-red-400/60',
  },
];

const HOW_TO_PLAY = [
  { title: 'Buy & Sell Assets',    body: 'Allocate capital across 10 assets — stable bonds, growth stocks, meme coins, and event-driven plays. Each category behaves differently.' },
  { title: 'React to News Events', body: 'Market-moving headlines fire every few ticks. Rate hikes, viral meme stocks, flash crashes. Adapt or get wiped.' },
  { title: 'Manage Risk',          body: 'Set stop-losses and take-profits, hedge with shorts, use leverage cautiously. Your Risk Dashboard tracks exposure in real time.' },
  { title: 'Place Predictions',    body: 'Bet on where the market goes next — up, down, or crash. Correct calls pay 1.8x–8x your stake.' },
];

export default function MenuScreen() {
  const { startGame, isLoadingPrices } = useGameStore();
  const { currentUser, logout } = useAuthStore();
  const [selectedMode, setSelectedMode] = useState<GameMode>('endless');
  const [playerName, setPlayerName] = useState(currentUser ?? '');
  const [activeTab, setActiveTab] = useState<NavTab>('play');

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* ── Nav Bar ── */}
      <nav className="flex items-center px-4 sm:px-8 py-3 border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-10">
        {/* Logo — top left */}
        <div className="flex items-center gap-3 mr-auto">
          <img src="/logo.png" alt="Stonkify" className="h-10 w-10 object-contain" />
          <span className="font-black text-lg tracking-tight">
            <span className="text-white">STO</span>
            <span className="text-yellow-400">NK</span>
            <span className="text-red-400">IFY</span>
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {(['play', 'leaderboard', 'how'] as NavTab[]).map(id => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                activeTab === id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
              )}
            >
              {id === 'how' ? 'How to Play' : id === 'leaderboard' ? 'Leaderboard' : 'Play'}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <span className="text-gray-500 text-sm px-2">{currentUser}</span>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-gray-900 transition-all"
          >
            Log out
          </button>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── PLAY TAB ── */}
        {activeTab === 'play' && (
          <div className="flex flex-col items-center w-full">

            {/* Hero */}
            <div className="flex flex-col items-center text-center w-full px-4 sm:px-8 pt-10 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 lg:pb-16 border-b border-gray-800/60">
              <img
                src="/logo.png"
                alt="Stonkify Logo"
                className="w-24 h-24 sm:w-40 sm:h-40 lg:w-56 lg:h-56 object-contain mb-6 sm:mb-8 lg:mb-10 drop-shadow-[0_0_50px_rgba(132,204,22,0.4)]"
              />
              <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-5 sm:mb-7 lg:mb-8">
                <span className="text-white">TRADE FAST.</span><br />
                <span className="text-yellow-400">BET SMART.</span><br />
                <span className="text-red-400">SURVIVE.</span>
              </h1>
              <p className="text-gray-400 text-base sm:text-xl lg:text-2xl leading-relaxed max-w-2xl px-2">
                A real-time market simulator where greed meets strategy. Outsmart
                volatility, survive black swan events, and prove your edge.
              </p>
            </div>

            {/* ── Setup form ── */}
            <div className="w-full max-w-5xl px-4 sm:px-8 flex flex-col">

              {/* Trading Alias */}
              <div className="py-10 sm:py-16 lg:py-20 border-b border-gray-800/60">
                <label className="text-gray-500 text-xs uppercase tracking-[0.25em] block mb-6">
                  Trading Alias
                </label>
                <input
                  type="text"
                  placeholder="Enter your trading alias..."
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="w-full bg-transparent text-white border-0 border-b-2 border-gray-700 focus:border-yellow-500 outline-none text-2xl sm:text-4xl lg:text-5xl placeholder-gray-700 transition-colors pb-3 sm:pb-5 font-light"
                />
              </div>

              {/* Game Mode */}
              <div className="py-10 sm:py-16 lg:py-20 border-b border-gray-800/60">
                <label className="text-gray-500 text-xs uppercase tracking-[0.25em] block mb-6 sm:mb-10">
                  Game Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {MODES.map(m => (
                    <button
                      key={m.mode}
                      onClick={() => setSelectedMode(m.mode)}
                      className={clsx(
                        'rounded-2xl border p-6 sm:p-8 lg:p-10 text-left transition-all',
                        m.color,
                        selectedMode === m.mode ? m.selectedRing : ''
                      )}
                    >

                      <div className="text-white text-2xl font-bold mb-3">{m.label}</div>
                      <div className="text-gray-400 text-base leading-relaxed">{m.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start button */}
              <div className="py-10 sm:py-16 lg:py-20">
                <button
                  onClick={() => startGame(selectedMode, playerName.trim() || 'Anonymous')}
                  className="w-full py-5 sm:py-7 lg:py-8 bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-400 hover:to-red-500 text-white font-black text-2xl sm:text-3xl lg:text-4xl rounded-2xl transition-all hover:scale-[1.01] shadow-2xl shadow-yellow-900/20 tracking-wide flex items-center justify-center gap-4"
                >
                  <TrendingUp size={36} /> START TRADING
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div className="w-full border-t border-gray-800/60 py-8 sm:py-10 flex flex-wrap justify-center gap-8 sm:gap-12 lg:gap-16 px-4">
              {[
                { label: 'Starting Capital',  value: '$10,000'         },
                { label: 'Tradeable Assets',  value: '10 Stocks'       },
                { label: 'Risk Tools',        value: 'SL · TP · Hedge' },
                { label: 'Bet Multipliers',   value: 'Up to 8×'        },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-yellow-400 font-bold text-2xl">{item.value}</div>
                  <div className="text-gray-600 text-xs uppercase tracking-[0.15em] mt-2">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <div className="flex-1 flex flex-col items-center px-8 py-16">
            <div className="w-full max-w-2xl">
              <h2 className="text-4xl font-black mb-2">Global Leaderboard</h2>
              <p className="text-gray-500 mb-8">Top traders ranked by net worth at game end.</p>
              <Leaderboard />
            </div>
          </div>
        )}

        {/* ── HOW TO PLAY TAB ── */}
        {activeTab === 'how' && (
          <div className="flex-1 flex flex-col items-center px-8 py-16">
            <div className="w-full max-w-3xl">
              <h2 className="text-4xl font-black mb-2">How to Play</h2>
              <p className="text-gray-500 mb-10">
                Stonkify blends real market mechanics with casino-style betting. Master both to dominate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {HOW_TO_PLAY.map(item => (
                  <div key={item.title} className="bg-gray-900/60 border border-gray-700 rounded-xl p-6">

                    <div className="text-white font-bold text-lg mb-2">{item.title}</div>
                    <div className="text-gray-400 text-sm leading-relaxed">{item.body}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6">
                <div className="text-yellow-400 font-bold mb-3">Asset Categories</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { name: 'Stable', desc: 'Low risk, slow drift. Treasury bonds, utilities.' },
                    { name: 'Growth', desc: 'Trend-driven. AI, biotech, fintech stocks.' },
                    { name: 'Meme',   desc: 'Extreme volatility. Viral pumps and brutal dumps.' },
                    { name: 'Event',  desc: 'Reacts hard to news. Oil, geopolitics ETFs.' },
                  ].map(c => (
                    <div key={c.name} className="flex gap-3">
                      <div>
                        <span className="text-white font-semibold">{c.name} — </span>
                        <span className="text-gray-400">{c.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('play')}
                className="mt-8 w-full py-5 bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-400 hover:to-red-500 text-white font-black text-xl rounded-2xl transition-all"
              >
                START TRADING
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
