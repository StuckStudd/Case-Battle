import type { Exterior, Skin, WeaponCategory } from '../types/types';

export function exteriorFromFloat(float: number): Exterior {
  if (float < 0.07) return 'Factory New';
  if (float < 0.15) return 'Minimal Wear';
  if (float < 0.38) return 'Field-Tested';
  if (float < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

const SHORT: Record<Exterior, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

export function exteriorShort(exterior: Exterior): string {
  return SHORT[exterior];
}

const WEARLESS_TAG: Partial<Record<WeaponCategory, string>> = { agent: 'AGENT', charm: 'CHARM', music: 'MUSIC', knife: 'VANILLA' };

/** Short wear tag for cards: "FN", "MW"… or the item type for items without wear. */
export function wearTag(skin: Skin): string {
  return skin.wearless ? (WEARLESS_TAG[skin.category] ?? '—') : SHORT[skin.exterior];
}
