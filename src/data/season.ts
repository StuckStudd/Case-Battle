import { SEASON_TIERS } from '../utils/config';

export type SeasonReward =
  | { type: 'money'; amount: number }
  | { type: 'key'; id: string }
  | { type: 'frame'; id: string };

export const FRAMES = ['bronze', 'silver', 'gold', 'neon', 'fire', 'diamond'] as const;
export type FrameId = (typeof FRAMES)[number];

export const FRAME_STYLES: Record<FrameId, string> = {
  bronze: 'ring-4 ring-orange-700/80',
  silver: 'ring-4 ring-slate-300/80',
  gold: 'ring-4 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.6)]',
  neon: 'ring-4 ring-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.7)]',
  fire: 'ring-4 ring-rose-500 shadow-[0_0_28px_rgba(244,63,94,0.7)]',
  diamond: 'ring-4 ring-sky-200 shadow-[0_0_32px_rgba(186,230,253,0.9)]',
};

const SPECIAL: Record<number, SeasonReward> = {
  3: { type: 'key', id: 'chicken' },
  5: { type: 'frame', id: 'bronze' },
  8: { type: 'key', id: 'kilowatt' },
  10: { type: 'frame', id: 'silver' },
  13: { type: 'key', id: 'community' },
  15: { type: 'key', id: 'dreams' },
  18: { type: 'frame', id: 'gold' },
  20: { type: 'key', id: 'clutch' },
  23: { type: 'frame', id: 'neon' },
  25: { type: 'key', id: 'legends' },
  27: { type: 'frame', id: 'fire' },
  30: { type: 'frame', id: 'diamond' },
};

/** Reward for tier 1..SEASON_TIERS. Tiers without a special reward pay money. */
export function seasonReward(tier: number): SeasonReward {
  return SPECIAL[tier] ?? { type: 'money', amount: Math.round((1 + tier * 0.5) * 100) / 100 };
}

export const SEASON_REWARDS: SeasonReward[] = Array.from({ length: SEASON_TIERS }, (_, i) => seasonReward(i + 1));
