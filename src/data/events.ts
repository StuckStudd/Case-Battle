import type { Skin } from '../types/types';
import { hash01 } from './market';

/**
 * Time-limited events. Everything is derived from the local date, so events start and end on their own.
 */

export interface SeasonalEvent {
  id: 'autumn' | 'halloween' | 'winter';
  /** Inclusive [month, day] window; month is 1-based. Windows may wrap over New Year. */
  from: [number, number];
  to: [number, number];
  /** Skins whose name matches go into the event case. */
  theme: RegExp;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  { id: 'autumn', from: [9, 15], to: [10, 15], theme: /autumn|forest|leaf|harvest|amber|copper|rust|wood|orange|bronze|fall/i },
  { id: 'halloween', from: [10, 20], to: [11, 5], theme: /blood|death|crimson|night|dark|ghost|skull|zombie|hell|devil|evil|nightmare|reaper|curse|fear|monster|bone|pumpkin/i },
  { id: 'winter', from: [12, 15], to: [1, 15], theme: /snow|ice|frost|winter|arctic|cold|glacier|polar|christmas|gift|candy|white/i },
];

function dayOfYearKey(month: number, day: number): number {
  return month * 100 + day;
}

export function isSeasonActive(event: SeasonalEvent, now = new Date()): boolean {
  const key = dayOfYearKey(now.getMonth() + 1, now.getDate());
  const from = dayOfYearKey(...event.from);
  const to = dayOfYearKey(...event.to);
  return from <= to ? key >= from && key <= to : key >= from || key <= to;
}

export function activeSeasons(now = new Date()): SeasonalEvent[] {
  return SEASONAL_EVENTS.filter((e) => isSeasonActive(e, now));
}

/** Last day (inclusive) of an event window, as a date in the current or next year. */
export function seasonEnd(event: SeasonalEvent, now = new Date()): Date {
  const [m, d] = event.to;
  const end = new Date(now.getFullYear(), m - 1, d, 23, 59, 59);
  if (end < now) end.setFullYear(end.getFullYear() + 1);
  return end;
}

// ---------------------------------------------------------------- weekend XP

export const WEEKEND_XP_MULTIPLIER = 2;

export function isWeekend(now = new Date()): boolean {
  const day = now.getDay();
  return day === 0 || day === 6;
}

export function xpMultiplier(now = new Date()): number {
  return isWeekend(now) ? WEEKEND_XP_MULTIPLIER : 1;
}

// ---------------------------------------------------------------- flash deal

export const FLASH_DEAL_DISCOUNT = 0.15;

/** Local calendar day number, used to rotate the daily deal and limit it to one purchase. */
export function localDay(now = new Date()): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
}

/** Today's discounted skin: a weapon skin, knife or glove between $50 and $5,000, the same for everyone. */
export function flashDealSkin(pool: readonly Skin[], now = new Date()): Skin | undefined {
  const candidates = pool.filter((s) => s.price >= 50 && s.price <= 5000 && s.rarity !== 'legendary' && !s.wearless && !s.souvenir);
  if (candidates.length === 0) return undefined;
  return candidates[Math.floor(hash01(`flash:${localDay(now)}`) * candidates.length)];
}
