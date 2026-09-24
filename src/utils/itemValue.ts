import { getFloatRange, getSkin } from '../data/skinData';
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
  // Scraped stickers are worth less: full price when new, a quarter at the last scrape.
  const stickers = (item.stickers ?? []).reduce((sum, id, i) => sum + (getSticker(id)?.price ?? 0) * (1 - (item.stickerWear?.[i] ?? 0)), 0);
  return roundMoney(base + stickers);
}

function hash01(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const WEAR_BOUNDS: Record<Skin['exterior'], [number, number]> = {
  'Factory New': [0, 0.07],
  'Minimal Wear': [0.07, 0.15],
  'Field-Tested': [0.15, 0.38],
  'Well-Worn': [0.38, 0.45],
  'Battle-Scarred': [0.45, 1],
};

/** The exact float of this copy: a stored one, or a stable value inside its wear and the skin's float range. */
export function itemFloat(item: InventoryItem, skin: Skin): number {
  if (item.float !== undefined) return item.float;
  if (skin.wearless) return 0;
  const [min, max] = getFloatRange(skin.baseId);
  const [lo, hi] = WEAR_BOUNDS[skin.exterior];
  const from = Math.max(lo, min);
  const to = Math.min(hi, max);
  if (!(to > from)) return skin.float;
  return Math.round((from + hash01(`${item.uid}:float`) * (to - from)) * 1e6) / 1e6;
}

/** Paint seed (pattern index 0–999) of this copy. */
export function itemPattern(item: InventoryItem): number {
  return Math.floor(hash01(`${item.uid}:seed`) * 1000);
}

/** True when an item carries extras (stickers or a rare pattern) on top of the plain skin. */
export function hasExtras(item: InventoryItem): boolean {
  return !!item.special || (item.stickers?.length ?? 0) > 0;
}

/** Rolls a rare pattern for a skin obtained by luck. Most drops get none. */
export function rollSpecial(skin: Skin): { special?: SpecialPattern; float?: number } {
  // Legendary items already are the rare pattern.
  if (skin.rarity === 'legendary' || skin.rarity === 'mythic' || skin.wearless) return {};
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
