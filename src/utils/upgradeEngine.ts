import type { ErrorCode, LuckState, Skin, UpgradeOutcome } from '../types/types';
import { HOUSE_EDGE, LUCK_MAX_BONUS, LUCK_START_STREAK, LUCK_STEP, MAX_CHANCE, MIN_CHANCE } from './config';
import { roundMoney } from './format';
import { createId, secureRandom } from './random';

/** Chance in percent before clamping: (stake / target) * 100 * (1 - edge). */
export function rawChance(stakeValue: number, targetPrice: number): number {
  if (!Number.isFinite(stakeValue) || !Number.isFinite(targetPrice) || stakeValue <= 0 || targetPrice <= 0) {
    return 0;
  }
  return (stakeValue / targetPrice) * 100 * (1 - HOUSE_EDGE);
}

/**
 * Relative chance bonus after a losing streak. It is scaled by how much was lost in the streak
 * compared to the current stake, so losing cheap skins cannot boost an expensive upgrade.
 */
/** Permanent upgrade chance bonus per prestige level, capped so upgrades stay below break-even. */
export const PRESTIGE_CHANCE_STEP = 0.01;
export const PRESTIGE_CHANCE_MAX = 0.04;

export function prestigeBonus(prestige: number): number {
  return Math.min(PRESTIGE_CHANCE_MAX, Math.max(0, prestige) * PRESTIGE_CHANCE_STEP);
}

/** Relative chance bonus: the loss-streak luck bonus plus the prestige bonus. */
export function getLuckBonus(luck: LuckState, stakeValue: number, prestige = 0): number {
  const base = prestigeBonus(prestige);
  if (luck.lossStreak < LUCK_START_STREAK || stakeValue <= 0) return base;
  const streakBonus = Math.min(LUCK_MAX_BONUS, LUCK_STEP * (luck.lossStreak - LUCK_START_STREAK + 1));
  const scale = Math.min(1, luck.lostValue / stakeValue);
  return Math.round((streakBonus * scale + base) * 10000) / 10000;
}

/** Final chance in percent (with the optional luck bonus), clamped and rounded to 2 decimals. */
export function calculateChance(stakeValue: number, targetPrice: number, luckBonus = 0): number {
  const boosted = rawChance(stakeValue, targetPrice) * (1 + luckBonus);
  const clamped = Math.min(MAX_CHANCE, Math.max(MIN_CHANCE, boosted));
  return Math.round(clamped * 100) / 100;
}

export function isTargetEligible(stakeValue: number, targetPrice: number): boolean {
  return targetPrice > stakeValue && rawChance(stakeValue, targetPrice) >= MIN_CHANCE;
}

export function getMultiplier(stakeValue: number, targetPrice: number): number {
  return stakeValue > 0 ? targetPrice / stakeValue : 0;
}

/** Item values (see itemValue) plus the staked balance. */
export interface Stake {
  values: number[];
  balance: number;
}

export function getStakeValue(stake: Stake): number {
  return roundMoney(stake.values.reduce((sum, v) => sum + v, 0) + stake.balance);
}

export type UpgradeValidation =
  | { ok: true; chance: number; multiplier: number; potentialProfit: number; potentialLoss: number }
  | { ok: false; reason: ErrorCode };

/** Thrown by rollUpgrade with a translatable reason. */
export class UpgradeError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode) {
    super(code);
    this.code = code;
  }
}

export function validateUpgrade(stakeValue: number, target: Skin | null | undefined, luckBonus = 0): UpgradeValidation {
  if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
    return { ok: false, reason: 'noStake' };
  }
  if (!target) return { ok: false, reason: 'noTarget' };
  if (!Number.isFinite(target.price) || target.price <= 0) return { ok: false, reason: 'targetInvalid' };
  if (target.price <= stakeValue) return { ok: false, reason: 'targetNotPricier' };
  if (rawChance(stakeValue, target.price) < MIN_CHANCE) return { ok: false, reason: 'chanceTooLow' };
  return {
    ok: true,
    chance: calculateChance(stakeValue, target.price, luckBonus),
    multiplier: getMultiplier(stakeValue, target.price),
    potentialProfit: roundMoney(target.price - stakeValue),
    potentialLoss: stakeValue,
  };
}

interface RollInput {
  sourceUids: string[];
  sourceSkinIds: string[];
  /** Items plus balance. */
  stakeValue: number;
  balanceUsed: number;
  target: Skin;
  luckBonus: number;
}

/** Decides the outcome once, before any animation runs. Throws on an invalid stake. */
export function rollUpgrade(
  { sourceUids, sourceSkinIds, stakeValue, balanceUsed, target, luckBonus }: RollInput,
  now = Date.now(),
): UpgradeOutcome {
  const validation = validateUpgrade(stakeValue, target, luckBonus);
  if (!validation.ok) throw new UpgradeError(validation.reason);
  const roll = secureRandom() * 100;
  return {
    id: createId('upg'),
    sourceUids,
    sourceSkinIds,
    balanceUsed,
    targetSkinId: target.id,
    sourcePrice: stakeValue,
    targetPrice: target.price,
    chance: validation.chance,
    luckBonus,
    roll: Math.round(roll * 10000) / 10000,
    result: roll < validation.chance ? 'win' : 'loss',
    createdAt: now,
  };
}

function closestTarget(catalog: readonly Skin[], stakeValue: number, wantedPrice: number): Skin | undefined {
  let best: Skin | undefined;
  let bestDistance = Infinity;
  for (const skin of catalog) {
    if (!isTargetEligible(stakeValue, skin.price)) continue;
    const distance = Math.abs(Math.log(skin.price / wantedPrice));
    if (distance < bestDistance) {
      best = skin;
      bestDistance = distance;
    }
  }
  return best;
}

/** Eligible skin whose price is closest to stake * multiplier. */
export function findTargetForMultiplier(catalog: readonly Skin[], stakeValue: number, multiplier: number): Skin | undefined {
  return closestTarget(catalog, stakeValue, stakeValue * multiplier);
}

/** Eligible skin whose upgrade chance is closest to the wanted chance. */
export function findTargetForChance(catalog: readonly Skin[], stakeValue: number, chance: number, luckBonus = 0): Skin | undefined {
  return closestTarget(catalog, stakeValue, (stakeValue * 100 * (1 - HOUSE_EDGE) * (1 + luckBonus)) / chance);
}
