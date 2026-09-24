import { weekOf } from '../data/quests';
import { FRAMES } from '../data/season';
import { SKIN_MAP } from '../data/skinData';
import { STICKER_MAP } from '../data/stickers';
import type {
  AdminLuck,
  AppState,
  CrashRound,
  DailyState,
  GameStat,
  HiloGame,
  LuckState,
  NetWorthPoint,
  HistoryEntry,
  InventoryItem,
  ItemOrigin,
  LedgerEntry,
  LuckScope,
  MatchBet,
  PickemState,
  MinesGame,
  QuestState,
  SeasonState,
  Settings,
  SpecialPattern,
  StickerItem,
  TowersDifficulty,
  TowersGame,
  TradeOffer,
  UpgradeOutcome,
  UserStats,
} from '../types/types';
import {
  HISTORY_LIMIT,
  NET_WORTH_HISTORY_LIMIT,
  NICKNAME_MAX_LENGTH,
  STARTING_BALANCE,
  STORAGE_KEY,
  STORAGE_VERSION,
  TOWERS_FLOORS,
} from '../utils/config';
import { LUCK_SCOPES, MAX_ADMIN_LUCK } from '../utils/adminLuck';
import { roundMoney } from '../utils/format';
import { TOWERS_LAYOUT } from '../utils/gamesEngine';
import { LEDGER_LIMIT } from './ledger';
import { createId } from '../utils/random';
import { EMPTY_LUCK, EMPTY_STATS, createInitialState, finishUpgrade, settleBattle, settleCrash, settleJackpot, settleMatch } from './transitions';

type UnknownRecord = Record<string, unknown>;

export type LoadStatus = 'fresh' | 'loaded' | 'repaired' | 'corrupted' | 'unavailable';

export interface LoadResult {
  state: AppState;
  status: LoadStatus;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nonNegativeMoney(value: unknown, fallback: number): number {
  const n = finiteNumber(value);
  return n !== null && n >= 0 ? roundMoney(n) : fallback;
}

function getStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = '__cs2_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

const ORIGINS: ItemOrigin[] = ['shop', 'upgrade', 'case', 'contract', 'battle', 'trade', 'crash', 'jackpot', 'wheel', 'admin'];
const SPECIALS: SpecialPattern[] = ['ruby', 'sapphire', 'blackPearl', 'blueGem', 'fullFade', 'lowFloat'];

/** Tracks whether any field had to be dropped or fixed while sanitizing. */
interface RepairLog {
  repaired: boolean;
}

function sanitizeInventory(raw: unknown, log: RepairLog): InventoryItem[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) log.repaired = true;
    return [];
  }
  const seen = new Set<string>();
  const items: InventoryItem[] = [];
  for (const entry of raw) {
    // Legacy format: a bare skin id string, or an object keyed by `id` instead of `skinId`.
    const record: UnknownRecord | null =
      typeof entry === 'string' ? { skinId: entry } : isRecord(entry) ? entry : null;
    const skinId = record && typeof record.skinId === 'string' ? record.skinId : record && typeof record.id === 'string' && SKIN_MAP.has(record.id) ? record.id : null;
    if (!record || !skinId || !SKIN_MAP.has(skinId)) {
      log.repaired = true;
      continue;
    }
    let uid = typeof record.uid === 'string' && record.uid ? record.uid : createId('itm');
    if (seen.has(uid)) {
      uid = createId('itm');
      log.repaired = true;
    }
    seen.add(uid);
    const origin: ItemOrigin = ORIGINS.includes(record.origin as ItemOrigin) ? (record.origin as ItemOrigin) : 'shop';
    const item: InventoryItem = { uid, skinId, acquiredAt: finiteNumber(record.acquiredAt) ?? Date.now(), origin };
    const rawStickers = stringArray(record.stickers) ?? [];
    const rawWear = Array.isArray(record.stickerWear) ? record.stickerWear : [];
    const kept = rawStickers.map((id, i) => [id, finiteNumber(rawWear[i]) ?? 0] as const).filter(([id]) => STICKER_MAP.has(id)).slice(0, 4);
    if (kept.length > 0) {
      item.stickers = kept.map(([id]) => id);
      item.stickerWear = kept.map(([, w]) => Math.min(0.75, Math.max(0, w)));
    }
    if (typeof record.nameTag === 'string' && record.nameTag.trim()) item.nameTag = record.nameTag.trim().slice(0, 20);
    const kills = finiteNumber(record.kills);
    if (kills !== null && kills > 0) item.kills = Math.floor(kills);
    if (SPECIALS.includes(record.special as SpecialPattern)) item.special = record.special as SpecialPattern;
    const float = finiteNumber(record.float);
    if (float !== null && float >= 0 && float <= 1) item.float = float;
    items.push(item);
  }
  return items;
}

