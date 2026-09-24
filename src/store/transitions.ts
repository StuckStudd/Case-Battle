import { getCapsule, getCapsuleTable } from '../data/capsules';
import { getCase, getCaseTable } from '../data/cases';
import { COLLECTIONS, ownedBases } from '../data/collections';
import { dailyQuests, weekOf, weeklyQuests } from '../data/quests';
import { FRAMES, seasonReward } from '../data/season';
import type { SeasonReward } from '../data/season';
import { PROMO_CODES, WHEEL_SEGMENTS, prestigeFrame, prestigeRequirement, prestigeStartBalance } from '../data/extras';
import type { Prize, WheelSegment } from '../data/extras';
import { SKINS, getSkin, isValidSkin, isWeaponSkin } from '../data/skinData';
import { getSticker } from '../data/stickers';
import type {
  AppState,
  CrashRound,
  ErrorCode,
  HiloGame,
  HistoryEntry,
  InventoryItem,
  ItemOrigin,
  LuckState,
  MinesGame,
  Skin,
  StickerItem,
  TowersDifficulty,
  TowersGame,
  UpgradeOutcome,
  UserStats,
} from '../types/types';
import { generateTradeOffers, runBattle, runJackpot, skinForValue } from '../utils/botEngine';
import type { BattleResult, JackpotMode, JackpotResult } from '../utils/botEngine';
import { rollFreeCase } from '../utils/caseEngine';
import {
  FREE_CASE_BALANCE_THRESHOLD,
  HILO_MAX_STEPS,
  HISTORY_LIMIT,
  MAX_STICKERS_PER_ITEM,
  MINES_GRID,
  NICKNAME_MAX_LENGTH,
  SEASON_DAYS,
  SEASON_TIERS,
  SEASON_TIER_XP,
  SELL_RATE,
  STARTING_BALANCE,
  STORAGE_VERSION,
  TOWERS_FLOORS,
  WHEEL_COOLDOWN_MS,
} from '../utils/config';
import { checkContract } from '../utils/contractEngine';
import { rollDrop } from '../utils/dropTable';
import { formatMoney, roundMoney } from '../utils/format';
import {
  PLINKO_MULTIPLIERS,
  ROULETTE_PAYOUT,
  ROULETTE_SLOTS,
  coinflipPayout,
  crashMultiplierAt,
  dropPlinko,
  flipCoin,
  generateCrashPoint,
  minesMultiplier,
  placeMines,
  spinRoulette,
} from '../utils/gamesEngine';
import type { CoinSide, HiloGuess, PlinkoRisk, RouletteColor } from '../utils/gamesEngine';
import { drawHiloCards, hiloChance, hiloStep, placeTowerBombs, towersMultiplier, TOWERS_LAYOUT } from '../utils/gamesEngine';
import { getNetWorth } from '../utils/progression';
import { pickRandom, secureRandom } from '../utils/random';
import { itemValue, rollSpecial } from '../utils/itemValue';
import { currentDay, getDailyStatus, isRareDrop, levelFromXp, xpForWager } from '../utils/progression';
import { createId } from '../utils/random';
import { UpgradeError, getLuckBonus, getStakeValue, rollUpgrade } from '../utils/upgradeEngine';

export type Transition<T> = { ok: true; state: AppState; value: T } | { ok: false; error: ErrorCode };

const fail = (error: ErrorCode): { ok: false; error: ErrorCode } => ({ ok: false, error });

export const EMPTY_STATS: UserStats = {
  totalUpgrades: 0,
  wins: 0,
  losses: 0,
  totalProfit: 0,
  biggestWin: 0,
  itemsBought: 0,
  totalSpent: 0,
  itemsSold: 0,
  freeCasesOpened: 0,
  casesOpened: 0,
  contractsCompleted: 0,
  coinflipsPlayed: 0,
  coinflipsWon: 0,
  crashPlayed: 0,
  crashBestMultiplier: 0,
  winStreak: 0,
  bestWinStreak: 0,
  lowestChanceWin: 100,
  rareDrops: 0,
  totalWagered: 0,
  crashCashouts2x: 0,
  battlesPlayed: 0,
  battlesWon: 0,
  rouletteSpins: 0,
  minesPlayed: 0,
  plinkoDrops: 0,
  tradesAccepted: 0,
  stickersApplied: 0,
  questsCompleted: 0,
  jackpotsPlayed: 0,
  jackpotsWon: 0,
  collectionsCompleted: 0,
};

export const EMPTY_LUCK: LuckState = { lossStreak: 0, lostValue: 0 };

