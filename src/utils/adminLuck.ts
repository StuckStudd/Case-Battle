import type { AppState, LuckScope } from '../types/types';
import { secureRandom } from './random';

/**
 * Admin luck multiplier. xN means: upgrade chances are multiplied by N, and everything else is
 * rolled N times keeping the result best for the player (x2.5 = 2 rolls plus a 50% chance of a third).
 * x1 is the normal, fair game.
 */
export const LUCK_SCOPES: LuckScope[] = ['upgrade', 'cases', 'games', 'jackpots'];
export const MAX_ADMIN_LUCK = 100;

export function luckFor(state: AppState, scope: LuckScope): number {
  const { multiplier, scopes } = state.adminLuck;
  return scopes.includes(scope) ? Math.min(MAX_ADMIN_LUCK, Math.max(1, multiplier)) : 1;
}

function rollCount(luck: number): number {
  const whole = Math.floor(luck);
  return whole + (secureRandom() < luck - whole ? 1 : 0);
}

/** Rolls \`roll\` as many times as the luck allows and keeps the highest \`score\`. */
export function bestOf<T>(luck: number, roll: () => T, score: (value: T) => number): T {
  let best = roll();
  if (luck <= 1) return best;
  let bestScore = score(best);
  for (let i = 1; i < rollCount(luck); i++) {
    const next = roll();
    const nextScore = score(next);
    if (nextScore > bestScore) {
      best = next;
      bestScore = nextScore;
    }
  }
  return best;
}

/**
 * For games whose loss is already placed on the board (mines, towers): the player hit a bomb that was there
 * with probability \`hitChance\`. With luck the hit only stands with probability hitChance^(luck-1),
 * which makes the overall chance of hitting hitChance^luck — the same as needing every roll to hit.
 */
export function hitStands(luck: number, hitChance: number): boolean {
  if (luck <= 1) return true;
  return secureRandom() < Math.pow(hitChance, luck - 1);
}