function sanitizeHistory(raw: unknown, log: RepairLog): HistoryEntry[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) log.repaired = true;
    return [];
  }
  const seen = new Set<string>();
  const entries: HistoryEntry[] = [];
  for (const e of raw) {
    if (!isRecord(e)) {
      log.repaired = true;
      continue;
    }
    const timestamp = finiteNumber(e.timestamp);
    const fromPrice = finiteNumber(e.fromPrice);
    const toPrice = finiteNumber(e.toPrice);
    const chance = finiteNumber(e.chance);
    const profit = finiteNumber(e.profit);
    const valid =
      timestamp !== null &&
      fromPrice !== null &&
      toPrice !== null &&
      chance !== null &&
      profit !== null &&
      (e.result === 'win' || e.result === 'loss') &&
      typeof e.fromName === 'string' &&
      typeof e.toName === 'string';
    if (!valid) {
      log.repaired = true;
      continue;
    }
    let id = typeof e.id === 'string' && e.id ? e.id : createId('upg');
    if (seen.has(id)) id = createId('upg');
    seen.add(id);
    entries.push({
      id,
      timestamp,
      fromSkinId: typeof e.fromSkinId === 'string' ? e.fromSkinId : '',
      fromName: e.fromName as string,
      fromPrice,
      toSkinId: typeof e.toSkinId === 'string' ? e.toSkinId : '',
      toName: e.toName as string,
      toPrice,
      chance,
      roll: finiteNumber(e.roll) ?? 0,
      result: e.result as HistoryEntry['result'],
      profit,
    });
  }
  return entries.slice(0, HISTORY_LIMIT);
}

function statsFromHistory(history: HistoryEntry[]): UserStats {
  const wins = history.filter((h) => h.result === 'win');
  return {
    ...EMPTY_STATS,
    totalUpgrades: history.length,
    wins: wins.length,
    losses: history.length - wins.length,
    totalProfit: roundMoney(history.reduce((sum, h) => sum + h.profit, 0)),
    biggestWin: wins.reduce((max, h) => Math.max(max, h.profit), 0),
  };
}