function defaultLanguage(): 'ru' | 'en' {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function createInitialState(now = Date.now()): AppState {
  const day = currentDay(now);
  return {
    storageVersion: STORAGE_VERSION,
    balance: STARTING_BALANCE,
    inventory: [],
    history: [],
    stats: { ...EMPTY_STATS },
    luck: { ...EMPTY_LUCK },
    xp: 0,
    daily: { lastClaimDay: null, streak: 0 },
    achievements: {},
    netWorthHistory: [],
    showcase: [],
    nickname: '',
    pendingCrash: null,
    pendingMines: null,
    pendingBattle: null,
    pendingJackpot: null,
    collectionsClaimed: [],
    stickers: [],
    keys: {},
    tradeOffers: [],
    quests: { day, week: weekOf(day), dayStart: { ...EMPTY_STATS }, weekStart: { ...EMPTY_STATS }, claimed: [] },
    season: { id: Math.floor(day / SEASON_DAYS), startXp: 0, claimed: [] },
    frames: [],
    frame: null,
    settings: { soundEnabled: true, fastRoulette: false, language: defaultLanguage(), theme: 'yellow', soundPack: 'classic' },
    favorites: [],
    isFirstVisit: true,
    onboardingComplete: false,
    pendingUpgrade: null,
    pendingTowers: null,
    pendingHilo: null,
    prestige: 0,
    wheelLastSpin: 0,
    promoClaimed: [],
    gameStats: {},
    ledger: [],
  };
}

// ---------------------------------------------------------------- helpers

function bump(state: AppState, patch: Partial<Record<keyof UserStats, number>>): AppState {
  const stats = { ...state.stats };
  for (const [key, delta] of Object.entries(patch) as [keyof UserStats, number][]) {
    stats[key] = roundMoney(stats[key] + delta);
  }
  return { ...state, stats };
}

/** Adds XP and wager totals for any bet-like action. */
function withWager(state: AppState, amount: number): AppState {
  return bump({ ...state, xp: state.xp + xpForWager(amount) }, { totalWagered: amount });
}

function plainItem(skin: Skin, origin: ItemOrigin, now: number): InventoryItem {
  return { uid: createId('itm'), skinId: skin.id, acquiredAt: now, origin };
}

/** Item obtained by luck: may roll a rare pattern or float. */
function luckyItem(skin: Skin, origin: ItemOrigin, now: number): InventoryItem {
  const extra = rollSpecial(skin);
  return { ...plainItem(skin, origin, now), ...(extra.special ? extra : {}) };
}

/** Adds items to the inventory and counts knives, gloves and contraband as rare drops. */
function addItems(state: AppState, items: InventoryItem[]): AppState {
  const rare = items.filter((i) => {
    const skin = getSkin(i.skinId);
    return !!skin && isRareDrop(skin);
  }).length;
  return bump({ ...state, inventory: [...items, ...state.inventory] }, { rareDrops: rare });
}

function removeItems(state: AppState, uids: Iterable<string>): AppState {
  const gone = new Set(uids);
  return {
    ...state,
    inventory: state.inventory.filter((i) => !gone.has(i.uid)),
    showcase: state.showcase.filter((u) => !gone.has(u)),
    tradeOffers: state.tradeOffers.filter((o) => !o.give.some((u) => gone.has(u))),
  };
}

function validBet(state: AppState, bet: number): ErrorCode | null {
  if (!Number.isFinite(bet) || bet < 0.01) return 'invalidBet';
  if (bet > state.balance) return 'insufficientBalance';
  return null;
}

function busy(state: AppState): boolean {
  return !!state.pendingUpgrade || !!state.pendingCrash || !!state.pendingMines || !!state.pendingTowers || !!state.pendingHilo;
}

// ---------------------------------------------------------------- shop

export function buySkin(state: AppState, skinId: string, now = Date.now()): Transition<InventoryItem> {
  const skin = getSkin(skinId);
  if (!isValidSkin(skin)) return fail('itemUnavailable');
  if (state.balance < skin.price) return fail('insufficientBalance');
  const item = plainItem(skin, 'shop', now);
  return {
    ok: true,
    value: item,
    state: bump(
      { ...state, balance: roundMoney(state.balance - skin.price), inventory: [item, ...state.inventory] },
      { itemsBought: 1, totalSpent: skin.price },
    ),
  };
}

export function sellItem(state: AppState, uid: string): Transition<number> {
  const item = state.inventory.find((i) => i.uid === uid);
  if (!item || !getSkin(item.skinId)) return fail('itemNotFound');
  const payout = roundMoney(itemValue(item) * SELL_RATE);
  return {
    ok: true,
    value: payout,
    state: bump({ ...removeItems(state, [uid]), balance: roundMoney(state.balance + payout) }, { itemsSold: 1 }),
  };
}

// ---------------------------------------------------------------- upgrade

export interface UpgradeRequest {
  sourceUids: string[];
  balanceAmount: number;
  targetSkinId: string;
}

/** Rolls the result and takes the stake right away, so a reload cannot undo a loss. */
export function beginUpgrade(state: AppState, request: UpgradeRequest): Transition<UpgradeOutcome> {
  if (state.pendingUpgrade) return fail('upgradeInProgress');

  const uids = [...new Set(request.sourceUids)];
  const items: InventoryItem[] = [];
  for (const uid of uids) {
    const item = state.inventory.find((i) => i.uid === uid);
    if (!item) return fail('stakeItemMissing');
    if (!isValidSkin(getSkin(item.skinId))) return fail('stakeItemInvalid');
    items.push(item);
  }

  const balanceUsed = roundMoney(request.balanceAmount);
  if (!Number.isFinite(balanceUsed) || balanceUsed < 0) return fail('invalidBalanceAmount');
  if (balanceUsed > state.balance) return fail('insufficientBalance');

  const target = getSkin(request.targetSkinId);
  if (!isValidSkin(target)) return fail('targetInvalid');

  const stakeValue = getStakeValue({ values: items.map(itemValue), balance: balanceUsed });
  let outcome: UpgradeOutcome;
  try {
    outcome = rollUpgrade({
      sourceUids: uids,
      sourceSkinIds: items.map((i) => i.skinId),
      stakeValue,
      balanceUsed,
      target,
      luckBonus: getLuckBonus(state.luck, stakeValue, state.prestige),
    });
  } catch (error) {
    return fail(error instanceof UpgradeError ? error.code : 'targetInvalid');
  }

  return {
    ok: true,
    value: outcome,
    state: withWager(
      { ...removeItems(state, uids), balance: roundMoney(state.balance - balanceUsed), pendingUpgrade: outcome },
      outcome.sourcePrice,
    ),
  };
}

/** Language-neutral stake label, e.g. "AK-47 | Redline (+2) + $5.00". */
export function describeStake(skinIds: string[], balanceUsed: number): string {
  const parts: string[] = [];
  if (skinIds.length > 0) {
    const first = getSkin(skinIds[0])?.name ?? 'Unknown item';
    parts.push(skinIds.length > 1 ? `${first} (+${skinIds.length - 1})` : first);
  }
  if (balanceUsed > 0) parts.push(formatMoney(balanceUsed));
  return parts.join(' + ') || '—';
}

export interface UpgradeResolution {
  entry: HistoryEntry;
  wonItem: InventoryItem | null;
}

/** Applies the pending outcome: adds the target on a win and records history, stats and luck. */
export function finishUpgrade(state: AppState, now = Date.now()): Transition<UpgradeResolution> {
  const outcome = state.pendingUpgrade;
  if (!outcome) return fail('noUpgrade');

  const won = outcome.result === 'win';
  const target = getSkin(outcome.targetSkinId);
  const profit = roundMoney(won ? outcome.targetPrice - outcome.sourcePrice : -outcome.sourcePrice);
  const wonItem = won && target ? luckyItem(target, 'upgrade', now) : null;

  const entry: HistoryEntry = {
    id: outcome.id,
    timestamp: now,
    fromSkinId: outcome.sourceSkinIds[0] ?? '',
    fromName: describeStake(outcome.sourceSkinIds, outcome.balanceUsed),
    fromPrice: outcome.sourcePrice,
    toSkinId: outcome.targetSkinId,
    toName: target?.name ?? 'Unknown item',
    toPrice: outcome.targetPrice,
    chance: outcome.chance,
    roll: outcome.roll,
    result: outcome.result,
    profit,
  };

  const s = state.stats;
  const winStreak = won ? s.winStreak + 1 : 0;
  let next: AppState = {
    ...state,
    history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
    stats: {
      ...s,
      totalUpgrades: s.totalUpgrades + 1,
      wins: s.wins + (won ? 1 : 0),
      losses: s.losses + (won ? 0 : 1),
      totalProfit: roundMoney(s.totalProfit + profit),
      biggestWin: won ? Math.max(s.biggestWin, profit) : s.biggestWin,
      winStreak,
      bestWinStreak: Math.max(s.bestWinStreak, winStreak),
      lowestChanceWin: won ? Math.min(s.lowestChanceWin, outcome.chance) : s.lowestChanceWin,
    },
    // A win resets luck to default; a loss extends the streak.
    luck: won
      ? { ...EMPTY_LUCK }
      : { lossStreak: state.luck.lossStreak + 1, lostValue: roundMoney(state.luck.lostValue + outcome.sourcePrice) },
    pendingUpgrade: null,
  };
  if (wonItem) next = addItems(next, [wonItem]);
  return { ok: true, value: { entry, wonItem }, state: next };
}

// ---------------------------------------------------------------- cases, capsules, stickers

export function isFreeCaseAvailable(state: AppState): boolean {
  return !busy(state) && state.inventory.length === 0 && state.balance < FREE_CASE_BALANCE_THRESHOLD;
}

/** Opens the free case: the drop is decided here and added to the inventory immediately. */
export function openFreeCase(state: AppState, now = Date.now()): Transition<InventoryItem> {
  if (!isFreeCaseAvailable(state)) return fail('freeCaseUnavailable');
  const item = luckyItem(rollFreeCase(), 'case', now);
  return { ok: true, value: item, state: bump(addItems(state, [item]), { freeCasesOpened: 1 }) };
}

/** Pays with a battle-pass key when one is available, otherwise with balance. */
function payForBox(state: AppState, id: string, price: number): Transition<boolean> {
  const keys = state.keys[id] ?? 0;
  if (keys > 0) return { ok: true, value: true, state: { ...state, keys: { ...state.keys, [id]: keys - 1 } } };
  if (state.balance < price) return fail('insufficientBalance');
  return { ok: true, value: false, state: withWager({ ...state, balance: roundMoney(state.balance - price) }, price) };
}

export function openPaidCase(state: AppState, caseId: string, now = Date.now()): Transition<InventoryItem> {
  const def = getCase(caseId);
  if (!def) return fail('caseUnknown');
  const hasKey = (state.keys[caseId] ?? 0) > 0;
  if (!hasKey && levelFromXp(state.xp) < def.minLevel) return fail('caseLocked');
  const paid = payForBox(state, caseId, def.price);
  if (!paid.ok) return paid;
  const item = luckyItem(rollDrop(getCaseTable(def)), 'case', now);
  return { ok: true, value: item, state: bump(addItems(paid.state, [item]), { casesOpened: 1 }) };
}

export function openCapsule(state: AppState, capsuleId: string, now = Date.now()): Transition<StickerItem> {
  const def = getCapsule(capsuleId);
  if (!def) return fail('caseUnknown');
  const paid = payForBox(state, capsuleId, def.price);
  if (!paid.ok) return paid;
  const sticker = rollDrop(getCapsuleTable(def));
  const item: StickerItem = { uid: createId('stk'), stickerId: sticker.id, acquiredAt: now };
  return { ok: true, value: item, state: bump({ ...paid.state, stickers: [item, ...paid.state.stickers] }, { casesOpened: 1 }) };
}

export function applySticker(state: AppState, itemUid: string, stickerUid: string): Transition<null> {
  const item = state.inventory.find((i) => i.uid === itemUid);
  const sticker = state.stickers.find((s) => s.uid === stickerUid);
  if (!item) return fail('itemNotFound');
  if (!sticker || !getSticker(sticker.stickerId)) return fail('stickerMissing');
  if ((item.stickers?.length ?? 0) >= MAX_STICKERS_PER_ITEM) return fail('stickerSlotsFull');
  const updated: InventoryItem = { ...item, stickers: [...(item.stickers ?? []), sticker.stickerId] };
  return {
    ok: true,
    value: null,
    state: bump(
      {
        ...state,
        inventory: state.inventory.map((i) => (i.uid === itemUid ? updated : i)),
        stickers: state.stickers.filter((s) => s.uid !== stickerUid),
      },
      { stickersApplied: 1 },
    ),
  };
}

export function sellSticker(state: AppState, stickerUid: string): Transition<number> {
  const sticker = state.stickers.find((s) => s.uid === stickerUid);
  const def = getSticker(sticker?.stickerId);
  if (!sticker || !def) return fail('stickerMissing');
  const payout = roundMoney(def.price * SELL_RATE);
  return {
    ok: true,
    value: payout,
    state: bump(
      { ...state, balance: roundMoney(state.balance + payout), stickers: state.stickers.filter((s) => s.uid !== stickerUid) },
      { itemsSold: 1 },
    ),
  };
}

// ---------------------------------------------------------------- case battles

export interface BattleOutcome extends BattleResult {
  won: boolean;
  wonItems: InventoryItem[];
  cost: number;
}

export function playBattle(state: AppState, caseId: string, bots: number, rounds: number, now = Date.now()): Transition<BattleOutcome> {
  const def = getCase(caseId);
  if (!def) return fail('caseUnknown');
  if (bots < 1 || bots > 3 || rounds < 1 || rounds > 5) return fail('battleInvalid');
  if (levelFromXp(state.xp) < def.minLevel) return fail('caseLocked');
  const cost = roundMoney(def.price * rounds);
  if (state.balance < cost) return fail('insufficientBalance');

  const result = runBattle(def, bots, rounds);
  const won = result.winner === 0;
  const wonItems = won ? result.players.flatMap((p) => p.drops.map((skin) => luckyItem(skin, 'battle', now))) : [];
  let next = withWager(settleBattle({ ...state, balance: roundMoney(state.balance - cost) }), cost);
  next = bump(next, { battlesPlayed: 1, battlesWon: won ? 1 : 0, casesOpened: rounds });
  // Winnings wait in pendingBattle so the inventory does not reveal the result before the animation.
  if (won) next = { ...next, pendingBattle: { id: createId('battle'), items: wonItems } };
  return { ok: true, value: { ...result, won, wonItems, cost }, state: next };
}

/** Moves held battle winnings into the inventory (after the animation, or on load). */
export function settleBattle(state: AppState): AppState {
  if (!state.pendingBattle) return state;
  return addItems({ ...state, pendingBattle: null }, state.pendingBattle.items);
}

// ---------------------------------------------------------------- jackpot

export interface JackpotOutcome extends JackpotResult {
  won: boolean;
}

/** Deposits skins into a pot with bots. Winnings wait in pendingJackpot until the animation ends. */
export function playJackpot(state: AppState, uids: string[], mode: JackpotMode = 'classic', now = Date.now()): Transition<JackpotOutcome> {
  const unique = [...new Set(uids)];
  if (unique.length === 0) return fail('jackpotEmpty');
  const items: InventoryItem[] = [];
  const skins: Skin[] = [];
  for (const uid of unique) {
    const item = state.inventory.find((i) => i.uid === uid);
    const skin = getSkin(item?.skinId);
    if (!item || !skin) return fail('stakeItemMissing');
    items.push(item);
    skins.push(skin);
  }
  const value = roundMoney(items.reduce((sum, i) => sum + itemValue(i), 0));
  const result = runJackpot(skins, value, mode);
  const won = result.winner === 0;
  let next = bump(withWager(settleJackpot(removeItems(state, unique)), value), { jackpotsPlayed: 1, jackpotsWon: won ? 1 : 0 });
  if (won) {
    const botItems = result.entries.slice(1).flatMap((e) => e.skins.map((skin) => luckyItem(skin, 'jackpot', now)));
    // The player's own deposit comes back as-is (stickers and patterns included).
    next = { ...next, pendingJackpot: { id: createId('jackpot'), items: [...items, ...botItems] } };
  }
  return { ok: true, value: { ...result, won }, state: next };
}

export function settleJackpot(state: AppState): AppState {
  if (!state.pendingJackpot) return state;
  return addItems({ ...state, pendingJackpot: null }, state.pendingJackpot.items);
}

// ---------------------------------------------------------------- collections

export function claimCollection(state: AppState, collectionId: string): Transition<number> {
  const def = COLLECTIONS.find((c) => c.id === collectionId);
  if (!def) return fail('collectionIncomplete');
  if (state.collectionsClaimed.includes(collectionId)) return fail('collectionClaimed');
  if (ownedBases(def, state.inventory).size < def.skins.length) return fail('collectionIncomplete');
  return {
    ok: true,
    value: def.reward,
    state: bump(
      {
        ...state,
        balance: roundMoney(state.balance + def.reward),
        xp: state.xp + def.xp,
        collectionsClaimed: [...state.collectionsClaimed, collectionId],
      },
      { collectionsCompleted: 1 },
    ),
  };
}

// ---------------------------------------------------------------- contracts

export function signContract(state: AppState, uids: string[], now = Date.now()): Transition<InventoryItem> {
  const unique = [...new Set(uids)];
  const skins: Skin[] = [];
  for (const uid of unique) {
    const skin = getSkin(state.inventory.find((i) => i.uid === uid)?.skinId);
    if (!skin) return fail('stakeItemMissing');
    skins.push(skin);
  }
  const check = checkContract(skins);
  if (!check.ok) return fail(check.reason);

  const item = luckyItem(rollDrop(check.table), 'contract', now);
  const next = addItems(withWager(removeItems(state, unique), check.inputValue), [item]);
  return { ok: true, value: item, state: bump(next, { contractsCompleted: 1 }) };
}

// ---------------------------------------------------------------- mini-games

export interface CoinflipResult {
  side: CoinSide;
  won: boolean;
  payout: number;
}

/** Coinflip settles instantly; the animation only reveals the side. */
export function playCoinflip(state: AppState, bet: number, pick: CoinSide): Transition<CoinflipResult> {
  const amount = roundMoney(bet);
  const error = validBet(state, amount);
  if (error) return fail(error);
  const side = flipCoin();
  const won = side === pick;
  const payout = won ? coinflipPayout(amount) : 0;
  return {
    ok: true,
    value: { side, won, payout },
    state: bump(
      { ...withWager(state, amount), balance: roundMoney(state.balance - amount + payout) },
      { coinflipsPlayed: 1, coinflipsWon: won ? 1 : 0 },
    ),
  };
}

export interface RouletteResult {
  slot: number;
  color: RouletteColor;
  payout: number;
}

export function playRoulette(state: AppState, bet: number, color: RouletteColor): Transition<RouletteResult> {
  const amount = roundMoney(bet);
  const error = validBet(state, amount);
  if (error) return fail(error);
  const slot = spinRoulette();
  const landed = ROULETTE_SLOTS[slot];
  const payout = landed === color ? roundMoney(amount * ROULETTE_PAYOUT[color]) : 0;
  return {
    ok: true,
    value: { slot, color: landed, payout },
    state: bump({ ...withWager(state, amount), balance: roundMoney(state.balance - amount + payout) }, { rouletteSpins: 1 }),
  };
}

export interface PlinkoResult {
  path: boolean[];
  bin: number;
  multiplier: number;
  payout: number;
}

export function playPlinko(state: AppState, bet: number, risk: PlinkoRisk): Transition<PlinkoResult> {
  const amount = roundMoney(bet);
  const error = validBet(state, amount);
  if (error) return fail(error);
  const { path, bin } = dropPlinko();
  const multiplier = PLINKO_MULTIPLIERS[risk][bin];
  const payout = roundMoney(amount * multiplier);
  return {
    ok: true,
    value: { path, bin, multiplier, payout },
    state: bump({ ...withWager(state, amount), balance: roundMoney(state.balance - amount + payout) }, { plinkoDrops: 1 }),
  };
}

export function startMines(state: AppState, bet: number, mines: number): Transition<MinesGame> {
  if (state.pendingMines) return fail('minesInProgress');
  if (!Number.isInteger(mines) || mines < 1 || mines > MINES_GRID - 1) return fail('invalidMines');
  const amount = roundMoney(bet);
  const error = validBet(state, amount);
  if (error) return fail(error);
  const game: MinesGame = { id: createId('mines'), bet: amount, mines: placeMines(mines), revealed: [] };
  return {
    ok: true,
    value: game,
    state: bump({ ...withWager(state, amount), balance: roundMoney(state.balance - amount), pendingMines: game }, { minesPlayed: 1 }),
  };
}

export interface MinesReveal {
  hit: boolean;
  multiplier: number;
  payout: number;
  /** Mine positions, revealed only when the game ends. */
  mines: number[] | null;
}

export function revealMine(state: AppState, cell: number): Transition<MinesReveal> {
  const game = state.pendingMines;
  if (!game) return fail('noMines');
  if (!Number.isInteger(cell) || cell < 0 || cell >= MINES_GRID || game.revealed.includes(cell)) return fail('invalidMines');
  if (game.mines.includes(cell)) {
    return { ok: true, value: { hit: true, multiplier: 0, payout: 0, mines: game.mines }, state: { ...state, pendingMines: null } };
  }
  const revealed = [...game.revealed, cell];
  const multiplier = minesMultiplier(game.mines.length, revealed.length);
  // Every safe tile found: cash out automatically.
  if (revealed.length === MINES_GRID - game.mines.length) {
    const payout = roundMoney(game.bet * multiplier);
    return {
      ok: true,
      value: { hit: false, multiplier, payout, mines: game.mines },
      state: { ...state, pendingMines: null, balance: roundMoney(state.balance + payout) },
    };
  }
  return { ok: true, value: { hit: false, multiplier, payout: 0, mines: null }, state: { ...state, pendingMines: { ...game, revealed } } };
}

export function cashOutMines(state: AppState): Transition<{ payout: number; mines: number[] }> {
  const game = state.pendingMines;
  if (!game || game.revealed.length === 0) return fail('noMines');
  const payout = roundMoney(game.bet * minesMultiplier(game.mines.length, game.revealed.length));
  return {
    ok: true,
    value: { payout, mines: game.mines },
    state: { ...state, pendingMines: null, balance: roundMoney(state.balance + payout) },
  };
}

// ---------------------------------------------------------------- crash (money or skins)

export interface CrashStake {
  bet?: number;
  uids?: string[];
}

export function startCrash(state: AppState, stake: CrashStake, autoCashout: number | null, now = Date.now()): Transition<CrashRound> {
  if (state.pendingCrash) return fail('crashInProgress');
  const auto = autoCashout !== null && autoCashout >= 1.01 ? Math.round(autoCashout * 100) / 100 : null;

  if (stake.uids) {
    const uids = [...new Set(stake.uids)];
    if (uids.length === 0) return fail('crashStakeEmpty');
    const items: InventoryItem[] = [];
    for (const uid of uids) {
      const item = state.inventory.find((i) => i.uid === uid);
      if (!item) return fail('stakeItemMissing');
      items.push(item);
    }
    const value = roundMoney(items.reduce((sum, i) => sum + itemValue(i), 0));
    const round: CrashRound = {
      id: createId('crash'),
      bet: value,
      crashPoint: generateCrashPoint(),
      autoCashout: auto,
      startedAt: now,
      skinStake: { uids, skinIds: items.map((i) => i.skinId) },
    };
    return {
      ok: true,
      value: round,
      state: bump({ ...withWager(removeItems(state, uids), value), pendingCrash: round }, { crashPlayed: 1 }),
    };
  }

  const amount = roundMoney(stake.bet ?? 0);
  const error = validBet(state, amount);
  if (error) return fail(error);
  const round: CrashRound = {
    id: createId('crash'),
    bet: amount,
    crashPoint: generateCrashPoint(),
    autoCashout: auto,
    startedAt: now,
    skinStake: null,
  };
  return {
    ok: true,
    value: round,
    state: bump({ ...withWager(state, amount), balance: roundMoney(state.balance - amount), pendingCrash: round }, { crashPlayed: 1 }),
  };
}

export interface CrashPayout {
  payout: number;
  multiplier: number;
  /** Skin granted in skins mode; any remainder is added to the balance as `cash`. */
  item: InventoryItem | null;
  cash: number;
}

function payCrash(state: AppState, round: CrashRound, multiplier: number, now: number): Transition<CrashPayout> {
  const payout = roundMoney(round.bet * multiplier);
  let next: AppState = { ...state, pendingCrash: null };
  let item: InventoryItem | null = null;
  let cash = payout;
  if (round.skinStake) {
    const skin = skinForValue(payout);
    if (skin) {
      item = luckyItem(skin, 'crash', now);
      cash = roundMoney(payout - skin.price);
      next = addItems(next, [item]);
    }
  }
  next = bump({ ...next, balance: roundMoney(next.balance + cash) }, { crashCashouts2x: multiplier >= 2 ? 1 : 0 });
  next = { ...next, stats: { ...next.stats, crashBestMultiplier: Math.max(next.stats.crashBestMultiplier, multiplier) } };
  return { ok: true, value: { payout, multiplier, item, cash }, state: next };
}

/** Cashes out at `multiplier` if the round has actually reached it and has not crashed. */
export function cashOutCrash(state: AppState, multiplier: number, now = Date.now()): Transition<CrashPayout> {
  const round = state.pendingCrash;
  if (!round) return fail('noCrash');
  const reached = crashMultiplierAt(now - round.startedAt);
  const m = Math.round(multiplier * 100) / 100;
  if (m < 1 || m > round.crashPoint || m > reached + 0.01) return fail('cashoutTooLate');
  return payCrash(state, round, m, now);
}

/** Ends a crashed or interrupted round: pays the auto cash-out only if it was below the crash point. */
export function settleCrash(state: AppState, now = Date.now()): Transition<CrashPayout> {
  const round = state.pendingCrash;
  if (!round) return fail('noCrash');
  const auto = round.autoCashout;
  if (auto !== null && auto <= round.crashPoint) return payCrash(state, round, auto, now);
  return { ok: true, value: { payout: 0, multiplier: 0, item: null, cash: 0 }, state: { ...state, pendingCrash: null } };
}

// ---------------------------------------------------------------- trades

export function refreshTrades(state: AppState): AppState {
  return { ...state, tradeOffers: generateTradeOffers(state) };
}

export function acceptTrade(state: AppState, offerId: string, now = Date.now()): Transition<InventoryItem[]> {
  const offer = state.tradeOffers.find((o) => o.id === offerId);
  if (!offer || !offer.give.every((uid) => state.inventory.some((i) => i.uid === uid))) return fail('tradeInvalid');
  const received = offer.get.flatMap((id) => {
    const skin = getSkin(id);
    return skin ? [plainItem(skin, 'trade', now)] : [];
  });
  if (received.length === 0) return fail('tradeInvalid');
  const next = removeItems(state, offer.give);
  return {
    ok: true,
    value: received,
    state: bump(
      { ...next, inventory: [...received, ...next.inventory], tradeOffers: next.tradeOffers.filter((o) => o.id !== offerId) },
      { tradesAccepted: 1 },
    ),
  };
}

export function declineTrade(state: AppState, offerId: string): AppState {
  return { ...state, tradeOffers: state.tradeOffers.filter((o) => o.id !== offerId) };
}

// ---------------------------------------------------------------- quests, battle pass

export type QuestPeriod = 'daily' | 'weekly';

export function questProgress(state: AppState, period: QuestPeriod, stat: keyof UserStats): number {
  const start = period === 'daily' ? state.quests.dayStart : state.quests.weekStart;
  return Math.max(0, roundMoney(state.stats[stat] - start[stat]));
}

export function claimQuest(state: AppState, period: QuestPeriod, questId: string): Transition<number> {
  const list = period === 'daily' ? dailyQuests(state.quests.day) : weeklyQuests(state.quests.week);
  const quest = list.find((q) => q.id === questId);
  const key = `${period === 'daily' ? 'd' : 'w'}:${questId}`;
  if (!quest) return fail('questNotReady');
  if (state.quests.claimed.includes(key)) return fail('questClaimed');
  if (questProgress(state, period, quest.stat) < quest.goal) return fail('questNotReady');
  return {
    ok: true,
    value: quest.reward,
    state: bump(
      {
        ...state,
        balance: roundMoney(state.balance + quest.reward),
        xp: state.xp + quest.xp,
        quests: { ...state.quests, claimed: [...state.quests.claimed, key] },
      },
      { questsCompleted: 1 },
    ),
  };
}

export function seasonTier(state: AppState): number {
  return Math.min(SEASON_TIERS, Math.floor(Math.max(0, state.xp - state.season.startXp) / SEASON_TIER_XP));
}

export function claimTier(state: AppState, tier: number): Transition<SeasonReward> {
  if (!Number.isInteger(tier) || tier < 1 || tier > SEASON_TIERS || tier > seasonTier(state)) return fail('tierLocked');
  if (state.season.claimed.includes(tier)) return fail('tierClaimed');
  const reward = seasonReward(tier);
  let next: AppState = { ...state, season: { ...state.season, claimed: [...state.season.claimed, tier] } };
  if (reward.type === 'money') next = { ...next, balance: roundMoney(next.balance + reward.amount) };
  if (reward.type === 'key') next = { ...next, keys: { ...next.keys, [reward.id]: (next.keys[reward.id] ?? 0) + 1 } };
  if (reward.type === 'frame' && !next.frames.includes(reward.id)) {
    next = { ...next, frames: [...next.frames, reward.id], frame: reward.id };
  }
  return { ok: true, value: reward, state: next };
}

export function setFrame(state: AppState, frame: string | null): AppState {
  if (frame !== null && (!state.frames.includes(frame) || !(FRAMES as readonly string[]).includes(frame))) return state;
  return { ...state, frame };
}

// ---------------------------------------------------------------- daily, profile

export function claimDaily(state: AppState, now = Date.now()): Transition<number> {
  const status = getDailyStatus(state, now);
  if (!status.available) return fail('dailyClaimed');
  return {
    ok: true,
    value: status.reward,
    state: {
      ...state,
      balance: roundMoney(state.balance + status.reward),
      daily: { lastClaimDay: currentDay(now), streak: status.nextStreak },
    },
  };
}

export function setShowcase(state: AppState, uids: string[]): AppState {
  const owned = new Set(state.inventory.map((i) => i.uid));
  return { ...state, showcase: [...new Set(uids)].filter((u) => owned.has(u)).slice(0, 3) };
}

export function setNickname(state: AppState, nickname: string): AppState {
  return { ...state, nickname: nickname.trim().slice(0, NICKNAME_MAX_LENGTH) };
}

export function toggleFavorite(state: AppState, skinId: string): AppState {
  const favorites = state.favorites.includes(skinId)
    ? state.favorites.filter((id) => id !== skinId)
    : [...state.favorites, skinId];
  return { ...state, favorites };
}

// ---------------------------------------------------------------- towers

export function startTowers(state: AppState, bet: number, difficulty: TowersDifficulty): Transition<TowersGame> {
  if (state.pendingTowers) return fail('towersInProgress');
  if (!(difficulty in TOWERS_LAYOUT)) return fail('invalidTowers');
  const amount = roundMoney(bet);
  const error = validBet(state, amount);
  if (error) return fail(error);
  const game: TowersGame = { id: createId('towers'), bet: amount, difficulty, bombs: placeTowerBombs(difficulty), picks: [] };
  return { ok: true, value: game, state: { ...withWager(state, amount), balance: roundMoney(state.balance - amount), pendingTowers: game } };
}

export interface TowersStep {
  hit: boolean;
  multiplier: number;
  payout: number;
  /** Every floor's bombs, revealed only when the game ends. */
  bombs: number[][] | null;
}

export function climbTowers(state: AppState, tile: number): Transition<TowersStep> {
  const game = state.pendingTowers;
  if (!game) return fail('noTowers');
  const floor = game.picks.length;
  if (!Number.isInteger(tile) || tile < 0 || tile >= TOWERS_LAYOUT[game.difficulty].tiles) return fail('invalidTowers');
  if (game.bombs[floor].includes(tile)) {
    return { ok: true, value: { hit: true, multiplier: 0, payout: 0, bombs: game.bombs }, state: { ...state, pendingTowers: null } };
  }
  const picks = [...game.picks, tile];
  const multiplier = towersMultiplier(game.difficulty, picks.length);
  // Reaching the top cashes out automatically.
  if (picks.length === TOWERS_FLOORS) {
    const payout = roundMoney(game.bet * multiplier);
    return { ok: true, value: { hit: false, multiplier, payout, bombs: game.bombs }, state: { ...state, pendingTowers: null, balance: roundMoney(state.balance + payout) } };
  }
  return { ok: true, value: { hit: false, multiplier, payout: 0, bombs: null }, state: { ...state, pendingTowers: { ...game, picks } } };
}

export function cashOutTowers(state: AppState): Transition<{ payout: number; bombs: number[][] }> {
  const game = state.pendingTowers;
  if (!game || game.picks.length === 0) return fail('noTowers');
  const payout = roundMoney(game.bet * towersMultiplier(game.difficulty, game.picks.length));
  return { ok: true, value: { payout, bombs: game.bombs }, state: { ...state, pendingTowers: null, balance: roundMoney(state.balance + payout) } };
}

// ---------------------------------------------------------------- hi-lo

export function startHilo(state: AppState, bet: number): Transition<HiloGame> {
  if (state.pendingHilo) return fail('hiloInProgress');
  const amount = roundMoney(bet);
  const error = validBet(state, amount);
  if (error) return fail(error);
  const game: HiloGame = { id: createId('hilo'), bet: amount, cards: drawHiloCards(), index: 0, multiplier: 1 };
  return { ok: true, value: game, state: { ...withWager(state, amount), balance: roundMoney(state.balance - amount), pendingHilo: game } };
}

export interface HiloStep {
  win: boolean;
  card: number;
  multiplier: number;
  payout: number;
}

export function guessHilo(state: AppState, guess: HiloGuess): Transition<HiloStep> {
  const game = state.pendingHilo;
  if (!game) return fail('noHilo');
  const current = game.cards[game.index];
  if ((guess !== 'higher' && guess !== 'lower') || hiloChance(current, guess) >= 1) return fail('invalidHilo');
  const next = game.cards[game.index + 1];
  const win = guess === 'higher' ? next >= current : next <= current;
  if (!win) return { ok: true, value: { win: false, card: next, multiplier: 0, payout: 0 }, state: { ...state, pendingHilo: null } };
  const multiplier = Math.floor(game.multiplier * hiloStep(current, guess) * 100) / 100;
  const index = game.index + 1;
  // The deck is finite: the last guess cashes out automatically.
  if (index >= HILO_MAX_STEPS) {
    const payout = roundMoney(game.bet * multiplier);
    return { ok: true, value: { win: true, card: next, multiplier, payout }, state: { ...state, pendingHilo: null, balance: roundMoney(state.balance + payout) } };
  }
  return { ok: true, value: { win: true, card: next, multiplier, payout: 0 }, state: { ...state, pendingHilo: { ...game, index, multiplier } } };
}

export function cashOutHilo(state: AppState): Transition<number> {
  const game = state.pendingHilo;
  if (!game || game.index === 0) return fail('noHilo');
  const payout = roundMoney(game.bet * game.multiplier);
  return { ok: true, value: payout, state: { ...state, pendingHilo: null, balance: roundMoney(state.balance + payout) } };
}

// ---------------------------------------------------------------- prizes: fortune wheel and promo codes

export interface PrizeResult {
  prize: Prize;
  /** Item given by skin / legend prizes. */
  item?: InventoryItem;
}

function grantPrize(state: AppState, prize: Prize, now: number): { state: AppState; result: PrizeResult } {
  switch (prize.kind) {
    case 'money':
      return { state: { ...state, balance: roundMoney(state.balance + prize.amount) }, result: { prize } };
    case 'key':
      return { state: { ...state, keys: { ...state.keys, [prize.id]: (state.keys[prize.id] ?? 0) + prize.count } }, result: { prize } };
    case 'skin':
    case 'legend': {
      const pool =
        prize.kind === 'legend'
          ? SKINS.filter((s) => s.rarity === 'legendary' && !s.collection.includes('Prototype'))
          : SKINS.filter((s) => s.price >= prize.min && s.price <= prize.max && !s.souvenir && isWeaponSkin(s) && (!prize.category || s.category === prize.category));
      const item = luckyItem(pickRandom(pool), 'wheel', now);
      return { state: addItems(state, [item]), result: { prize, item } };
    }
  }
}

export function wheelReadyAt(state: AppState): number {
  return state.wheelLastSpin + WHEEL_COOLDOWN_MS;
}

export interface WheelSpin extends PrizeResult {
  segment: WheelSegment;
  index: number;
}

/** Free spin: the segment is drawn here, the wheel animation only shows it. */
export function spinWheel(state: AppState, now = Date.now()): Transition<WheelSpin> {
  if (now < wheelReadyAt(state)) return fail('wheelCooldown');
  const total = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = secureRandom() * total;
  let index = WHEEL_SEGMENTS.findIndex((s) => (roll -= s.weight) < 0);
  if (index < 0) index = WHEEL_SEGMENTS.length - 1;
  const segment = WHEEL_SEGMENTS[index];
  const granted = grantPrize({ ...state, wheelLastSpin: now }, segment.prize, now);
  return { ok: true, value: { ...granted.result, segment, index }, state: granted.state };
}

export function redeemPromo(state: AppState, code: string, now = Date.now()): Transition<PrizeResult> {
  const key = code.trim().toUpperCase();
  const prize = PROMO_CODES[key];
  if (!prize) return fail('promoInvalid');
  if (state.promoClaimed.includes(key)) return fail('promoUsed');
  const granted = grantPrize({ ...state, promoClaimed: [...state.promoClaimed, key] }, prize, now);
  return { ok: true, value: granted.result, state: granted.state };
}

// ---------------------------------------------------------------- prestige

/**
 * Trades everything (balance, items, stickers, keys, level) for a prestige level with permanent bonuses.
 * Achievements, collections, history and statistics are kept.
 */
export function doPrestige(state: AppState, now = Date.now()): Transition<number> {
  if (busy(state) || state.pendingBattle || state.pendingJackpot) return fail('prestigeBusy');
  if (getNetWorth(state) < prestigeRequirement(state.prestige)) return fail('prestigeLocked');
  const prestige = state.prestige + 1;
  const frame = prestigeFrame(prestige);
  return {
    ok: true,
    value: prestige,
    state: {
      ...state,
      prestige,
      balance: prestigeStartBalance(prestige),
      inventory: [],
      stickers: [],
      keys: {},
      tradeOffers: [],
      showcase: [],
      luck: { ...EMPTY_LUCK },
      xp: 0,
      season: { ...state.season, startXp: 0 },
      netWorthHistory: [...state.netWorthHistory, { t: now, v: prestigeStartBalance(prestige) }],
      frames: frame && !state.frames.includes(frame) ? [...state.frames, frame] : state.frames,
      frame: frame ?? state.frame,
    },
  };
}

// ---------------------------------------------------------------- per-game statistics

export type GameId =
  | 'upgrade'
  | 'cases'
  | 'battles'
  | 'contracts'
  | 'capsules'
  | 'crash'
  | 'jackpot'
  | 'duel'
  | 'mega'
  | 'roulette'
  | 'mines'
  | 'plinko'
  | 'coinflip'
  | 'towers'
  | 'hilo';

/** Everything the player owns, including winnings still held for an animation. */
function wealth(state: AppState): number {
  const held = [...(state.pendingJackpot?.items ?? []), ...(state.pendingBattle?.items ?? [])].reduce((sum, i) => sum + itemValue(i), 0);
  return getNetWorth(state) + held;
}

/** Records one game action: `start` counts a new round; profit is the change in everything the player owns. */
export function trackGame(prev: AppState, next: AppState, game: GameId, start: boolean): AppState {
  const wagered = Math.max(0, next.stats.totalWagered - prev.stats.totalWagered);
  const profit = wealth(next) - wealth(prev);
  const current = next.gameStats[game] ?? { played: 0, wagered: 0, profit: 0 };
  return {
    ...next,
    gameStats: {
      ...next.gameStats,
      [game]: {
        played: current.played + (start ? 1 : 0),
        wagered: roundMoney(current.wagered + wagered),
        profit: roundMoney(current.profit + profit),
      },
    },
  };
}
