import type { WeaponCategory } from '../types/types';

/**
 * Simulated live market. Every price is catalog price × a factor that moves every hour:
 * a daily wave, a weekly wave and hourly noise per skin, plus one market event per day.
 * Everything is a pure function of (skin, hour), so every visitor sees the same market.
 */
export const HOUR_MS = 3_600_000;
const DAY_HOURS = 24;

export function currentHour(now = Date.now()): number {
  return Math.floor(now / HOUR_MS);
}

/** Hour the page was loaded; prices shown in this session belong to it. */
export const MARKET_HOUR = currentHour();

export function hash01(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Final avalanche so neighbouring inputs ("id:100" vs "id:101") get unrelated values.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface MarketTarget {
  id: string;
  category: WeaponCategory;
  weapon: string;
  collection: string;
}

export type MarketEventId = 'calm' | 'knifeRally' | 'gloveBoom' | 'awpHype' | 'rifleRally' | 'crash' | 'discontinued' | 'agentHype';

export interface MarketEvent {
  id: MarketEventId;
  /** Collection affected by 'discontinued'. */
  collection?: string;
  multiplier: number;
}

/** Collections that can be "discontinued" (they have enough skins to matter). */
let eventCollections: string[] = [];
export function setEventCollections(list: string[]): void {
  eventCollections = list;
}

const EVENTS: { id: MarketEventId; weight: number; multiplier: number }[] = [
  { id: 'calm', weight: 3, multiplier: 1 },
  { id: 'knifeRally', weight: 1, multiplier: 1.2 },
  { id: 'gloveBoom', weight: 1, multiplier: 1.25 },
  { id: 'awpHype', weight: 1, multiplier: 1.15 },
  { id: 'rifleRally', weight: 1, multiplier: 1.12 },
  { id: 'crash', weight: 1, multiplier: 0.88 },
  { id: 'discontinued', weight: 1, multiplier: 1.35 },
  { id: 'agentHype', weight: 1, multiplier: 1.3 },
];

/** The market event of a given day (days count from the Unix epoch). */
export function marketEvent(day: number): MarketEvent {
  const total = EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = hash01(`event:${day}`) * total;
  const event = EVENTS.find((e) => (roll -= e.weight) < 0) ?? EVENTS[0];
  if (event.id === 'discontinued') {
    const collection = eventCollections[Math.floor(hash01(`event-col:${day}`) * eventCollections.length)];
    return collection ? { id: event.id, collection, multiplier: event.multiplier } : { id: 'calm', multiplier: 1 };
  }
  return { id: event.id, multiplier: event.multiplier };
}

function eventApplies(event: MarketEvent, target: MarketTarget): boolean {
  switch (event.id) {
    case 'knifeRally':
      return target.category === 'knife';
    case 'gloveBoom':
      return target.category === 'gloves';
    case 'awpHype':
      return target.weapon === 'AWP';
    case 'rifleRally':
      return target.category === 'rifle';
    case 'agentHype':
      return target.category === 'agent';
    case 'discontinued':
      return target.collection === event.collection;
    case 'crash':
      return true;
    default:
      return false;
  }
}

/** Price multiplier of a skin at a given hour. Stays within roughly 0.8–1.5 of the catalog price. */
export function marketFactor(target: MarketTarget, hour: number): number {
  const phaseDay = hash01(`${target.id}:pd`);
  const phaseWeek = hash01(`${target.id}:pw`);
  const amplitude = 0.03 + hash01(`${target.id}:amp`) * 0.05;
  const daily = amplitude * Math.sin(2 * Math.PI * (hour / DAY_HOURS + phaseDay));
  const weekly = 0.05 * Math.sin(2 * Math.PI * (hour / (DAY_HOURS * 7) + phaseWeek));
  const noise = 0.02 * (hash01(`${target.id}:${hour}`) * 2 - 1);
  const event = marketEvent(Math.floor(hour / DAY_HOURS));
  const boost = eventApplies(event, target) ? event.multiplier : 1;
  return (1 + daily + weekly + noise) * boost;
}

/** Hourly factors for the last `hours` hours up to `hour` (oldest first), for price charts. */
export function factorHistory(target: MarketTarget, hour: number, hours = DAY_HOURS * 7): number[] {
  return Array.from({ length: hours }, (_, i) => marketFactor(target, hour - hours + 1 + i));
}