function sanitizeStats(raw: unknown, history: HistoryEntry[], log: RepairLog): UserStats {
  if (!isRecord(raw)) {
    if (raw !== undefined) log.repaired = true;
    return statsFromHistory(history);
  }
  const count = (key: keyof UserStats) => {
    const n = finiteNumber(raw[key]);
    return n !== null && n >= 0 ? Math.floor(n) : null;
  };
  const totalUpgrades = count('totalUpgrades');
  const wins = count('wins');
  const losses = count('losses');
  const totalProfit = finiteNumber(raw.totalProfit);
  if (totalUpgrades === null || wins === null || losses === null || totalProfit === null || wins + losses !== totalUpgrades) {
    log.repaired = true;
    return statsFromHistory(history);
  }
  return {
    totalUpgrades,
    wins,
    losses,
    totalProfit: roundMoney(totalProfit),
    biggestWin: nonNegativeMoney(raw.biggestWin, 0),
    itemsBought: count('itemsBought') ?? 0,
    totalSpent: nonNegativeMoney(raw.totalSpent, 0),
    itemsSold: count('itemsSold') ?? 0,
    freeCasesOpened: count('freeCasesOpened') ?? 0,
    casesOpened: count('casesOpened') ?? 0,
    contractsCompleted: count('contractsCompleted') ?? 0,
    coinflipsPlayed: count('coinflipsPlayed') ?? 0,
    coinflipsWon: count('coinflipsWon') ?? 0,
    crashPlayed: count('crashPlayed') ?? 0,
    crashBestMultiplier: Math.max(0, finiteNumber(raw.crashBestMultiplier) ?? 0),
    winStreak: count('winStreak') ?? 0,
    bestWinStreak: count('bestWinStreak') ?? 0,
    lowestChanceWin: Math.min(100, Math.max(0, finiteNumber(raw.lowestChanceWin) ?? 100)),
    rareDrops: count('rareDrops') ?? 0,
    totalWagered: nonNegativeMoney(raw.totalWagered, 0),
    crashCashouts2x: count('crashCashouts2x') ?? 0,
    battlesPlayed: count('battlesPlayed') ?? 0,
    battlesWon: count('battlesWon') ?? 0,
    rouletteSpins: count('rouletteSpins') ?? 0,
    minesPlayed: count('minesPlayed') ?? 0,
    plinkoDrops: count('plinkoDrops') ?? 0,
    tradesAccepted: count('tradesAccepted') ?? 0,
    stickersApplied: count('stickersApplied') ?? 0,
    questsCompleted: count('questsCompleted') ?? 0,
    jackpotsPlayed: count('jackpotsPlayed') ?? 0,
    jackpotsWon: count('jackpotsWon') ?? 0,
    collectionsCompleted: count('collectionsCompleted') ?? 0,
  };
}

function sanitizeSettings(raw: unknown): Settings {
  const defaults = createInitialState().settings;
  if (!isRecord(raw)) return defaults;
  return {
    soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : defaults.soundEnabled,
    fastRoulette: typeof raw.fastRoulette === 'boolean' ? raw.fastRoulette : defaults.fastRoulette,
    language: raw.language === 'ru' || raw.language === 'en' ? raw.language : defaults.language,
    theme: raw.theme === 'purple' || raw.theme === 'red' || raw.theme === 'yellow' ? raw.theme : defaults.theme,
    soundPack: raw.soundPack === 'retro' || raw.soundPack === 'soft' || raw.soundPack === 'classic' ? raw.soundPack : defaults.soundPack,
  };
}

function sanitizeStickers(raw: unknown): StickerItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.filter(isRecord).flatMap((s) => {
    if (typeof s.uid !== 'string' || seen.has(s.uid) || typeof s.stickerId !== 'string' || !STICKER_MAP.has(s.stickerId)) return [];
    seen.add(s.uid);
    return [{ uid: s.uid, stickerId: s.stickerId, acquiredAt: finiteNumber(s.acquiredAt) ?? Date.now() }];
  });
}

function sanitizeKeys(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const keys: Record<string, number> = {};
  for (const [id, n] of Object.entries(raw)) {
    const count = finiteNumber(n);
    if (count !== null && count > 0) keys[id] = Math.floor(count);
  }
  return keys;
}

function sanitizeOffers(raw: unknown): TradeOffer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).flatMap((o) => {
    const give = stringArray(o.give);
    const get = stringArray(o.get)?.filter((id) => SKIN_MAP.has(id));
    if (typeof o.id !== 'string' || !give || !get || get.length === 0) return [];
    return [{ id: o.id, give, get, bot: typeof o.bot === 'string' ? o.bot : 'bot' }];
  });
}

function sanitizeQuests(raw: unknown, stats: UserStats): QuestState {
  const day = Math.floor(Date.now() / 86_400_000);
  const fresh: QuestState = { day, week: weekOf(day), dayStart: stats, weekStart: stats, claimed: [] };
  if (!isRecord(raw)) return fresh;
  const d = finiteNumber(raw.day);
  const w = finiteNumber(raw.week);
  const start = (value: unknown): UserStats => (isRecord(value) ? { ...EMPTY_STATS, ...sanitizeStats(value, [], { repaired: false }) } : stats);
  if (d === null || w === null) return fresh;
  return { day: d, week: w, dayStart: start(raw.dayStart), weekStart: start(raw.weekStart), claimed: stringArray(raw.claimed) ?? [] };
}

