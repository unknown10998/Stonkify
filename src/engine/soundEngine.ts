// Synthesised sound effects via Web Audio API — no audio files needed.
// AudioContext is lazy-initialised after the first user interaction to satisfy
// browser autoplay policies.

import { useSettingsStore } from '../store/settingsStore';

let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.12,
  delayS = 0,
) {
  // Scale by the user's SFX volume setting (0–1)
  const masterVol = useSettingsStore.getState().soundVolume;
  const scaledVol = vol * masterVol;
  if (scaledVol <= 0) return;

  const c    = ctx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delayS);
  gain.gain.setValueAtTime(0.001, c.currentTime + delayS);
  gain.gain.linearRampToValueAtTime(scaledVol, c.currentTime + delayS + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delayS + dur);
  osc.start(c.currentTime + delayS);
  osc.stop(c.currentTime + delayS + dur + 0.02);
}

export const SFX = {
  // Trading actions
  buy() {
    tone(523, 0.09, 'sine', 0.13);
    tone(659, 0.14, 'sine', 0.15, 0.08);
  },

  sell() {
    tone(659, 0.09, 'sine', 0.13);
    tone(523, 0.14, 'sine', 0.15, 0.08);
  },

  short() {
    tone(440, 0.07, 'triangle', 0.10);
    tone(330, 0.16, 'triangle', 0.11, 0.08);
  },

  cover() {
    tone(330, 0.07, 'triangle', 0.10);
    tone(440, 0.14, 'triangle', 0.11, 0.08);
  },

  // Bet outcomes
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.14, i * 0.07));
  },

  loss() {
    tone(311, 0.10, 'sawtooth', 0.08);
    tone(220, 0.28, 'sawtooth', 0.09, 0.10);
  },

  // Market phase transitions
  crash() {
    // Descending alarm — 4 pulses
    for (let i = 0; i < 4; i++) {
      tone(680 - i * 90, 0.20, 'sawtooth', 0.13, i * 0.22);
    }
  },

  euphoria() {
    // Bright ascending fanfare
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'sine', 0.11, i * 0.06));
  },

  // Notification ping
  notify() {
    tone(880, 0.07, 'sine', 0.07);
  },

  // Soft tick (played each game tick if enabled)
  tick() {
    tone(1400, 0.018, 'sine', 0.025);
  },
};
