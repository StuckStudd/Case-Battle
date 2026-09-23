import { SKINS } from '../data/skinData';
import type { Rarity, Skin } from '../types/types';
import { secureRandom } from './random';

/** Drop odds per rarity, modelled on real CS2 case odds. */
export const CASE_ODDS: { rarity: Rarity; weight: number }[] = [
  { rarity: 'milspec', weight: 79.92 },
  { rarity: 'restricted', weight: 15.98 },
  { rarity: 'classified', weight: 3.2 },
  { rarity: 'covert', weight: 0.64 },
  { rarity: 'rare', weight: 0.26 },
];

/** Price caps keep the free case generous but not a jackpot machine. */
const MAX_PRICE: Partial<Record<Rarity, number>> = {
  milspec: 5,
  restricted: 12,
  classified: 60,
  covert: 100,
  rare: 200,
};

export const FREE_CASE_POOL: Record<Rarity, Skin[]> = CASE_ODDS.reduce(
  (pool, { rarity }) => {
    pool[rarity] = SKINS.filter((s) => s.rarity === rarity && s.price >= 0.2 && s.price <= (MAX_PRICE[rarity] ?? Infinity));
    return pool;
  },
  {} as Record<Rarity, Skin[]>,
);

export const FREE_CASE_ITEMS: Skin[] = CASE_ODDS.flatMap(({ rarity }) => FREE_CASE_POOL[rarity]);

function pickWeightedRarity(): Rarity {
  const available = CASE_ODDS.filter(({ rarity }) => FREE_CASE_POOL[rarity].length > 0);
  const total = available.reduce((sum, o) => sum + o.weight, 0);
  let roll = secureRandom() * total;
  for (const odds of available) {
    roll -= odds.weight;
    if (roll < 0) return odds.rarity;
  }
  return available[available.length - 1].rarity;
}

/** Picks the dropped skin. The case animation only visualizes this already-decided result. */
export function rollFreeCase(): Skin {
  const pool = FREE_CASE_POOL[pickWeightedRarity()];
  return pool[Math.floor(secureRandom() * pool.length)];
}

/** Random filler skin for the case strip, weighted the same way as real drops. */
export function randomCaseFiller(): Skin {
  return rollFreeCase();
}
