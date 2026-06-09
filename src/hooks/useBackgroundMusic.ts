import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';

const MUSIC_SRC = '/music.mp3';

export function useBackgroundMusic() {
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const { musicEnabled, musicVolume } = useSettingsStore();

  // Create the audio element once
  useEffect(() => {
    const audio        = new Audio(MUSIC_SRC);
    audio.loop         = true;
    audio.volume       = 0; // start silent, fade in
    audioRef.current   = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // React to musicEnabled changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicEnabled) {
      // Browser autoplay policy: play() can fail silently before first interaction.
      // We catch and ignore — it will start on the next user interaction.
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [musicEnabled]);

  // React to volume changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicEnabled ? musicVolume : 0;
  }, [musicVolume, musicEnabled]);
}