function sanitizeSeason(raw: unknown, xp: number): SeasonState {
  const id = Math.floor(Date.now() / 86_400_000 / 30);
  if (!isRecord(raw)) return { id, startXp: xp, claimed: [] };
  const sid = finiteNumber(raw.id);
  const startXp = finiteNumber(raw.startXp);
  const claimed = Array.isArray(raw.claimed) ? raw.claimed.filter((n): n is number => typeof n === 'number' && Number.isInteger(n)) : [];
  return { id: sid ?? id, startXp: startXp !== null && startXp >= 0 ? startXp : xp, claimed };
}

function sanitizeMines(raw: unknown): MinesGame | null {
  if (!isRecord(raw)) return null;
  const bet = finiteNumber(raw.bet);
  const mines = Array.isArray(raw.mines) ? raw.mines.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 25) : null;
  const revealed = Array.isArray(raw.revealed) ? raw.revealed.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 25) : null;
  if (typeof raw.id !== 'string' || bet === null || bet <= 0 || !mines || mines.length === 0 || !revealed) return null;
  return { id: raw.id, bet, mines, revealed: revealed.filter((n) => !mines.includes(n)) };
}

const intList = (raw: unknown, max: number): number[] | null =>
  Array.isArray(raw) ? raw.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < max) : null;

function sanitizeTowers(raw: unknown): TowersGame | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  const bet = finiteNumber(raw.bet);
  const difficulty = raw.difficulty as TowersDifficulty;
  if (bet === null || bet <= 0 || !(difficulty in TOWERS_LAYOUT)) return null;
  const { tiles, bombs: count } = TOWERS_LAYOUT[difficulty];
  const bombs = Array.isArray(raw.bombs) ? raw.bombs.map((floor) => intList(floor, tiles)) : [];
  const picks = intList(raw.picks, tiles);
  if (bombs.length !== TOWERS_FLOORS || bombs.some((f) => !f || f.length !== count) || !picks || picks.length >= TOWERS_FLOORS) return null;
  return { id: raw.id, bet, difficulty, bombs: bombs as number[][], picks };
}

function sanitizeHilo(raw: unknown): HiloGame | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  const bet = finiteNumber(raw.bet);
  const index = finiteNumber(raw.index);
  const multiplier = finiteNumber(raw.multiplier);
  const cards = Array.isArray(raw.cards) ? raw.cards.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 13) : [];
  if (bet === null || bet <= 0 || index === null || !Number.isInteger(index) || index < 0 || cards.length < index + 2 || multiplier === null || multiplier < 1) return null;
  return { id: raw.id, bet, cards, index, multiplier };
}

function sanitizeLedger(raw: unknown): LedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LedgerEntry[] = [];
  for (const e of raw.slice(0, LEDGER_LIMIT)) {
    if (!isRecord(e) || typeof e.id !== 'string' || typeof e.action !== 'string') continue;
    const t = finiteNumber(e.t);
    const before = finiteNumber(e.balanceBefore);
    const after = finiteNumber(e.balanceAfter);
    if (t === null || before === null || after === null) continue;
    const keys: Record<string, number> = {};
    if (isRecord(e.keys)) for (const [id, n] of Object.entries(e.keys)) if (typeof n === 'number' && Number.isFinite(n)) keys[id] = n;
    const quiet = { repaired: false };
    out.push({
      id: e.id,
      t,
      action: e.action.slice(0, 60),
      balanceBefore: before,
      balanceAfter: after,
      itemsIn: sanitizeInventory(e.itemsIn, quiet),
      itemsOut: sanitizeInventory(e.itemsOut, quiet),
      stickersIn: sanitizeStickers(e.stickersIn),
      stickersOut: sanitizeStickers(e.stickersOut),
      keys,
      ...(finiteNumber(e.revertedAt) !== null ? { revertedAt: finiteNumber(e.revertedAt)! } : {}),
      ...(typeof e.note === 'string' ? { note: e.note.slice(0, 120) } : {}),
    });
  }
  return out;
}

