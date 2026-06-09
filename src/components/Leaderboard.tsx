import { useEffect, useRef } from 'react';
import { useGameStore, getNetWorth } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import type { GameMode, LeaderboardEntry } from '../types';
import clsx from 'clsx';

const RANK_COLOR: Record<number, string> = {
  1: 'text-yellow-400 font-black',
  2: 'text-gray-300 font-black',
  3: 'text-amber-600 font-black',
};

const MODE_SECTIONS: Array<{ id: GameMode; label: string; sub: string }> = [
  { id: 'endless',  label: 'Endless',  sub: 'No time limit — grow as big as possible' },
  { id: 'timed',    label: 'Timed',    sub: '60 rounds — maximize net worth before time runs out' },
  { id: 'survival', label: 'Survival', sub: 'Avoid liquidation for as long as possible' },
];

const MODE_HEAD: Record<GameMode, string> = {
  endless:  'bg-purple-900/20 border-purple-700/40 text-purple-300',
  timed:    'bg-yellow-900/20 border-yellow-700/40 text-yellow-300',
  survival: 'bg-red-900/20 border-red-700/40 text-red-300',
};

function formatWorth(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.max(0, n)}`;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

function ModeRow({ entry, isPlayer, justAdded, rowRef }: {
  entry: LeaderboardEntry;
  isPlayer: boolean;
  justAdded: boolean;
  rowRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={rowRef}
      className={clsx(
        'rounded-xl border px-4 py-3 flex items-center gap-3 transition-all',
        justAdded
          ? 'bg-yellow-950/60 border-yellow-500/70 ring-2 ring-yellow-400/30 animate-pulse'
          : isPlayer
            ? 'bg-yellow-950/40 border-yellow-600/50 ring-1 ring-yellow-500/20'
            : 'bg-gray-900/60 border-gray-700/50'
      )}
    >
      <div className="w-8 text-center flex-shrink-0">
        <span className={clsx('text-base', RANK_COLOR[entry.rank] ?? 'text-gray-500 font-semibold')}>
          #{entry.rank}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-sm font-bold truncate', isPlayer ? 'text-yellow-300' : 'text-white')}>
            {entry.name}
          </span>
          {isPlayer && <span className="text-xs px-1.5 py-0.5 bg-yellow-800/50 text-yellow-300 border border-yellow-600/40 rounded font-bold">you</span>}
          {justAdded && <span className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-300 border border-green-600/40 rounded font-bold">NEW</span>}
        </div>
        <div className="text-gray-600 text-xs mt-0.5">{entry.survived} ticks · {entry.date}</div>
      </div>

      <div className={clsx('text-base font-mono font-black flex-shrink-0', isPlayer ? 'text-yellow-300' : 'text-green-400')}>
        {formatWorth(entry.netWorth)}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const state       = useGameStore();
  const leaderboard = state.leaderboard;
  const netWorth    = getNetWorth(state);
  const { playerName, tick, mode, status } = state;
  const currentUser = useAuthStore(s => s.currentUser);
  // Use the auth user as identity so rows highlight correctly on the menu screen too
  const me = playerName || currentUser || '';

  const isGameOver  = status === 'gameover';
  const isPlaying   = status === 'playing' || status === 'paused';
  const playerRowRef = useRef<HTMLDivElement | null>(null);

  // Scroll to player's row when game ends
  useEffect(() => {
    if (isGameOver && playerRowRef.current) {
      setTimeout(() => playerRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    }
  }, [isGameOver]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-gray-300 text-lg font-bold uppercase tracking-wider">Leaderboard</span>
        <span className="text-gray-600 text-xs">personal bests · by mode</span>
      </div>

      {MODE_SECTIONS.map(({ id, label, sub }) => {
        // Entries for this mode, sorted (ranks already set by store, re-sort for display)
        const entries: LeaderboardEntry[] = leaderboard
          .filter(e => e.mode === id)
          .sort((a, b) => a.rank - b.rank);

        const playerEntry  = entries.find(e => e.name === me);
        const isCurrentMode = mode === id;

        // Live rank within this mode
        const modeLeaderWorth = entries[0]?.netWorth ?? 0;
        const liveRank = entries.filter(e => e.netWorth > netWorth).length + 1;

        return (
          <div key={id}>
            {/* Mode header */}
            <div className={clsx('rounded-xl border px-4 py-2.5 mb-2 flex items-center justify-between', MODE_HEAD[id])}>
              <div>
                <span className="font-black text-sm uppercase tracking-wide">{label}</span>
                <span className="text-xs opacity-60 ml-2">{sub}</span>
              </div>
              {isCurrentMode && isPlaying && (
                <span className="text-xs font-semibold opacity-70 animate-pulse">ACTIVE</span>
              )}
            </div>

            {/* Entries */}
            <div className="flex flex-col gap-1.5">
              {entries.length === 0 && (
                <div className="text-gray-700 text-xs text-center py-3">No scores yet</div>
              )}
              {entries.map((entry, i) => {
                const isPlayer  = entry.name === me;
                const justAdded = isPlayer && isGameOver && isCurrentMode;
                return (
                  <ModeRow
                    key={i}
                    entry={entry}
                    isPlayer={isPlayer}
                    justAdded={justAdded}
                    rowRef={justAdded ? playerRowRef : undefined}
                  />
                );
              })}

              {/* Live position row — only for the active mode while playing */}
              {isPlaying && isCurrentMode && !playerEntry && (
                <div className="rounded-xl border border-cyan-600/40 bg-cyan-950/25 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 text-center flex-shrink-0">
                    <span className="text-base font-black text-cyan-400">#{liveRank}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-300 text-sm font-bold truncate">{me}</span>
                      <span className="text-xs text-cyan-700 font-semibold">LIVE</span>
                    </div>
                    <div className="text-gray-600 text-xs mt-0.5">{tick} ticks so far</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-cyan-300 text-base font-mono font-black">{formatWorth(Math.round(netWorth))}</div>
                    <div className="text-gray-600 text-xs">{ordinal(liveRank)} place</div>
                  </div>
                </div>
              )}

              {/* Personal best summary — show if playing and already on board for this mode */}
              {isPlaying && isCurrentMode && playerEntry && (
                <div className="text-gray-600 text-xs text-center pt-1">
                  Your best: <span className="text-yellow-400 font-semibold">{formatWorth(playerEntry.netWorth)}</span>
                  {' '}({ordinal(playerEntry.rank)} place) · current: <span className={netWorth >= playerEntry.netWorth ? 'text-green-400 font-semibold' : 'text-gray-400'}>{formatWorth(Math.round(netWorth))}</span>
                </div>
              )}

              {/* Gap to leader — motivation */}
              {isPlaying && isCurrentMode && !playerEntry && modeLeaderWorth > 0 && (
                <div className="text-gray-700 text-xs text-center pt-0.5">
                  Gap to #1: <span className="text-gray-500">{formatWorth(Math.max(0, modeLeaderWorth - Math.round(netWorth)))}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Final rank callout after game over */}
      {isGameOver && (() => {
        const entry = leaderboard.find(e => e.name === me && e.mode === mode);
        if (!entry) return null;
        return (
          <div className="text-center bg-gray-900/60 border border-gray-800 rounded-xl py-3 px-4 text-sm">
            You finished <span className="text-yellow-400 font-bold">{ordinal(entry.rank)}</span> in {entry.mode} mode
            {' '}with <span className="text-green-400 font-bold">{formatWorth(entry.netWorth)}</span>
          </div>
        );
      })()}
    </div>
  );
}
