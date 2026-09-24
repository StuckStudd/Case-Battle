import type { TowersDifficulty } from '../types/types';
import {
  COINFLIP_PAYOUT,
  CRASH_GROWTH,
  CRASH_MAX_MULTIPLIER,
  CRASH_RETURN,
  HILO_MAX_STEPS,
  HILO_STEP_RETURN,
  MINES_GRID,
  MINES_RETURN,
  PLINKO_ROWS,
  TOWERS_FLOORS,
  TOWERS_RETURN,
} from './config';
import { secureRandom } from './random';

// ---------------------------------------------------------------- coinflip

export type CoinSide = 'ct' | 't';

export function flipCoin(): CoinSide {
  return secureRandom() < 0.5 ? 'ct' : 't';
}

export function coinflipPayout(bet: number): number {
  return Math.round(bet * COINFLIP_PAYOUT * 100) / 100;
}

// ---------------------------------------------------------------- crash

/** Crash point with P(crash >= x) = CRASH_RETURN / x, floored to 2 decimals, capped at x900. */
export function generateCrashPoint(): number {
  const u = secureRandom();
  const point = Math.floor((CRASH_RETURN / (1 - u)) * 100) / 100;
  return Math.min(CRASH_MAX_MULTIPLIER, Math.max(1, point));
}

/** Multiplier after `ms` milliseconds of flight. */
export function crashMultiplierAt(ms: number): number {
  return Math.floor(Math.exp((CRASH_GROWTH * Math.max(0, ms)) / 1000) * 100) / 100;
}

/** Milliseconds until the multiplier reaches `multiplier`. */
export function crashTimeFor(multiplier: number): number {
  return (Math.log(multiplier) / CRASH_GROWTH) * 1000;
}

// ---------------------------------------------------------------- roulette

export type RouletteColor = 'red' | 'black' | 'green';

/** 15 slots like CS roulette sites: one green zero, seven red, seven black. */
export const ROULETTE_SLOTS: RouletteColor[] = [
  'green', 'red', 'black', 'red', 'black', 'red', 'black', 'red', 'black', 'red', 'black', 'red', 'black', 'red', 'black',
];

export const ROULETTE_PAYOUT: Record<RouletteColor, number> = { red: 2, black: 2, green: 14 };

export function spinRoulette(): number {
  return Math.floor(secureRandom() * ROULETTE_SLOTS.length);
}

// ---------------------------------------------------------------- towers

export const TOWERS_LAYOUT: Record<TowersDifficulty, { tiles: number; bombs: number }> = {
  easy: { tiles: 4, bombs: 1 },
  medium: { tiles: 3, bombs: 1 },
  hard: { tiles: 2, bombs: 1 },
  expert: { tiles: 3, bombs: 2 },
};

/** Cash-out multiplier after clearing `floors` floors. */
export function towersMultiplier(difficulty: TowersDifficulty, floors: number): number {
  if (floors <= 0) return 1;
  const { tiles, bombs } = TOWERS_LAYOUT[difficulty];
  return Math.floor(TOWERS_RETURN * Math.pow(tiles / (tiles - bombs), floors) * 100) / 100;
}

/** Bomb positions for every floor, decided up front. */
export function placeTowerBombs(difficulty: TowersDifficulty): number[][] {
  const { tiles, bombs } = TOWERS_LAYOUT[difficulty];
  return Array.from({ length: TOWERS_FLOORS }, () => {
    const cells = Array.from({ length: tiles }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(secureRandom() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells.slice(0, bombs).sort((a, b) => a - b);
  });
}

// ---------------------------------------------------------------- hi-lo

export type HiloGuess = 'higher' | 'lower';

/** Chance that the next card is higher-or-equal / lower-or-equal than `card` (1..13, infinite deck). */
export function hiloChance(card: number, guess: HiloGuess): number {
  return guess === 'higher' ? (14 - card) / 13 : card / 13;
}

/** Multiplier a correct guess adds; guesses that always win are not allowed. */
export function hiloStep(card: number, guess: HiloGuess): number {
  const chance = hiloChance(card, guess);
  return chance >= 1 ? 1 : HILO_STEP_RETURN / chance;
}

export function drawHiloCards(): number[] {
  return Array.from({ length: HILO_MAX_STEPS + 1 }, () => 1 + Math.floor(secureRandom() * 13));
}

// ---------------------------------------------------------------- mines

/** Cash-out multiplier after `picks` safe tiles with `mines` mines on the board. */
export function minesMultiplier(mines: number, picks: number): number {
  if (picks <= 0) return 1;
  let m = 1;
  for (let i = 0; i < picks; i++) m *= (MINES_GRID - i) / (MINES_GRID - mines - i);
  return Math.floor(m * MINES_RETURN * 100) / 100;
}

/** Random, distinct mine positions. */
export function placeMines(count: number): number[] {
  const cells = Array.from({ length: MINES_GRID }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, count).sort((a, b) => a - b);
}

// ---------------------------------------------------------------- plinko

export type PlinkoRisk = 'low' | 'medium' | 'high';

/** Bin multipliers for 12 rows (~99% return). */
export const PLINKO_MULTIPLIERS: Record<PlinkoRisk, number[]> = {
  low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
  medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
  high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
};

/** The ball's path (true = bounce right) and the bin it lands in. */
export function dropPlinko(): { path: boolean[]; bin: number } {
  const path = Array.from({ length: PLINKO_ROWS }, () => secureRandom() < 0.5);
  return { path, bin: path.filter(Boolean).length };
}
