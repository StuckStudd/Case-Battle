import type { SoundPack } from '../types/types';

export type SoundName = 'click' | 'tick' | 'win' | 'lose' | 'buy' | 'rare' | 'coin' | 'crash' | 'cashout' | 'pop' | 'boom';

let pack: SoundPack = 'classic';

/** Retro turns every tone into a square wave; soft uses lower, quieter sine tones. */
export function setSoundPack(next: SoundPack): void {
  pack = next;
}

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!context) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

function adjust(o: ToneOptions): ToneOptions {
  if (pack === 'retro') return { ...o, type: 'square', gain: (o.gain ?? 0.12) * 0.6 };
  if (pack === 'soft') return { ...o, type: 'sine', freq: o.freq * 0.8, slideTo: o.slideTo ? o.slideTo * 0.8 : undefined, gain: (o.gain ?? 0.12) * 0.6 };
  return o;
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
}

function tone(ctx: AudioContext, options: ToneOptions) {
  const { freq, duration, type = 'sine', gain = 0.12, delay = 0, slideTo } = adjust(options);
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Sounds are synthesized with Web Audio, so no audio files are needed. Any failure is silent. */
export function playSound(name: SoundName): void {
  if (typeof window === 'undefined') return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    switch (name) {
      case 'click':
        tone(ctx, { freq: 520, duration: 0.06, type: 'triangle', gain: 0.08 });
        break;
      case 'tick':
        tone(ctx, { freq: 1900, duration: 0.03, type: 'square', gain: 0.025 });
        break;
      case 'buy':
        tone(ctx, { freq: 880, duration: 0.08, type: 'triangle', gain: 0.1 });
        tone(ctx, { freq: 1320, duration: 0.14, type: 'triangle', gain: 0.1, delay: 0.07 });
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
          tone(ctx, { freq, duration: 0.28, type: 'triangle', gain: 0.12, delay: i * 0.09 }),
        );
        break;
      case 'rare':
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((freq, i) =>
          tone(ctx, { freq, duration: 0.45, type: 'triangle', gain: 0.12, delay: i * 0.08 }),
        );
        tone(ctx, { freq: 2093, duration: 0.9, type: 'sine', gain: 0.06, delay: 0.5 });
        break;
      case 'coin':
        tone(ctx, { freq: 1400, duration: 0.05, type: 'square', gain: 0.03 });
        break;
      case 'cashout':
        tone(ctx, { freq: 988, duration: 0.1, type: 'triangle', gain: 0.1 });
        tone(ctx, { freq: 1480, duration: 0.2, type: 'triangle', gain: 0.1, delay: 0.08 });
        break;
      case 'pop':
        tone(ctx, { freq: 700, duration: 0.07, type: 'triangle', gain: 0.07, slideTo: 1200 });
        break;
      case 'boom':
        tone(ctx, { freq: 120, duration: 0.5, type: 'sawtooth', gain: 0.12, slideTo: 30 });
        tone(ctx, { freq: 60, duration: 0.6, type: 'sine', gain: 0.15, slideTo: 25, delay: 0.03 });
        break;
      case 'crash':
        tone(ctx, { freq: 180, duration: 0.6, type: 'sawtooth', gain: 0.08, slideTo: 40 });
        break;
      case 'lose':
        tone(ctx, { freq: 300, duration: 0.45, type: 'sawtooth', gain: 0.07, slideTo: 90 });
        tone(ctx, { freq: 150, duration: 0.5, type: 'sine', gain: 0.12, slideTo: 60, delay: 0.05 });
        break;
    }
  } catch {
    // Audio is optional.
  }
}
