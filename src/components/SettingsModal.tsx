import { X, Moon, Sun, LayoutList, Volume2, VolumeX, Music } from 'lucide-react';
import { useSettingsStore, type Theme, type ItemSize } from '../store/settingsStore';
import clsx from 'clsx';

interface Props {
  onClose: () => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: 'dark',  label: 'Dark',  icon: Moon },
  { value: 'light', label: 'Light', icon: Sun  },
];

const SIZE_OPTIONS: { value: ItemSize; label: string; desc: string }[] = [
  { value: 'sm', label: 'Small',  desc: 'Compact cards, no charts'  },
  { value: 'md', label: 'Medium', desc: 'Default — chart + details' },
  { value: 'lg', label: 'Large',  desc: 'Tall charts, extra padding' },
];

export default function SettingsModal({ onClose }: Props) {
  const { theme, itemSize, soundEnabled, soundVolume, musicEnabled, musicVolume, setTheme, setItemSize, setSoundEnabled, setSoundVolume, setMusicEnabled, setMusicVolume } = useSettingsStore();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-800">
          <div className="text-white font-black text-xl">Settings</div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-7">

          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun size={15} className="text-gray-400" />
              <span className="text-white font-semibold text-sm uppercase tracking-wider">Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEME_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={clsx(
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold text-sm transition-all',
                      theme === opt.value
                        ? 'bg-yellow-700/30 border-yellow-600/50 text-yellow-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                    )}
                  >
                    <Icon size={15} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutList size={15} className="text-gray-400" />
              <span className="text-white font-semibold text-sm uppercase tracking-wider">Item Size</span>
            </div>
            <div className="flex flex-col gap-2">
              {SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setItemSize(opt.value)}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 rounded-xl border font-semibold text-sm transition-all text-left',
                    itemSize === opt.value
                      ? 'bg-yellow-700/30 border-yellow-600/50 text-yellow-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                  )}
                >
                  <span>{opt.label}</span>
                  <span className={clsx('text-xs font-normal', itemSize === opt.value ? 'text-yellow-500' : 'text-gray-600')}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Effects */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {soundEnabled ? <Volume2 size={15} className="text-gray-400" /> : <VolumeX size={15} className="text-gray-400" />}
              <span className="text-white font-semibold text-sm uppercase tracking-wider">Sound Effects</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={clsx(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border font-semibold text-sm transition-all',
                soundEnabled
                  ? 'bg-yellow-700/30 border-yellow-600/50 text-yellow-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
              )}
            >
              <span>{soundEnabled ? 'Sounds On' : 'Sounds Off'}</span>
              <span className={clsx('text-xs font-normal', soundEnabled ? 'text-yellow-500' : 'text-gray-600')}>
                {soundEnabled ? 'Buy, sell, crash & more' : 'All audio muted'}
              </span>
            </button>
            {soundEnabled && (
              <div className="flex items-center gap-3 mt-3">
                <VolumeX size={13} className="text-gray-600 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={soundVolume}
                  onChange={e => setSoundVolume(Number(e.target.value))}
                  className="flex-1 accent-yellow-500 h-1.5 rounded-full cursor-pointer"
                />
                <Volume2 size={13} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-500 text-xs w-8 text-right">{Math.round(soundVolume * 100)}%</span>
              </div>
            )}
          </div>

          {/* Background Music */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Music size={15} className="text-gray-400" />
              <span className="text-white font-semibold text-sm uppercase tracking-wider">Background Music</span>
            </div>
            <button
              onClick={() => setMusicEnabled(!musicEnabled)}
              className={clsx(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border font-semibold text-sm transition-all mb-3',
                musicEnabled
                  ? 'bg-yellow-700/30 border-yellow-600/50 text-yellow-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
              )}
            >
              <span>{musicEnabled ? 'Music On' : 'Music Off'}</span>
              <span className={clsx('text-xs font-normal', musicEnabled ? 'text-yellow-500' : 'text-gray-600')}>
                {musicEnabled ? 'Playing in background' : 'Muted'}
              </span>
            </button>
            {musicEnabled && (
              <div className="flex items-center gap-3">
                <VolumeX size={13} className="text-gray-600 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={e => setMusicVolume(Number(e.target.value))}
                  className="flex-1 accent-yellow-500 h-1.5 rounded-full cursor-pointer"
                />
                <Volume2 size={13} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-500 text-xs w-8 text-right">{Math.round(musicVolume * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
