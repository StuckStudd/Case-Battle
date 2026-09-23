import { getCaseTable } from '../data/cases';
import type { CaseDef } from '../data/cases';
import { SKINS, getSkin } from '../data/skinData';
import type { AppState, Skin, TradeOffer } from '../types/types';
import { TRADE_OFFERS } from './config';
import { rollDrop } from './dropTable';
import { itemValue } from './itemValue';
import { levelFromXp, getNetWorth } from './progression';
import { createId, pickRandom, secureRandom } from './random';

export const BOT_NAMES = [
  's1mple_fan', 'headshot_kid', 'AWPer228', 'zeus_zeus', 'dropkick', 'nOObMaster', 'karambit_lord', 'eco_round',
  'ruslan_07', 'Dimka', 'pro100vlad', 'mirage_only', 'flashbang', 'n1ghtwolf', 'clutch_or_kick', 'sasha_ak',
  'ghost', 'molotov_x', 'retake', 'b1t_better', 'Vanya_CS', 'tapok', 'deagle_god', 'smoke_crossfire', 'ace_hunter',
  'rush_b', 'pixel_nade', 'lucky_Lena', 'm0nesy_wannabe', 'silver4ever', 'ninja_defuse', 'boom_hs', 'Kirill_TTV',
  'dust2_king', 'spray_n_pray', 'bhop_bob', 'awp_or_nothing', 'Max_1v5', 'antieco', 'kn1fe', 'glock_g0d',
  'overpass', 'inferno_banana', 'tec9_hero', 'nuke_rat', 'Olya', 'savings_account', 'yolo_upgrade', 'fade_hunter',
  'ruby_seeker',
];

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- leaderboard

export type LeaderMetric = 'netWorth' | 'biggestWin' | 'level';

export interface LeaderRow {
  name: string;
  isYou: boolean;
  netWorth: number;
  biggestWin: number;
  level: number;
}

const LEAGUE_START_DAY = 20700;

/** High rollers at the top of the league, with their starting net worth. */
const WHALES: [string, number][] = [
  ['glove_lord', 300_000],
  ['souvenir_sam', 650_000],
  ['fade_god', 1_200_000],
  ['blackpearl', 2_500_000],
  ['sapphire_king', 4_000_000],
  ['howl_owner', 6_500_000],
  ['kato14_holo', 10_000_000],
  ['dragon_lore_dad', 16_000_000],
  ['blue_gem_387', 25_000_000],
  ['m0n0p0ly', 40_000_000],
  ['genesis_collector', 75_000_000],
  ['the_house', 150_000_000],
];

/** Simulated rivals: deterministic per bot, growing slowly day by day. */
export function botRows(day: number): LeaderRow[] {
  const days = Math.max(0, day - LEAGUE_START_DAY);
  const whales = WHALES.map(([name, start]) => {
    const growth = 0.002 + hash01(`${name}:growth`) * 0.01;
    const wobble = 1 + (hash01(`${name}:${day}`) - 0.5) * 0.06;
    const netWorth = Math.round(start * (1 + growth * days) * wobble * 100) / 100;
    return {
      name,
      isYou: false,
      netWorth,
      biggestWin: Math.round(netWorth * (0.1 + hash01(`${name}:win`) * 0.3) * 100) / 100,
      level: Math.round(Math.log10(netWorth) * 6 + hash01(`${name}:lvl`) * 8),
    };
  });
  return [...whales, ...BOT_NAMES.map((name) => {
    const base = 40 * Math.pow(10, hash01(`${name}:base`) * 2.7);
    const growth = 0.004 + hash01(`${name}:growth`) * 0.03;
    const wobble = 1 + (hash01(`${name}:${day}`) - 0.5) * 0.1;
    const netWorth = Math.round(base * (1 + growth * days) * wobble * 100) / 100;
    return {
      name,
      isYou: false,
      netWorth,
      biggestWin: Math.round(netWorth * (0.2 + hash01(`${name}:win`) * 0.6) * 100) / 100,
      level: Math.max(1, Math.round(Math.log10(netWorth) * 5 + hash01(`${name}:lvl`) * 6)),
    };
  })];
}

export function leaderboard(state: AppState, metric: LeaderMetric, day: number, nickname: string): LeaderRow[] {
  const you: LeaderRow = {
    name: nickname,
    isYou: true,
    netWorth: getNetWorth(state),
    biggestWin: state.stats.biggestWin,
    level: levelFromXp(state.xp),
  };
  return [...botRows(day), you].sort((a, b) => b[metric] - a[metric]);
}

// ---------------------------------------------------------------- case battles

export interface BattlePlayer {
  name: string;
  isYou: boolean;
  drops: Skin[];
  total: number;
}

export interface BattleResult {
  players: BattlePlayer[];
  winner: number;
}

/** Everyone opens `rounds` cases; the highest total wins every drop. Decided before any animation. */
export function runBattle(def: CaseDef, bots: number, rounds: number): BattleResult {
  const table = getCaseTable(def);
  const names = [...BOT_NAMES].sort(() => secureRandom() - 0.5).slice(0, bots);
  const players: BattlePlayer[] = [{ name: '', isYou: true, drops: [], total: 0 }, ...names.map((name) => ({ name, isYou: false, drops: [], total: 0 }))];
  for (const player of players) {
    for (let r = 0; r < rounds; r++) player.drops.push(rollDrop(table));
    player.total = Math.round(player.drops.reduce((sum, s) => sum + s.price, 0) * 100) / 100;
  }
  const best = Math.max(...players.map((p) => p.total));
  const leaders = players.map((p, i) => (p.total === best ? i : -1)).filter((i) => i >= 0);
  return { players, winner: leaders[Math.floor(secureRandom() * leaders.length)] };
}

