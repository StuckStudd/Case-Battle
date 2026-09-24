import type { AppState, Skin } from '../types/types';
import { prestigeDailyMultiplier } from '../data/extras';
import { DAILY_REWARDS } from './config';
import { roundMoney } from './format';
import { getInventoryValue } from './stats';

/** Total XP required to reach `level` (level 1 needs 0). */
export function xpForLevel(level: number): number {
  return Math.round(60 * Math.pow(Math.max(0, level - 1), 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  current: number;
  needed: number;
  fraction: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return { level, current: xp - start, needed: end - start, fraction: (xp - start) / (end - start) };
}

/** XP for a wager: 5 base plus 2 per dollar risked. */
export function xpForWager(amount: number): number {
  return 5 + Math.round(Math.max(0, amount) * 2);
}

/** Level-up bonuses stop growing here, otherwise high levels would pay back more than was wagered. */
const MAX_LEVEL_REWARD = 20;

/**
 * Money bonus given on reaching a level. A level costs about 45·√level dollars of wagers,
 * so the capped bonus pays back at most ~10% early on and less than 1% for big spenders.
 */
export function levelUpReward(level: number): number {
  return roundMoney(Math.min(level, MAX_LEVEL_REWARD));
}

/** Daily reward multiplier: +10% per level above 1, up to 3x. */
export function dailyMultiplier(level: number): number {
  return Math.min(3, 1 + 0.1 * (level - 1));
}

export function currentDay(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

export interface DailyStatus {
  available: boolean;
  /** Streak day (1..7) the next claim counts as. */
  nextDay: number;
  /** Streak value after the next claim. */
  nextStreak: number;
  reward: number;
}

export function getDailyStatus(state: AppState, now = Date.now()): DailyStatus {
  const today = currentDay(now);
  const { lastClaimDay, streak } = state.daily;
  const available = lastClaimDay !== today;
  const continues = lastClaimDay === today - 1;
  const nextStreak = available ? (continues ? streak + 1 : 1) : streak;
  const nextDay = ((nextStreak - 1) % DAILY_REWARDS.length) + 1;
  const reward = roundMoney(DAILY_REWARDS[nextDay - 1] * dailyMultiplier(levelFromXp(state.xp)) * prestigeDailyMultiplier(state.prestige));
  return { available, nextDay, nextStreak, reward };
}

export function getNetWorth(state: AppState): number {
  return roundMoney(state.balance + getInventoryValue(state.inventory));
}

export function isRareDrop(skin: Skin): boolean {
  return skin.rarity === 'rare' || skin.rarity === 'contraband' || skin.rarity === 'legendary' || skin.rarity === 'mythic';
}
