import { ACHIEVEMENTS, isAchieved } from '../data/achievements';
import { weekOf } from '../data/quests';
import type { AppState } from '../types/types';
import { NET_WORTH_HISTORY_LIMIT, SEASON_DAYS } from '../utils/config';
import { roundMoney } from '../utils/format';
import { currentDay, getNetWorth, levelFromXp, levelUpReward } from '../utils/progression';

export type ProgressEvent =
  | { type: 'level'; level: number; reward: number }
  | { type: 'achievement'; id: string; reward: number };

/**
 * Runs after every state change: pays level-up and achievement rewards
 * and records a net-worth point for the profile chart.
 */
export function settleProgress(prev: AppState, next: AppState, now = Date.now()): { state: AppState; events: ProgressEvent[] } {
  const events: ProgressEvent[] = [];
  let state = next;

  // New day / week: quest progress restarts from the current stats.
  const day = currentDay(now);
  const week = weekOf(day);
  if (state.quests.day !== day || state.quests.week !== week) {
    const newWeek = state.quests.week !== week;
    state = {
      ...state,
      quests: {
        day,
        week,
        dayStart: state.stats,
        weekStart: newWeek ? state.stats : state.quests.weekStart,
        claimed: state.quests.claimed.filter((key) => key.startsWith('w:') && !newWeek),
      },
    };
  }
  const season = Math.floor(day / SEASON_DAYS);
  if (state.season.id !== season) state = { ...state, season: { id: season, startXp: state.xp, claimed: [] } };

  const fromLevel = levelFromXp(prev.xp);
  const toLevel = levelFromXp(state.xp);
  if (toLevel > fromLevel) {
    // A big wager can skip hundreds of levels: pay them all but announce them as one event.
    let reward = 0;
    for (let level = fromLevel + 1; level <= toLevel; level++) reward += levelUpReward(level);
    state = { ...state, balance: roundMoney(state.balance + reward) };
    events.push({ type: 'level', level: toLevel, reward: roundMoney(reward) });
  }

  // Rewards can unlock money-based achievements, so repeat until nothing new unlocks.
  for (let pass = 0; pass < 3; pass++) {
    const unlocked = ACHIEVEMENTS.filter((def) => !state.achievements[def.id] && isAchieved(def, state));
    if (unlocked.length === 0) break;
    const achievements = { ...state.achievements };
    let balance = state.balance;
    for (const def of unlocked) {
      achievements[def.id] = now;
      balance += def.reward;
      events.push({ type: 'achievement', id: def.id, reward: def.reward });
    }
    state = { ...state, achievements, balance: roundMoney(balance) };
  }

  // Skip snapshots mid-bet: the stake is gone but the result is not in yet.
  if (!state.pendingUpgrade && !state.pendingCrash && !state.pendingMines) {
    const value = getNetWorth(state);
    const last = state.netWorthHistory[state.netWorthHistory.length - 1];
    if (!last || Math.abs(last.v - value) >= 0.01) {
      state = { ...state, netWorthHistory: [...state.netWorthHistory, { t: now, v: value }].slice(-NET_WORTH_HISTORY_LIMIT) };
    }
  }

  return { state, events };
}