// ---------------------------------------------------------------- jackpot

/** Share of the player's ticket weight kept by the house. */
export const JACKPOT_EDGE = 0.05;

export interface JackpotEntry {
  name: string;
  isYou: boolean;
  skins: Skin[];
  value: number;
  /** Win probability in [0, 1]. */
  chance: number;
}

export interface JackpotResult {
  entries: JackpotEntry[];
  winner: number;
  pot: number;
}

export type JackpotMode = 'classic' | 'duel' | 'mega';

/** Bot count and each bot's deposit as a multiple of the player's deposit. */
export const JACKPOT_MODES: Record<JackpotMode, { bots: [number, number]; share: [number, number] }> = {
  classic: { bots: [2, 5], share: [0.3, 2.5] },
  duel: { bots: [1, 1], share: [0.95, 1.1] },
  mega: { bots: [8, 14], share: [0.2, 1.6] },
};

const MAX_BOT_ITEMS = 8;

/** A bot deposit worth about `target`, split over a few skins so even huge pots can be matched. */
function botDeposit(target: number): Skin[] {
  const parts = 1 + Math.floor(secureRandom() * 4);
  const skins: Skin[] = [];
  let left = target;
  while (skins.length < MAX_BOT_ITEMS && left > target * 0.03) {
    const slots = Math.max(1, parts - skins.length);
    let pick = skinNear(Math.max(0.03, (left / slots) * (0.7 + secureRandom() * 0.6)));
    // Top up with one skin close to what is still missing instead of stopping short.
    if (skins.length > 0 && pick.price > left * 1.15) pick = skinNear(left);
    if (skins.length > 0 && pick.price > left * 1.15) break;
    skins.push(pick);
    left -= pick.price;
  }
  return skins;
}

/** Bots join a pot sized to the player's deposit; the winner is drawn by deposited value. Decided before any animation. */
export function runJackpot(yourSkins: Skin[], yourValue: number, mode: JackpotMode = 'classic'): JackpotResult {
  const { bots: [minBots, maxBots], share: [minShare, maxShare] } = JACKPOT_MODES[mode];
  const botCount = minBots + Math.floor(secureRandom() * (maxBots - minBots + 1));
  const names = [...BOT_NAMES].sort(() => secureRandom() - 0.5).slice(0, botCount);
  const bots = names.map((name) => {
    const skins = botDeposit(yourValue * (minShare + secureRandom() * (maxShare - minShare)));
    const value = Math.round(skins.reduce((sum, s) => sum + s.price, 0) * 100) / 100;
    return { name, isYou: false, skins, value, weight: value };
  });
  const players = [{ name: '', isYou: true, skins: yourSkins, value: yourValue, weight: yourValue * (1 - JACKPOT_EDGE) }, ...bots];
  const totalWeight = players.reduce((sum, p) => sum + p.weight, 0);
  let ticket = secureRandom() * totalWeight;
  let winner = players.length - 1;
  for (let i = 0; i < players.length; i++) {
    ticket -= players[i].weight;
    if (ticket < 0) {
      winner = i;
      break;
    }
  }
  return {
    entries: players.map(({ weight, ...p }) => ({ ...p, chance: weight / totalWeight })),
    winner,
    pot: Math.round(players.reduce((sum, p) => sum + p.value, 0) * 100) / 100,
  };
}

// ---------------------------------------------------------------- trades

/** Skin priced closest to `value` (log distance). */
function skinNear(value: number): Skin {
  let best = SKINS[0];
  let bestDistance = Infinity;
  for (const skin of SKINS) {
    const d = Math.abs(Math.log(skin.price / value));
    if (d < bestDistance) {
      best = skin;
      bestDistance = d;
    }
  }
  return best;
}

/** Bot trade offers built from the player's current items; some are good deals, some are traps. */
export function generateTradeOffers(state: AppState): TradeOffer[] {
  if (state.inventory.length === 0) return [];
  const offers: TradeOffer[] = [];
  const used = new Set<string>();
  for (let i = 0; i < TRADE_OFFERS; i++) {
    const available = state.inventory.filter((item) => !used.has(item.uid));
    if (available.length === 0) break;
    const giveCount = Math.min(available.length, 1 + Math.floor(secureRandom() * 2));
    const give = [...available].sort(() => secureRandom() - 0.5).slice(0, giveCount);
    give.forEach((g) => used.add(g.uid));
    const giveValue = give.reduce((sum, item) => sum + itemValue(item), 0);
    // Ratio between 0.75 and 1.2 of what the player gives, slightly below 1 on average.
    const target = giveValue * (0.75 + secureRandom() * 0.45);
    const split = secureRandom() < 0.4 && target > 1;
    const get = split ? [skinNear(target * 0.6).id, skinNear(target * 0.4).id] : [skinNear(target).id];
    offers.push({ id: createId('trade'), give: give.map((g) => g.uid), get, bot: pickRandom(BOT_NAMES) });
  }
  return offers;
}

export function offerValues(state: AppState, offer: TradeOffer): { give: number; get: number } {
  const give = offer.give.reduce((sum, uid) => {
    const item = state.inventory.find((i) => i.uid === uid);
    return sum + (item ? itemValue(item) : 0);
  }, 0);
  const get = offer.get.reduce((sum, id) => sum + (getSkin(id)?.price ?? 0), 0);
  return { give: Math.round(give * 100) / 100, get: Math.round(get * 100) / 100 };
}

// ---------------------------------------------------------------- crash with skins

/** Most valuable skin not exceeding `value`; the remainder is paid to the balance. */
export function skinForValue(value: number): Skin | undefined {
  let best: Skin | undefined;
  for (const skin of SKINS) {
    if (skin.price <= value && (!best || skin.price > best.price)) best = skin;
  }
  return best;
}
