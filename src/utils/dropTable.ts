import { secureRandom } from './random';

interface Priced {
  price: number;
}

export interface DropEntry<T extends Priced> {
  skin: T;
  /** Probability in [0, 1]. */
  chance: number;
}

export interface DropTable<T extends Priced> {
  entries: DropEntry<T>[];
  expectedValue: number;
}

function weightedEv(prices: number[], a: number): number {
  let weightSum = 0;
  let valueSum = 0;
  for (const p of prices) {
    const w = Math.pow(p, -a);
    weightSum += w;
    valueSum += w * p;
  }
  return valueSum / weightSum;
}

/**
 * Weights every item by price^-a and solves `a` so the expected drop value equals `targetEv`.
 * Cheap items stay common and expensive ones rare, while the average return is exact.
 */
export function buildDropTable<T extends Priced>(pool: readonly T[], targetEv: number): DropTable<T> {
  if (pool.length === 0) return { entries: [], expectedValue: 0 };
  const prices = pool.map((s) => s.price);
  let lo = -4;
  let hi = 12;
  let a: number;
  if (targetEv >= weightedEv(prices, lo)) a = lo;
  else if (targetEv <= weightedEv(prices, hi)) a = hi;
  else {
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (weightedEv(prices, mid) > targetEv) lo = mid;
      else hi = mid;
    }
    a = (lo + hi) / 2;
  }

  const weights = prices.map((p) => Math.pow(p, -a));
  const total = weights.reduce((sum, w) => sum + w, 0);
  const entries = pool
    .map((skin, i) => ({ skin, chance: weights[i] / total }))
    .sort((x, y) => y.skin.price - x.skin.price);
  return { entries, expectedValue: weightedEv(prices, a) };
}

export function rollDrop<T extends Priced>(table: DropTable<T>): T {
  let roll = secureRandom();
  for (const entry of table.entries) {
    roll -= entry.chance;
    if (roll < 0) return entry.skin;
  }
  return table.entries[table.entries.length - 1].skin;
}
