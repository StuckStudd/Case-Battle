import type { WeaponCategory } from '../types/types';

// ---------------------------------------------------------------- prestige

/** Net worth needed for the next prestige: $1M, then $2M, $4M, … */
export function prestigeRequirement(prestige: number): number {
  return 1_000_000 * Math.pow(2, Math.max(0, prestige));
}

/** Balance a player restarts with after reaching \`prestige\`. */
export function prestigeStartBalance(prestige: number): number {
  return 100 * (1 + Math.max(0, prestige));
}

/** Daily reward multiplier from prestige: +25% per level. */
export function prestigeDailyMultiplier(prestige: number): number {
  return 1 + 0.25 * Math.max(0, prestige);
}

/** Profile frame unlocked by each prestige level (the last one repeats). */
export const PRESTIGE_FRAMES = ['star', 'cosmic', 'legend'] as const;

export function prestigeFrame(prestige: number): (typeof PRESTIGE_FRAMES)[number] | null {
  return prestige > 0 ? PRESTIGE_FRAMES[Math.min(prestige, PRESTIGE_FRAMES.length) - 1] : null;
}

// ---------------------------------------------------------------- rewards shared by the wheel and promo codes

export type Prize =
  | { kind: 'money'; amount: number }
  | { kind: 'key'; id: string; count: number }
  /** A random skin in a price band, optionally of one category. */
  | { kind: 'skin'; min: number; max: number; category?: WeaponCategory }
  /** A random legendary item. */
  | { kind: 'legend' };

// ---------------------------------------------------------------- fortune wheel

export interface WheelSegment {
  id: string;
  prize: Prize;
  weight: number;
}

/** Free spin every few hours. Segments are drawn equally sized; \`weight\` sets the real odds. */
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'cash5', prize: { kind: 'money', amount: 5 }, weight: 28 },
  { id: 'skinSmall', prize: { kind: 'skin', min: 1, max: 50 }, weight: 16 },
  { id: 'cash25', prize: { kind: 'money', amount: 25 }, weight: 18 },
  { id: 'keyDiamond', prize: { kind: 'key', id: 'gamma', count: 1 }, weight: 3 },
  { id: 'cash100', prize: { kind: 'money', amount: 100 }, weight: 12 },
  { id: 'skinBig', prize: { kind: 'skin', min: 50, max: 1000 }, weight: 6 },
  { id: 'cash500', prize: { kind: 'money', amount: 500 }, weight: 3 },
  { id: 'knife', prize: { kind: 'skin', min: 80, max: 3000, category: 'knife' }, weight: 2.5 },
  { id: 'cash2500', prize: { kind: 'money', amount: 2500 }, weight: 0.5 },
  { id: 'keyKato', prize: { kind: 'key', id: 'katowice2014', count: 1 }, weight: 0.3 },
  { id: 'legend', prize: { kind: 'legend' }, weight: 0.005 },
];

// ---------------------------------------------------------------- promo codes

/** Each code can be redeemed once per save. Codes are case-insensitive. */
export const PROMO_CODES: Record<string, Prize> = {
  WELCOME: { kind: 'money', amount: 100 },
  CASEBATTLE: { kind: 'money', amount: 1000 },
  DIAMOND: { kind: 'key', id: 'gamma', count: 3 },
  STICKERS: { kind: 'key', id: 'community', count: 5 },
  KATOWICE: { kind: 'key', id: 'katowice2014', count: 1 },
  KNIFE: { kind: 'skin', min: 100, max: 1000, category: 'knife' },
  WHALE: { kind: 'key', id: 'whale', count: 1 },
};
