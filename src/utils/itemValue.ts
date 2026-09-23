import { getSkin } from '../data/skinData';
import { getSticker } from '../data/stickers';
import type { InventoryItem, Skin, SpecialPattern } from '../types/types';
import { roundMoney } from './format';
import { secureRandom } from './random';

export const SPECIAL_MULTIPLIER: Record<SpecialPattern, number> = {
  ruby: 5,
  sapphire: 6,
  blackPearl: 3.5,
  blueGem: 8,
  fullFade: 1.5,
  lowFloat: 1.35,
};

/** Market value of an inventory item: skin price × rare pattern multiplier + applied stickers. */
export function itemValue(item: InventoryItem): number {
  const skin = getSkin(item.skinId);
  if (!skin) return 0;
  const base = skin.price * (item.special ? SPECIAL_MULTIPLIER[item.special] : 1);
  const stickers = (item.stickers ?? []).reduce((sum, id) => sum + (getSticker(id)?.price ?? 0), 0);
  return roundMoney(base + stickers);
}

/** True when an item carries extras (stickers or a rare pattern) on top of the plain skin. */
export function hasExtras(item: InventoryItem): boolean {
  return !!item.special || (item.stickers?.length ?? 0) > 0;
}

/** Rolls a rare pattern for a skin obtained by luck. Most drops get none. */
export function rollSpecial(skin: Skin): { special?: SpecialPattern; float?: number } {
  // Legendary items already are the rare pattern.
  if (skin.rarity === 'legendary') return {};
  const r = secureRandom();
  if (skin.finish === 'Doppler') {
    if (r < 0.015) return { special: 'ruby' };
    if (r < 0.03) return { special: 'sapphire' };
    if (r < 0.055) return { special: 'blackPearl' };
  }
  if (skin.finish === 'Case Hardened' && r < 0.015) return { special: 'blueGem' };
  if (skin.finish.includes('Fade') && r < 0.05) return { special: 'fullFade' };
  if (skin.exterior === 'Factory New' && secureRandom() < 0.02) {
    return { special: 'lowFloat', float: Math.round((0.0001 + secureRandom() * 0.0009) * 100000) / 100000 };
  }
  return {};
}
