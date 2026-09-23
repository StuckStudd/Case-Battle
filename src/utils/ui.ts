import type { CSSProperties } from 'react';
import { RARITIES } from '../data/rarities';
import type { Rarity } from '../types/types';

/** Exposes the rarity color as the --rc CSS variable used by the .rarity-* classes. */
export function rarityStyle(rarity: Rarity): CSSProperties {
  return { '--rc': RARITIES[rarity].color } as CSSProperties;
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
