import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useTourStore, TOUR_STEPS } from '../store/tourStore';
import { useChatStore } from '../store/chatStore';
import AssetCard from '../components/AssetCard';
import RiskDashboard from '../components/RiskDashboard';
import NewsFeed from '../components/NewsFeed';
import BettingPanel from '../components/BettingPanel';
import Leaderboard from '../components/Leaderboard';
import AIAdviceFeed from '../components/AIAdviceFeed';
import ChatModal from '../components/ChatModal';
import SettingsModal from '../components/SettingsModal';
import StockModal from '../components/StockModal';
import NetWorthModal from '../components/NetWorthModal';
import MarketScanner from '../components/MarketScanner';
import TradeHistory from '../components/TradeHistory';
import OnboardingTour from '../components/OnboardingTour';
import TradeToast from '../components/TradeToast';
import AchievementToast from '../components/AchievementToast';
import AchievementsTab from '../components/AchievementsTab';
import { Play, Pause, MessageCircle, Settings, TrendingUp, Music, Music2 } from 'lucide-react';
import { EXTRA_ASSET_POOL } from '../engine/marketEngine';
import { useSettingsStore } from '../store/settingsStore';
import { fetchUSStockCount } from '../services/stockService';
import type { AssetCategory } from '../types';
import clsx from 'clsx';

type Tab = 'assets' | 'news' | 'bets' | 'trades' | 'leaderboard' | 'achievements';

const CATEGORY_FILTERS: { value: AssetCategory | 'all'; label: string }[] = [
  { value: 'all',    label: 'All'    },
  { value: 'index',  label: 'Index'  },
  { value: 'stable', label: 'Stable' },
  { value: 'growth', label: 'Growth' },
  { value: 'meme',   label: 'Meme'   },
  { value: 'event',  label: 'Event'  },
];

const SPEED_OPTIONS = [
  { label: 'Slow (2s)',   value: 2000 },
  { label: 'Normal (1s)', value: 1000 },
  { label: 'Fast (0.5s)', value: 500  },
  { label: 'Turbo (0.2s)',value: 200  },
];

