import type { UserStats } from '../types/types';

export interface QuestDef {
  id: string;
  /** Progress is the growth of this stat since the start of the period. */
  stat: keyof UserStats;
  goal: number;
  reward: number;
  xp: number;
}

export const DAILY_QUESTS: QuestDef[] = [
  { id: 'upgrades3', stat: 'totalUpgrades', goal: 3, reward: 2, xp: 40 },
  { id: 'winUpgrade', stat: 'wins', goal: 1, reward: 2, xp: 40 },
  { id: 'cases2', stat: 'casesOpened', goal: 2, reward: 1.5, xp: 30 },
  { id: 'crash2x', stat: 'crashCashouts2x', goal: 1, reward: 2, xp: 40 },
  { id: 'coinflip3', stat: 'coinflipsPlayed', goal: 3, reward: 1, xp: 25 },
  { id: 'roulette5', stat: 'rouletteSpins', goal: 5, reward: 1, xp: 25 },
  { id: 'mines2', stat: 'minesPlayed', goal: 2, reward: 1, xp: 25 },
  { id: 'plinko10', stat: 'plinkoDrops', goal: 10, reward: 1, xp: 25 },
  { id: 'wager20', stat: 'totalWagered', goal: 20, reward: 2, xp: 40 },
  { id: 'battle1', stat: 'battlesPlayed', goal: 1, reward: 2, xp: 40 },
];

export const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'upgrades25', stat: 'totalUpgrades', goal: 25, reward: 15, xp: 250 },
  { id: 'cases15', stat: 'casesOpened', goal: 15, reward: 10, xp: 200 },
  { id: 'contracts3', stat: 'contractsCompleted', goal: 3, reward: 10, xp: 200 },
  { id: 'battlesWon3', stat: 'battlesWon', goal: 3, reward: 15, xp: 250 },
  { id: 'wager250', stat: 'totalWagered', goal: 250, reward: 20, xp: 300 },
  { id: 'stickers3', stat: 'stickersApplied', goal: 3, reward: 8, xp: 150 },
  { id: 'trades2', stat: 'tradesAccepted', goal: 2, reward: 8, xp: 150 },
];

export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 2;

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pick of `count` quests for a period. */
function pick(pool: QuestDef[], count: number, seed: string): QuestDef[] {
  return [...pool].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`)).slice(0, count);
}

export function dailyQuests(day: number): QuestDef[] {
  return pick(DAILY_QUESTS, DAILY_COUNT, `d${day}`);
}

export function weeklyQuests(week: number): QuestDef[] {
  return pick(WEEKLY_QUESTS, WEEKLY_COUNT, `w${week}`);
}

export function weekOf(day: number): number {
  // Day 0 (1970-01-01) was a Thursday; +3 makes weeks start on Monday.
  return Math.floor((day + 3) / 7);
}