function sanitizeAdminLuck(raw: unknown): AdminLuck {
  const fallback: AdminLuck = { multiplier: 1, scopes: [...LUCK_SCOPES] };
  if (!isRecord(raw)) return fallback;
  const multiplier = finiteNumber(raw.multiplier);
  const scopes = (stringArray(raw.scopes) ?? []).filter((s): s is LuckScope => (LUCK_SCOPES as string[]).includes(s));
  return { multiplier: multiplier === null ? 1 : Math.min(MAX_ADMIN_LUCK, Math.max(1, multiplier)), scopes };
}

function sanitizeMatch(raw: unknown): MatchBet | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.a !== 'string' || typeof raw.b !== 'string') return null;
  const bet = finiteNumber(raw.bet);
  const odds = finiteNumber(raw.odds);
  const payout = finiteNumber(raw.payout);
  const side = (v: unknown): v is 'a' | 'b' => v === 'a' || v === 'b';
  if (bet === null || odds === null || payout === null || !side(raw.pick) || !side(raw.winner) || !Array.isArray(raw.rounds)) return null;
  return {
    id: raw.id,
    matchId: typeof raw.matchId === 'string' ? raw.matchId : '',
    a: raw.a,
    b: raw.b,
    map: typeof raw.map === 'string' ? raw.map : '',
    pick: raw.pick,
    bet,
    odds,
    winner: raw.winner,
    rounds: raw.rounds.filter(side),
    payout: Math.max(0, payout),
  };
}

function sanitizePickem(raw: unknown): PickemState | null {
  if (!isRecord(raw)) return null;
  const day = finiteNumber(raw.day);
  const picks = stringArray(raw.picks);
  const results = stringArray(raw.results);
  if (day === null || !picks || !results || picks.length !== 7 || results.length !== 7) return null;
  return { day, picks, results, correct: Math.max(0, Math.floor(finiteNumber(raw.correct) ?? 0)), reward: Math.max(0, finiteNumber(raw.reward) ?? 0) };
}

function sanitizeGameStats(raw: unknown): Record<string, GameStat> {
  if (!isRecord(raw)) return {};
  const out: Record<string, GameStat> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const played = finiteNumber(value.played);
    const wagered = finiteNumber(value.wagered);
    const profit = finiteNumber(value.profit);
    if (played === null || wagered === null || profit === null) continue;
    out[id] = { played: Math.max(0, Math.floor(played)), wagered: Math.max(0, wagered), profit };
  }
  return out;
}

function sanitizeDaily(raw: unknown): DailyState {
  if (!isRecord(raw)) return { lastClaimDay: null, streak: 0 };
  const day = finiteNumber(raw.lastClaimDay);
  const streak = finiteNumber(raw.streak);
  return {
    lastClaimDay: day !== null ? Math.floor(day) : null,
    streak: streak !== null && streak >= 0 ? Math.floor(streak) : 0,
  };
}

function sanitizeAchievements(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const result: Record<string, number> = {};
  for (const [id, at] of Object.entries(raw)) {
    const t = finiteNumber(at);
    if (t !== null) result[id] = t;
  }
  return result;
}

function sanitizeNetWorth(raw: unknown): NetWorthPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((p) => ({ t: finiteNumber(p.t), v: finiteNumber(p.v) }))
    .filter((p): p is NetWorthPoint => p.t !== null && p.v !== null && p.v >= 0)
    .slice(-NET_WORTH_HISTORY_LIMIT);
}

function sanitizeCrash(raw: unknown): CrashRound | null {
  if (!isRecord(raw)) return null;
  const bet = finiteNumber(raw.bet);
  const crashPoint = finiteNumber(raw.crashPoint);
  const startedAt = finiteNumber(raw.startedAt);
  if (typeof raw.id !== 'string' || bet === null || bet <= 0 || crashPoint === null || crashPoint < 1 || startedAt === null) {
    return null;
  }
  const auto = finiteNumber(raw.autoCashout);
  const stake = isRecord(raw.skinStake) ? raw.skinStake : null;
  const uids = stake ? stringArray(stake.uids) : null;
  const skinIds = stake ? stringArray(stake.skinIds) : null;
  return {
    id: raw.id,
    bet,
    crashPoint,
    startedAt,
    autoCashout: auto !== null && auto >= 1 ? auto : null,
    skinStake: uids && skinIds ? { uids, skinIds } : null,
  };
}