export default function GameScreen() {
  const { status, tick, assets, pauseGame, resumeGame, goToMenu, addMoreAssets } = useGameStore();
  const advanceTick = useGameStore(s => s.advanceTick);
  const isTourActive = useTourStore(s => s.isActive);
  const tourStep = useTourStore(s => s.step);
  const { startTour, hasSeenTour } = useTourStore();
  const { openChat } = useChatStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tab, setTab]                       = useState<Tab>('assets');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');
  const [speed, setSpeed]                   = useState(1000);
  const [settingsOpen, setSettingsOpen]       = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [netWorthOpen, setNetWorthOpen]       = useState(false);
  const [leftOpen, setLeftOpen]               = useState(false);
  const [rightOpen, setRightOpen]             = useState(false);
  const [seenTrades, setSeenTrades] = useState(() => Number(localStorage.getItem('stonkify_seen_trades') ?? 0));
  const [seenAch,    setSeenAch]    = useState(() => Number(localStorage.getItem('stonkify_seen_ach')    ?? 0));
  const [addingAssets, setAddingAssets]       = useState(false);
  const [addResult, setAddResult]             = useState<string | null>(null);
  const { musicEnabled, setMusicEnabled }     = useSettingsStore();

  // Auto-start tour on first game
  useEffect(() => {
    if (!hasSeenTour) {
      const t = setTimeout(() => startTour(), 400);
      return () => clearTimeout(t);
    }
  }, []);

  // Switch to the correct tab when the tour advances to a step that specifies one
  useEffect(() => {
    if (!isTourActive) return;
    const current = TOUR_STEPS[tourStep];
    if (current?.tab) setTab(current.tab);
  }, [tourStep, isTourActive]);

  useEffect(() => {
    if (status === 'playing') {
      intervalRef.current = setInterval(advanceTick, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status, speed, advanceTick]);

  const filteredAssets = categoryFilter === 'all'
    ? assets
    : assets.filter(a => a.category === categoryFilter);

  const tradeCount  = useGameStore(s => s.tradeHistory.length);
  const achUnlocked = useGameStore(s => s.allAchievements.length);
  const newTrades   = tradeCount  > seenTrades ? tradeCount  - seenTrades : 0;
  const newAch      = achUnlocked > seenAch    ? achUnlocked - seenAch    : 0;
  const TAB_CONFIG: { id: Tab; label: string; count?: number }[] = [
    { id: 'assets',       label: 'Markets'      },
    { id: 'news',         label: 'News'         },
    { id: 'bets',         label: 'Bets'         },
    { id: 'trades',       label: 'Trades',       count: newTrades > 0 ? newTrades : undefined },
    { id: 'leaderboard',  label: 'Leaderboard'  },
    { id: 'achievements', label: 'Achievements', count: newAch    > 0 ? newAch    : undefined },
  ];

  function handleTabClick(id: Tab) {
    setTab(id);
    if (id === 'trades') {
      setSeenTrades(tradeCount);
      localStorage.setItem('stonkify_seen_trades', String(tradeCount));
    }
    if (id === 'achievements') {
      setSeenAch(achUnlocked);
      localStorage.setItem('stonkify_seen_ach', String(achUnlocked));
    }
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* ── Top Navigation Bar ── */}
      <nav className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2">
          <img src="/logo.png" alt="Stonkify" className="h-9 w-9 object-contain" />
          <span className="font-black text-base tracking-tight hidden sm:block">
            <span className="text-white">STO</span>
            <span className="text-yellow-400">NK</span>
            <span className="text-red-400">IFY</span>
          </span>
        </div>

        <div className="h-5 w-px bg-gray-700" />

        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={status === 'playing' ? pauseGame : resumeGame}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors',
              status === 'playing'
                ? 'bg-yellow-700 hover:bg-yellow-600 text-yellow-100'
                : 'bg-green-700 hover:bg-green-600 text-green-100'
            )}
          >
            {status === 'playing'
              ? <><Pause size={13} /> Pause</>
              : <><Play size={13} /> Resume</>}
          </button>

          <select
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="hidden sm:block bg-gray-800 text-gray-300 text-sm rounded-xl px-3 py-2.5 border border-gray-700 cursor-pointer"
          >
            {SPEED_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Tick counter */}
        <div className="text-gray-500 text-sm font-mono hidden sm:block">
          Tick <span className="text-white font-bold">#{tick}</span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Panel toggles — only visible when panels are hidden */}
          <button
            onClick={() => { setLeftOpen(o => !o); setRightOpen(false); }}
            className={clsx('lg:hidden px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors',
              leftOpen ? 'bg-yellow-700/30 border-yellow-600/40 text-yellow-300' : 'bg-gray-800 border-gray-700 text-gray-400')}
          >Risk</button>
          <button
            onClick={() => { setRightOpen(o => !o); setLeftOpen(false); }}
            className={clsx('xl:hidden px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors',
              rightOpen ? 'bg-yellow-700/30 border-yellow-600/40 text-yellow-300' : 'bg-gray-800 border-gray-700 text-gray-400')}
          >Advisor</button>

          <button
            onClick={() => setNetWorthOpen(true)}
            className="p-2.5 bg-gray-800 hover:bg-gray-700 text-green-400 hover:text-green-300 rounded-xl transition-colors border border-gray-700"
            title="Portfolio chart"
          >
            <TrendingUp size={15} />
          </button>
          <button
            onClick={() => setMusicEnabled(!musicEnabled)}
            title={musicEnabled ? 'Mute music' : 'Play music'}
            className={clsx(
              'p-2.5 rounded-xl border transition-colors',
              musicEnabled
                ? 'bg-yellow-700/30 border-yellow-600/50 text-yellow-300 hover:bg-yellow-700/50'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-white hover:bg-gray-700'
            )}
          >
            {musicEnabled ? <Music size={15} /> : <Music2 size={15} />}
          </button>
          <button
            onClick={startTour}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-gray-700"
          >
            Tour
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors border border-gray-700"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={goToMenu}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-sm transition-colors"
          >
            Menu
          </button>
        </div>
      </nav>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel — Risk Dashboard */}
        <div
          data-tour="dashboard"
          className={clsx(
            'flex-shrink-0 overflow-y-auto border-r border-gray-800 p-4 bg-gray-950 w-72',
            'lg:flex flex-col',
            leftOpen ? 'absolute inset-y-0 left-0 z-30 flex flex-col shadow-2xl' : 'hidden lg:flex'
          )}
        >
          <RiskDashboard />
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0 overflow-x-auto">
            {TAB_CONFIG.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                  tab === t.id
                    ? 'bg-yellow-700/30 text-yellow-400 border border-yellow-600/40'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className="text-xs font-semibold text-yellow-500 bg-yellow-900/40 px-1.5 py-0.5 rounded-full">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5" data-tour="market-panel">
            {tab === 'assets' && (
              <>
                {/* Category legend */}
                <div className="mb-5 p-4 bg-gray-900/60 border border-gray-800 rounded-2xl">
                  <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Stock Categories</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { name: 'Index',  desc: 'Broad market ETFs. Low volatility, steady trend.', color: 'text-teal-400'   },
                      { name: 'Stable', desc: 'Low risk, slow drift. Safe during crashes.',       color: 'text-blue-400'   },
                      { name: 'Growth', desc: 'Trend-driven. Volatile, high ceiling.',            color: 'text-purple-400' },
                      { name: 'Meme',   desc: 'Casino-mode. Can 5x or crash 80%.',               color: 'text-yellow-400' },
                      { name: 'Event',  desc: 'Explodes on news events. Unpredictable.',          color: 'text-orange-400' },
                    ].map(c => (
                      <div key={c.name} className="flex gap-2 items-start">
                        <span className={clsx('font-bold', c.color)}>{c.name} — </span>
                        <span className="text-gray-500">{c.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category filters */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {CATEGORY_FILTERS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setCategoryFilter(f.value)}
                      className={clsx(
                        'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                        categoryFilter === f.value
                          ? 'bg-yellow-700 text-yellow-100'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {filteredAssets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} onOpen={() => setSelectedAssetId(asset.id)} />
                  ))}
                </div>

                {/* Add more stocks */}
                {(() => {
                  const existingIds  = new Set(assets.map(a => a.id));
                  const poolLeft     = EXTRA_ASSET_POOL.filter(a => !existingIds.has(a.id)).length;
                  const isExhausted  = poolLeft === 0;
                  return (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        onClick={async () => {
                          setAddingAssets(true);
                          setAddResult(null);
                          const { added, remaining } = await addMoreAssets();
                          setAddingAssets(false);
                          setAddResult(added > 0
                            ? `Added ${added} stock${added !== 1 ? 's' : ''}${remaining > 0 ? ` · ${remaining} more available` : ' · no more available'}`
                            : 'No more stocks available');
                        }}
                        disabled={addingAssets || isExhausted}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-xl border border-gray-700 text-sm font-semibold transition-colors"
                      >
                        {addingAssets
                          ? <><span className="inline-block animate-spin">⟳</span> Fetching prices…</>
                          : isExhausted
                            ? 'All stocks added'
                            : `＋ Add 10 more stocks from API (${poolLeft} left)`}
                      </button>
                      {addResult && <div className="text-gray-500 text-xs">{addResult}</div>}
                    </div>
                  );
                })()}
              </>
            )}
            {tab === 'news'         && <NewsFeed />}
            {tab === 'bets'         && <BettingPanel />}
            {tab === 'trades'       && <TradeHistory />}
            {tab === 'leaderboard'  && <Leaderboard />}
            {tab === 'achievements' && <AchievementsTab />}
          </div>
        </div>

        {/* Right Panel */}
        <div
          data-tour="advisor"
          className={clsx(
            'flex-shrink-0 overflow-y-auto border-l border-gray-800 p-4 bg-gray-950 flex flex-col gap-4 w-80',
            rightOpen ? 'absolute inset-y-0 right-0 z-30 shadow-2xl' : 'hidden xl:flex'
          )}
        >
          {/* Market Scanner */}
          <MarketScanner />

          {/* AI Advice Feed */}
          <AIAdviceFeed />

          {/* Speed control */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Simulation Speed</div>
            <div className="flex flex-col gap-2">
              {SPEED_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSpeed(opt.value)}
                  className={clsx(
                    'w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                    speed === opt.value
                      ? 'bg-yellow-700/40 text-yellow-300 border border-yellow-600/40'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat button */}
      <button
        data-tour="chat-button"
        onClick={openChat}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-cyan-700 hover:bg-cyan-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-colors"
        title="Open AI Advisor chat"
      >
        <MessageCircle size={24} />
      </button>

      {/* AI Advisor modal */}
      <ChatModal />

      {/* Stock detail modal */}
      {selectedAssetId && (() => {
        const a = assets.find(x => x.id === selectedAssetId);
        return a ? <StockModal asset={a} onClose={() => setSelectedAssetId(null)} /> : null;
      })()}

      {/* Net worth chart modal */}
      {netWorthOpen && <NetWorthModal onClose={() => setNetWorthOpen(false)} />}

      {/* Settings modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* Mobile panel backdrop */}
      {(leftOpen || rightOpen) && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => { setLeftOpen(false); setRightOpen(false); }}
        />
      )}

      {/* Tour overlay */}
      <OnboardingTour />

      {/* Trade toast notifications (bottom-right) */}
      <TradeToast />
      {/* Achievement notifications (top-right) */}
      <AchievementToast />
    </div>
  );
}
