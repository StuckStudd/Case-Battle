import type { Skin } from '../types/types';
import { launchConfetti } from './confetti';
import { isRareDrop } from './progression';
import { playSound } from './sound';
import { prefersReducedMotion } from './ui';

/** A drop worth a special celebration: knives, gloves, contraband or anything from $500. */
export function isJackpot(skin: Skin): boolean {
  return isRareDrop(skin) || skin.price >= 500;
}

function goldFlash(): void {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = 'rare-flash';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), prefersReducedMotion() ? 600 : 1800);
}

/** Celebrates a won skin: regular confetti, or a golden flash and sound for rare drops. */
export function celebrate(skin: Skin, soundEnabled: boolean): void {
  if (isJackpot(skin)) {
    goldFlash();
    launchConfetti(3400, 'gold');
    if (soundEnabled) playSound('rare');
  } else {
    launchConfetti();
    if (soundEnabled) playSound('win');
  }
}
