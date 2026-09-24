import { hash01 } from '../data/market';
import { secureRandom } from './random';

/** Simulated CS teams (fictional), each with a base rating. */
export interface Team {
  id: string;
  name: string;
  tag: string;
  rating: number;
  color: string;
}

export const TEAMS: Team[] = [
  { id: 'ddr', name: 'Dust Dragons', tag: 'DDR', rating: 1790, color: '#f59e0b' },
  { id: 'mrw', name: 'Mirage Wolves', tag: 'MRW', rating: 1760, color: '#60a5fa' },
  { id: 'inf', name: 'Inferno Kings', tag: 'INF', rating: 1740, color: '#ef4444' },
  { id: 'nuk', name: 'Nuke Nation', tag: 'NUK', rating: 1720, color: '#22d3ee' },
  { id: 'vrt', name: 'Vertigo Hawks', tag: 'VRT', rating: 1700, color: '#a78bfa' },
  { id: 'anc', name: 'Ancient Order', tag: 'ANC', rating: 1690, color: '#34d399' },
  { id: 'anb', name: 'Anubis Gods', tag: 'ANB', rating: 1680, color: '#fbbf24' },
  { id: 'ovp', name: 'Overpass Titans', tag: 'OVP', rating: 1660, color: '#94a3b8' },
  { id: 'trn', name: 'Train Rebels', tag: 'TRN', rating: 1640, color: '#fb7185' },
  { id: 'cch', name: 'Cache Ghosts', tag: 'CCH', rating: 1620, color: '#e2e8f0' },
  { id: 'cbl', name: 'Cobble Knights', tag: 'CBL', rating: 1600, color: '#c084fc' },
  { id: 'tsc', name: 'Tuscan Vipers', tag: 'TSC', rating: 1580, color: '#4ade80' },
  { id: 'ofc', name: 'Office Raiders', tag: 'OFC', rating: 1560, color: '#f472b6' },
  { id: 'itl', name: 'Italy Bandits', tag: 'ITL', rating: 1540, color: '#fdba74' },
  { id: 'azt', name: 'Aztec Serpents', tag: 'AZT', rating: 1520, color: '#2dd4bf' },
  { id: 'rat', name: 'Nuke Rats', tag: 'RAT', rating: 1500, color: '#a3a3a3' },
];

export const MAPS = ['Dust II', 'Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Vertigo', 'Train'];
const TEAM_MAP = new Map(TEAMS.map((t) => [t.id, t]));
export const getTeam = (id: string) => TEAM_MAP.get(id);

/** Bookmaker margin: odds pay (1 - margin) / probability. */
export const MATCH_MARGIN = 0.06;
export const MATCH_SLOT_MS = 15 * 60_000;
export const ROUNDS_TO_WIN = 13;

export interface Match {
  id: string;
  a: string;
  b: string;
  map: string;
  /** Win probability of team a, from both ratings plus the day's form. */
  pA: number;
  oddsA: number;
  oddsB: number;
}

const odds = (p: number) => Math.max(1.01, Math.floor(((1 - MATCH_MARGIN) / p) * 100) / 100);

function shuffled<T>(list: T[], seed: string): T[] {
  return list
    .map((item, i) => ({ item, k: hash01(`${seed}:${i}`) }))
    .sort((x, y) => x.k - y.k)
    .map((x) => x.item);
}

/** Current form: a team's rating moves up to ±40 points per slot. */
function formRating(team: Team, key: string): number {
  return team.rating + (hash01(`${team.id}:${key}`) * 2 - 1) * 40;
}

export function winChance(a: Team, b: Team, key: string): number {
  const ra = formRating(a, key);
  const rb = formRating(b, key);
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

export function matchSlot(now = Date.now()): number {
  return Math.floor(now / MATCH_SLOT_MS);
}

/** The 4 matches open for betting in a time slot, the same for everyone. */
export function matchesForSlot(slot: number): Match[] {
  const order = shuffled(TEAMS, `slot:${slot}`);
  return Array.from({ length: 4 }, (_, i) => {
    const a = order[i * 2];
    const b = order[i * 2 + 1];
    const pA = winChance(a, b, `slot:${slot}`);
    return {
      id: `m-${slot}-${i}`,
      a: a.id,
      b: b.id,
      map: MAPS[Math.floor(hash01(`map:${slot}:${i}`) * MAPS.length)],
      pA,
      oddsA: odds(pA),
      oddsB: odds(1 - pA),
    };
  });
}

/**
 * Round-by-round story of a finished match: the winner reaches 13, the loser's score leans lower when the
 * winner was the favourite. Only for the animation; the winner is decided before this is built.
 */
export function roundSequence(winner: 'a' | 'b', winnerChance: number): ('a' | 'b')[] {
  const loser = winner === 'a' ? 'b' : 'a';
  const steepness = 0.6 + winnerChance * 1.6;
  const loserRounds = Math.min(ROUNDS_TO_WIN - 1, Math.floor(Math.pow(secureRandom(), steepness) * ROUNDS_TO_WIN));
  const rounds: ('a' | 'b')[] = [...Array(ROUNDS_TO_WIN - 1).fill(winner), ...Array(loserRounds).fill(loser)];
  for (let i = rounds.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
  }
  return [...rounds, winner];
}

// ---------------------------------------------------------------- pick'em

/** Money for 0..7 correct picks; a perfect bracket also gives an Elite Case key. */
export const PICKEM_REWARDS = [0, 0, 5, 15, 40, 100, 250, 1000];
export const PICKEM_PERFECT_KEY = 'elite';

/** The day's 8-team bracket: quarter-finals are (0,1), (2,3), (4,5), (6,7). */
export function pickemTeams(day: number): string[] {
  return shuffled(TEAMS, `pickem:${day}`)
    .slice(0, 8)
    .map((t) => t.id);
}

/**
 * Picks and results use the same 7 slots: 0–3 quarter-final winners, 4–5 semi-final winners, 6 champion.
 * Returns the teams that meet in a slot given the winners so far.
 */
export function pickemPair(teams: string[], winners: (string | undefined)[], slot: number): [string | undefined, string | undefined] {
  if (slot < 4) return [teams[slot * 2], teams[slot * 2 + 1]];
  if (slot < 6) {
    const base = (slot - 4) * 2;
    return [winners[base], winners[base + 1]];
  }
  return [winners[4], winners[5]];
}

/** Plays the whole bracket, decided with crypto randomness. */
export function playPickem(teams: string[], day: number): string[] {
  const winners: string[] = [];
  for (let slot = 0; slot < 7; slot++) {
    const [a, b] = pickemPair(teams, winners, slot);
    const ta = getTeam(a!)!;
    const tb = getTeam(b!)!;
    winners.push(secureRandom() < winChance(ta, tb, `pickem:${day}`) ? ta.id : tb.id);
  }
  return winners;
}

export function validPicks(teams: string[], picks: string[]): boolean {
  if (picks.length !== 7) return false;
  return picks.every((pick, slot) => pickemPair(teams, picks, slot).includes(pick));
}