function sanitizeLuck(raw: unknown): LuckState {
  if (!isRecord(raw)) return { ...EMPTY_LUCK };
  const streak = finiteNumber(raw.lossStreak);
  return {
    lossStreak: streak !== null && streak >= 0 ? Math.floor(streak) : 0,
    lostValue: nonNegativeMoney(raw.lostValue, 0),
  };
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : null;
}

function sanitizeOutcome(raw: unknown): UpgradeOutcome | null {
  if (!isRecord(raw)) return null;
  const sourcePrice = finiteNumber(raw.sourcePrice);
  const targetPrice = finiteNumber(raw.targetPrice);
  const chance = finiteNumber(raw.chance);
  const roll = finiteNumber(raw.roll);
  // Older saves staked exactly one item via sourceUid / sourceSkinId.
  const sourceUids = stringArray(raw.sourceUids) ?? (typeof raw.sourceUid === 'string' ? [raw.sourceUid] : null);
  const sourceSkinIds = stringArray(raw.sourceSkinIds) ?? (typeof raw.sourceSkinId === 'string' ? [raw.sourceSkinId] : null);
  if (
    typeof raw.id !== 'string' ||
    !sourceUids ||
    !sourceSkinIds ||
    typeof raw.targetSkinId !== 'string' ||
    !SKIN_MAP.has(raw.targetSkinId) ||
    sourcePrice === null ||
    targetPrice === null ||
    chance === null ||
    roll === null ||
    (raw.result !== 'win' && raw.result !== 'loss')
  ) {
    return null;
  }
  return {
    id: raw.id,
    sourceUids,
    sourceSkinIds,
    balanceUsed: nonNegativeMoney(raw.balanceUsed, 0),
    targetSkinId: raw.targetSkinId,
    sourcePrice,
    targetPrice,
    chance,
    luckBonus: Math.max(0, finiteNumber(raw.luckBonus) ?? 0),
    roll,
    result: raw.result,
    createdAt: finiteNumber(raw.createdAt) ?? Date.now(),
  };
}

