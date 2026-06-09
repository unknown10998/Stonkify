import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme    = 'dark' | 'light';
export type ItemSize = 'sm'   | 'md'   | 'lg';

interface SettingsStore {
  theme:           Theme;
  itemSize:        ItemSize;
  soundEnabled:    boolean;
  soundVolume:     number;   // 0–1
  musicEnabled:    boolean;
  musicVolume:     number;   // 0–1
  setTheme:        (t: Theme)    => void;
  setItemSize:     (s: ItemSize) => void;
  setSoundEnabled: (v: boolean)  => void;
  setSoundVolume:  (v: number)   => void;
  setMusicEnabled: (v: boolean)  => void;
  setMusicVolume:  (v: number)   => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme:           'dark',
      itemSize:        'md',
      soundEnabled:    true,
      soundVolume:     0.7,
      musicEnabled:    true,
      musicVolume:     0.35,
      setTheme:        (theme)        => set({ theme }),
      setItemSize:     (itemSize)     => set({ itemSize }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundVolume:  (soundVolume)  => set({ soundVolume }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setMusicVolume:  (musicVolume)  => set({ musicVolume }),
    }),
    { name: 'stonkify-settings' }
  )
);
