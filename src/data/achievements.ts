import type { AppState } from '../types/types';
import { getSkin } from './skinData';
import { getNetWorth, levelFromXp } from '../utils/progression';

export interface AchievementDef {
  id: string;
  reward: number;
  /** Target value and current progress, for the progress bar. */
  goal: number;
  progress: (state: AppState) => number;
}

const stat = (key: keyof AppState['stats']) => (s: AppState) => s.stats[key];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstUpgrade', reward: 1, goal: 1, progress: stat('totalUpgrades') },
  { id: 'firstWin', reward: 2, goal: 1, progress: stat('wins') },
  { id: 'upgrades50', reward: 10, goal: 50, progress: stat('totalUpgrades') },
  { id: 'streak3', reward: 5, goal: 3, progress: stat('bestWinStreak') },
  { id: 'streak5', reward: 20, goal: 5, progress: stat('bestWinStreak') },
  // Chance goals are inverted so a lower chance means more progress.
  { id: 'lucky5', reward: 15, goal: 1, progress: (s) => (s.stats.lowestChanceWin <= 5 ? 1 : 0) },
  { id: 'lucky1', reward: 50, goal: 1, progress: (s) => (s.stats.lowestChanceWin <= 1 ? 1 : 0) },
  { id: 'firstRare', reward: 25, goal: 1, progress: stat('rareDrops') },
  { id: 'bigWin', reward: 10, goal: 100, progress: stat('biggestWin') },
  { id: 'rich1000', reward: 25, goal: 1000, progress: getNetWorth },
  { id: 'rich10000', reward: 100, goal: 10000, progress: getNetWorth },
  { id: 'rich100k', reward: 1000, goal: 100_000, progress: getNetWorth },
  { id: 'rich1m', reward: 10_000, goal: 1_000_000, progress: getNetWorth },
  { id: 'rich10m', reward: 100_000, goal: 10_000_000, progress: getNetWorth },
  { id: 'rich100m', reward: 1_000_000, goal: 100_000_000, progress: getNetWorth },
  { id: 'rich1b', reward: 10_000_000, goal: 1_000_000_000, progress: getNetWorth },
  { id: 'legend1', reward: 25_000, goal: 1, progress: (s) => s.inventory.filter((i) => getSkin(i.skinId)?.rarity === 'legendary').length },
  { id: 'legend5', reward: 250_000, goal: 5, progress: (s) => new Set(s.inventory.filter((i) => getSkin(i.skinId)?.rarity === 'legendary').map((i) => i.skinId)).size },
  { id: 'legend10', reward: 5_000_000, goal: 10, progress: (s) => new Set(s.inventory.filter((i) => getSkin(i.skinId)?.rarity === 'legendary').map((i) => i.skinId)).size },
  { id: 'cases10', reward: 5, goal: 10, progress: stat('casesOpened') },
  { id: 'contract1', reward: 3, goal: 1, progress: stat('contractsCompleted') },
  { id: 'coinflip10', reward: 3, goal: 10, progress: stat('coinflipsPlayed') },
  { id: 'crash5x', reward: 10, goal: 5, progress: stat('crashBestMultiplier') },
  { id: 'daily7', reward: 15, goal: 7, progress: (s) => s.daily.streak },
  { id: 'level10', reward: 20, goal: 10, progress: (s) => levelFromXp(s.xp) },
  { id: 'collector20', reward: 5, goal: 20, progress: (s) => s.inventory.length },
];

export function isAchieved(def: AchievementDef, state: AppState): boolean {
  return def.progress(state) >= def.goal;
}