/** Converts any stored shape (current, legacy or partially broken) into a valid AppState. */
export function sanitizeState(raw: unknown): { state: AppState; repaired: boolean } {
  const log: RepairLog = { repaired: false };
  if (!isRecord(raw)) return { state: createInitialState(), repaired: true };

  const version = finiteNumber(raw.storageVersion);
  if (version !== STORAGE_VERSION) log.repaired = version !== null;

  const history = sanitizeHistory(raw.history ?? raw.upgradeHistory, log);
  const balance = nonNegativeMoney(raw.balance, STARTING_BALANCE);
  if (raw.balance !== undefined && balance !== raw.balance) log.repaired = true;

  let state: AppState = {
    storageVersion: STORAGE_VERSION,
    balance,
    inventory: sanitizeInventory(raw.inventory, log),
    history,
    stats: sanitizeStats(raw.stats, history, log),
    luck: sanitizeLuck(raw.luck),
    xp: Math.max(0, Math.floor(finiteNumber(raw.xp) ?? 0)),
    daily: sanitizeDaily(raw.daily),
    achievements: sanitizeAchievements(raw.achievements),
    netWorthHistory: sanitizeNetWorth(raw.netWorthHistory),
    showcase: stringArray(raw.showcase)?.slice(0, 3) ?? [],
    nickname: typeof raw.nickname === 'string' ? raw.nickname.slice(0, NICKNAME_MAX_LENGTH) : '',
    pendingCrash: sanitizeCrash(raw.pendingCrash),
    pendingMines: sanitizeMines(raw.pendingMines),
    pendingJackpot:
      isRecord(raw.pendingJackpot) && typeof raw.pendingJackpot.id === 'string'
        ? { id: raw.pendingJackpot.id, items: sanitizeInventory(raw.pendingJackpot.items, { repaired: false }) }
        : null,
    collectionsClaimed: stringArray(raw.collectionsClaimed) ?? [],
    pendingBattle:
      isRecord(raw.pendingBattle) && typeof raw.pendingBattle.id === 'string'
        ? { id: raw.pendingBattle.id, items: sanitizeInventory(raw.pendingBattle.items, { repaired: false }) }
        : null,
    stickers: sanitizeStickers(raw.stickers),
    keys: sanitizeKeys(raw.keys),
    tradeOffers: sanitizeOffers(raw.tradeOffers),
    quests: sanitizeQuests(raw.quests, sanitizeStats(raw.stats, history, { repaired: false })),
    season: sanitizeSeason(raw.season, Math.max(0, Math.floor(finiteNumber(raw.xp) ?? 0))),
    frames: (stringArray(raw.frames) ?? []).filter((f) => (FRAMES as readonly string[]).includes(f)),
    frame: typeof raw.frame === 'string' && (FRAMES as readonly string[]).includes(raw.frame) ? raw.frame : null,
    settings: sanitizeSettings(raw.settings),
    favorites: Array.isArray(raw.favorites)
      ? [...new Set(raw.favorites.filter((id): id is string => typeof id === 'string' && SKIN_MAP.has(id)))]
      : [],
    isFirstVisit: typeof raw.isFirstVisit === 'boolean' ? raw.isFirstVisit : false,
    onboardingComplete: typeof raw.onboardingComplete === 'boolean' ? raw.onboardingComplete : true,
    pendingUpgrade: sanitizeOutcome(raw.pendingUpgrade),
    pendingTowers: sanitizeTowers(raw.pendingTowers),
    pendingHilo: sanitizeHilo(raw.pendingHilo),
    prestige: Math.max(0, Math.floor(finiteNumber(raw.prestige) ?? 0)),
    wheelLastSpin: Math.max(0, finiteNumber(raw.wheelLastSpin) ?? 0),
    promoClaimed: stringArray(raw.promoClaimed) ?? [],
    gameStats: sanitizeGameStats(raw.gameStats),
    ledger: sanitizeLedger(raw.ledger),
    adminLuck: sanitizeAdminLuck(raw.adminLuck),
    flashDealDay: finiteNumber(raw.flashDealDay),
    pendingMatch: sanitizeMatch(raw.pendingMatch),
    pickem: sanitizePickem(raw.pickem),
  };

  // An upgrade interrupted by a reload is settled with its already-decided result.
  if (state.pendingUpgrade) {
    const settled = finishUpgrade(state);
    if (settled.ok) state = settled.state;
  }
  // A crash round cannot be resumed after a reload: it pays only a reached auto cash-out.
  if (state.pendingCrash) {
    const settled = settleCrash(state);
    if (settled.ok) state = settled.state;
  }
  // A match interrupted by a reload is paid out with its already-decided result.
  state = settleMatch(settleJackpot(settleBattle(state)));
  const owned = new Set(state.inventory.map((i) => i.uid));
  state = { ...state, showcase: state.showcase.filter((u) => owned.has(u)) };

  return { state, repaired: log.repaired };
}

export function loadState(): LoadResult {
  const storage = getStorage();
  if (!storage) return { state: createInitialState(), status: 'unavailable' };

  const rawText = storage.getItem(STORAGE_KEY);
  if (rawText === null) return { state: createInitialState(), status: 'fresh' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { state: { ...createInitialState(), isFirstVisit: false }, status: 'corrupted' };
  }
  if (!isRecord(parsed)) return { state: { ...createInitialState(), isFirstVisit: false }, status: 'corrupted' };

  const { state, repaired } = sanitizeState(parsed);
  return { state, status: repaired ? 'repaired' : 'loaded' };
}

export function saveState(state: AppState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable; the in-memory reset still applies.
  }
}
