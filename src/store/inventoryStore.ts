import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SeasonReward } from '../data/season';
import type {
  AppState,
  CrashRound,
  ErrorCode,
  InventoryItem,
  MinesGame,
  Settings,
  StickerItem,
  UpgradeOutcome,
} from '../types/types';
import type { CoinSide, PlinkoRisk, RouletteColor } from '../utils/gamesEngine';
import { giveItems, giveKeys, grantMoney, removeItem, resetCooldowns, setBalance, setLuck } from './admin';
import { appendLedger, diffLedger, revertEntry, revertSince } from './ledger';
import type { RevertResult } from './ledger';
import { settleProgress } from './progress';
import type { ProgressEvent } from './progress';
import { clearStoredState, loadState, sanitizeState, saveState } from './storage';
import type { LoadStatus } from './storage';
import {
  acceptTrade as acceptTradeTransition,
  applySticker as applyStickerTransition,
  beginUpgrade,
  buySkin,
  cashOutCrash,
  cashOutMines as cashOutMinesTransition,
  claimDaily,
  claimQuest as claimQuestTransition,
  claimTier as claimTierTransition,
  createInitialState,
  declineTrade as declineTradeTransition,
  finishUpgrade,
  isFreeCaseAvailable,
  openCapsule as openCapsuleTransition,
  openFreeCase,
  openPaidCase,
  playBattle,
  playCoinflip,
  playPlinko,
  playRoulette,
  refreshTrades as refreshTradesTransition,
  revealMine as revealMineTransition,
  sellItem,
  sellSticker as sellStickerTransition,
  setFrame as setFrameTransition,
  setNickname as setNicknameTransition,
  setShowcase as setShowcaseTransition,
  claimCollection as claimCollectionTransition,
  playJackpot,
  settleBattle,
  settleCrash,
  settleJackpot,
  signContract,
  startCrash as startCrashTransition,
  startMines as startMinesTransition,
  toggleFavorite as toggleFavoriteTransition,
  startTowers as startTowersTransition,
  climbTowers as climbTowersTransition,
  cashOutTowers as cashOutTowersTransition,
  startHilo as startHiloTransition,
  guessHilo as guessHiloTransition,
  cashOutHilo as cashOutHiloTransition,
  spinWheel as spinWheelTransition,
  redeemPromo as redeemPromoTransition,
  doPrestige,
  trackGame,
} from './transitions';
import type {
  GameId,
  HiloStep,
  PrizeResult,
  TowersStep,
  WheelSpin,
  BattleOutcome,
  CoinflipResult,
  JackpotOutcome,
  CrashPayout,
  CrashStake,
  MinesReveal,
  PlinkoResult,
  QuestPeriod,
  RouletteResult,
  Transition,
  UpgradeRequest,
  UpgradeResolution,
} from './transitions';
import type { JackpotMode } from '../utils/botEngine';
import type { HiloGuess } from '../utils/gamesEngine';
import type { HiloGame, LuckScope, TowersDifficulty, TowersGame } from '../types/types';

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ErrorCode };

export interface StoreValue {
  state: AppState;
  loadStatus: LoadStatus;
  persistenceAvailable: boolean;
  /** Level-ups and achievements not yet shown to the player. */
  progressEvents: ProgressEvent[];
  clearProgressEvents: () => void;
  freeCaseAvailable: boolean;
  /** Winnings not shown yet because their animation is still running. */
  balanceHold: number;
  holdBalance: (amount: number) => void;
  releaseBalance: (amount: number) => void;
  finishBattle: () => void;
  jackpot: (uids: string[], mode?: JackpotMode) => ActionResult<JackpotOutcome>;
  finishJackpot: () => void;
  claimCollection: (collectionId: string) => ActionResult<number>;
  buy: (skinId: string) => ActionResult<InventoryItem>;
  sell: (uid: string) => ActionResult<number>;
  startUpgrade: (request: UpgradeRequest) => ActionResult<UpgradeOutcome>;
  resolveUpgrade: () => ActionResult<UpgradeResolution>;
  openCase: () => ActionResult<InventoryItem>;
  openShopCase: (caseId: string) => ActionResult<InventoryItem>;
  openCapsule: (capsuleId: string) => ActionResult<StickerItem>;
  applySticker: (itemUid: string, stickerUid: string) => ActionResult<null>;
  sellSticker: (stickerUid: string) => ActionResult<number>;
  battle: (caseId: string, bots: number, rounds: number) => ActionResult<BattleOutcome>;
  tradeUp: (uids: string[]) => ActionResult<InventoryItem>;
  coinflip: (bet: number, side: CoinSide) => ActionResult<CoinflipResult>;
  roulette: (bet: number, color: RouletteColor) => ActionResult<RouletteResult>;
  plinko: (bet: number, risk: PlinkoRisk) => ActionResult<PlinkoResult>;
  startMines: (bet: number, mines: number) => ActionResult<MinesGame>;
  revealMine: (cell: number) => ActionResult<MinesReveal>;
  cashOutMines: () => ActionResult<{ payout: number; mines: number[] }>;
  startCrash: (stake: CrashStake, autoCashout: number | null) => ActionResult<CrashRound>;
  cashOut: (multiplier: number) => ActionResult<CrashPayout>;
  endCrash: () => ActionResult<CrashPayout>;
  startTowers: (bet: number, difficulty: TowersDifficulty) => ActionResult<TowersGame>;
  climbTowers: (tile: number) => ActionResult<TowersStep>;
  cashOutTowers: () => ActionResult<{ payout: number; bombs: number[][] }>;
  startHilo: (bet: number) => ActionResult<HiloGame>;
  guessHilo: (guess: HiloGuess) => ActionResult<HiloStep>;
  cashOutHilo: () => ActionResult<number>;
  spinWheel: () => ActionResult<WheelSpin>;
  redeemPromo: (code: string) => ActionResult<PrizeResult>;
  prestige: () => ActionResult<number>;
  adminGrantMoney: (amount: number) => void;
  adminSetBalance: (amount: number) => void;
  adminGiveItems: (skinId: string, count: number) => void;
  adminRemoveItem: (uid: string) => void;
  adminGiveKeys: (id: string, count: number) => void;
  adminResetCooldowns: () => void;
  adminSetLuck: (multiplier: number, scopes: LuckScope[]) => void;
  adminRevert: (entryId: string) => RevertResult | null;
  adminRevertSince: (entryId: string) => RevertResult | null;
  adminRestoreSnapshot: (raw: unknown) => void;
  refreshTrades: () => void;
  acceptTrade: (offerId: string) => ActionResult<InventoryItem[]>;
  declineTrade: (offerId: string) => void;
  claimQuest: (period: QuestPeriod, questId: string) => ActionResult<number>;
  claimTier: (tier: number) => ActionResult<SeasonReward>;
  setFrame: (frame: string | null) => void;
  claimDailyReward: () => ActionResult<number>;
  setShowcase: (uids: string[]) => void;
  setNickname: (nickname: string) => void;
  toggleFavorite: (skinId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  dismissWelcome: () => void;
  completeOnboarding: () => void;
  resetAccount: () => void;
  /** Replaces the whole state with a sanitized imported save. */
  importSave: (raw: unknown) => ActionResult<null>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Settle once on load so achievements already earned by a saved state unlock right away.
  const [initial] = useState(() => {
    const loaded = loadState();
    const settled = settleProgress(loaded.state, loaded.state);
    return { ...loaded, state: settled.state, events: settled.events };
  });
  const [state, setState] = useState<AppState>(initial.state);
  const [persistenceAvailable, setPersistenceAvailable] = useState(initial.status !== 'unavailable');
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>(initial.events);
  const [balanceHold, setBalanceHold] = useState(0);
  // Operations read from the ref so rapid consecutive calls always see the latest state.
  const stateRef = useRef(state);

  // Name of the action being run, recorded in the ledger (see `labeled` below).
  const labelRef = useRef<string | null>(null);

  const commit = useCallback((next: AppState) => {
    const prev = stateRef.current;
    const now = Date.now();
    const logged = appendLedger(next, diffLedger(prev, next, labelRef.current ?? 'other', now));
    const settled = settleProgress(prev, logged);
    // Level-up and achievement rewards get their own ledger line.
    const final = appendLedger(settled.state, diffLedger(logged, settled.state, 'progress', now));
    stateRef.current = final;
    setState(final);
    if (settled.events.length > 0) setProgressEvents((list) => [...list, ...settled.events]);
  }, []);

  const run = useCallback(
    <T,>(transition: (current: AppState) => Transition<T>): ActionResult<T> => {
      const result = transition(stateRef.current);
      if (!result.ok) return result;
      commit(result.state);
      return { ok: true, value: result.value };
    },
    [commit],
  );

  const update = useCallback((fn: (current: AppState) => AppState) => commit(fn(stateRef.current)), [commit]);

  /** Like `run`, and records the action in the per-game statistics. `start` marks a new round. */
  const play = useCallback(
    <T,>(game: GameId, start: boolean, transition: (current: AppState) => Transition<T>): ActionResult<T> =>
      run((s) => {
        const result = transition(s);
        return result.ok ? { ...result, state: trackGame(s, result.state, game, start) } : result;
      }),
    [run],
  );

  useEffect(() => {
    setPersistenceAvailable(saveState(state));
  }, [state]);

  const actions = useMemo(
    () => ({
      clearProgressEvents: () => setProgressEvents([]),
      holdBalance: (amount: number) => setBalanceHold((h) => h + Math.max(0, amount)),
      releaseBalance: (amount: number) => setBalanceHold((h) => Math.max(0, h - Math.max(0, amount))),
      finishBattle: () => update((s) => settleBattle(s)),
      jackpot: (uids: string[], mode?: JackpotMode) => play(mode === 'duel' || mode === 'mega' ? mode : 'jackpot', true, (s) => playJackpot(s, uids, mode)),
      finishJackpot: () => update((s) => settleJackpot(s)),
      claimCollection: (collectionId: string) => run((s) => claimCollectionTransition(s, collectionId)),
      buy: (skinId: string) => run((s) => buySkin(s, skinId)),
      sell: (uid: string) => run((s) => sellItem(s, uid)),
      startUpgrade: (request: UpgradeRequest) => play('upgrade', true, (s) => beginUpgrade(s, request)),
      resolveUpgrade: () => play('upgrade', false, (s) => finishUpgrade(s)),
      openCase: () => run((s) => openFreeCase(s)),
      openShopCase: (caseId: string) => play('cases', true, (s) => openPaidCase(s, caseId)),
      openCapsule: (capsuleId: string) => play('capsules', true, (s) => openCapsuleTransition(s, capsuleId)),
      applySticker: (itemUid: string, stickerUid: string) => run((s) => applyStickerTransition(s, itemUid, stickerUid)),
      sellSticker: (stickerUid: string) => run((s) => sellStickerTransition(s, stickerUid)),
      battle: (caseId: string, bots: number, rounds: number) => play('battles', true, (s) => playBattle(s, caseId, bots, rounds)),
      tradeUp: (uids: string[]) => play('contracts', true, (s) => signContract(s, uids)),
      coinflip: (bet: number, side: CoinSide) => play('coinflip', true, (s) => playCoinflip(s, bet, side)),
      roulette: (bet: number, color: RouletteColor) => play('roulette', true, (s) => playRoulette(s, bet, color)),
      plinko: (bet: number, risk: PlinkoRisk) => play('plinko', true, (s) => playPlinko(s, bet, risk)),
      startMines: (bet: number, mines: number) => play('mines', true, (s) => startMinesTransition(s, bet, mines)),
      revealMine: (cell: number) => play('mines', false, (s) => revealMineTransition(s, cell)),
      cashOutMines: () => play('mines', false, (s) => cashOutMinesTransition(s)),
      startCrash: (stake: CrashStake, autoCashout: number | null) => play('crash', true, (s) => startCrashTransition(s, stake, autoCashout)),
      cashOut: (multiplier: number) => play('crash', false, (s) => cashOutCrash(s, multiplier)),
      endCrash: () => play('crash', false, (s) => settleCrash(s)),
      startTowers: (bet: number, difficulty: TowersDifficulty) => play('towers', true, (s) => startTowersTransition(s, bet, difficulty)),
      climbTowers: (tile: number) => play('towers', false, (s) => climbTowersTransition(s, tile)),
      cashOutTowers: () => play('towers', false, (s) => cashOutTowersTransition(s)),
      startHilo: (bet: number) => play('hilo', true, (s) => startHiloTransition(s, bet)),
      guessHilo: (guess: HiloGuess) => play('hilo', false, (s) => guessHiloTransition(s, guess)),
      cashOutHilo: () => play('hilo', false, (s) => cashOutHiloTransition(s)),
      spinWheel: () => run((s) => spinWheelTransition(s)),
      redeemPromo: (code: string) => run((s) => redeemPromoTransition(s, code)),
      prestige: () => run((s) => doPrestige(s)),
      adminGrantMoney: (amount: number) => update((s) => grantMoney(s, amount)),
      adminSetBalance: (amount: number) => update((s) => setBalance(s, amount)),
      adminGiveItems: (skinId: string, count: number) => update((s) => giveItems(s, skinId, count)),
      adminRemoveItem: (uid: string) => update((s) => removeItem(s, uid)),
      adminGiveKeys: (id: string, count: number) => update((s) => giveKeys(s, id, count)),
      adminResetCooldowns: () => update((s) => resetCooldowns(s)),
      adminSetLuck: (multiplier: number, scopes: LuckScope[]) => update((s) => setLuck(s, multiplier, scopes)),
      adminRevert: (entryId: string): RevertResult | null => {
        const result = revertEntry(stateRef.current, entryId);
        if (result) commit(result.state);
        return result;
      },
      adminRevertSince: (entryId: string): RevertResult | null => {
        const result = revertSince(stateRef.current, entryId);
        if (result) commit(result.state);
        return result;
      },
      /** Restores a restore point but keeps the current ledger, so the audit trail survives. */
      adminRestoreSnapshot: (raw: unknown) => {
        const { state: restored } = sanitizeState(raw);
        commit({ ...restored, ledger: stateRef.current.ledger, isFirstVisit: false });
      },
      refreshTrades: () => update((s) => refreshTradesTransition(s)),
      acceptTrade: (offerId: string) => run((s) => acceptTradeTransition(s, offerId)),
      declineTrade: (offerId: string) => update((s) => declineTradeTransition(s, offerId)),
      claimQuest: (period: QuestPeriod, questId: string) => run((s) => claimQuestTransition(s, period, questId)),
      claimTier: (tier: number) => run((s) => claimTierTransition(s, tier)),
      setFrame: (frame: string | null) => update((s) => setFrameTransition(s, frame)),
      claimDailyReward: () => run((s) => claimDaily(s)),
      setShowcase: (uids: string[]) => update((s) => setShowcaseTransition(s, uids)),
      setNickname: (nickname: string) => update((s) => setNicknameTransition(s, nickname)),
      toggleFavorite: (skinId: string) => update((s) => toggleFavoriteTransition(s, skinId)),
      updateSettings: (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      dismissWelcome: () => update((s) => ({ ...s, isFirstVisit: false })),
      completeOnboarding: () => update((s) => ({ ...s, onboardingComplete: true })),
      resetAccount: () => {
        const { language, theme, soundPack } = stateRef.current.settings;
        clearStoredState();
        const previous = stateRef.current;
        const fresh = createInitialState();
        // The ledger survives a reset so the admin panel keeps the full history.
        const next = { ...fresh, settings: { ...fresh.settings, language, theme, soundPack }, ledger: previous.ledger };
        stateRef.current = appendLedger(next, diffLedger(previous, next, 'resetAccount'));
        setState(stateRef.current);
        setProgressEvents([]);
      },
      importSave: (raw: unknown): ActionResult<null> => {
        if (typeof raw !== 'object' || raw === null || !('balance' in raw) || !('inventory' in raw)) {
          return { ok: false, error: 'importInvalid' };
        }
        const { state: imported } = sanitizeState(raw);
        stateRef.current = { ...imported, isFirstVisit: false };
        setState(stateRef.current);
        setProgressEvents([]);
        return { ok: true, value: null };
      },
    }),
    [run, update, play],
  );

  // Every action runs with its name as the ledger label; nested calls keep the outer name.
  const labeled = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(actions).map(([name, fn]) => [
          name,
          (...args: unknown[]) => {
            const outer = labelRef.current;
            labelRef.current = outer ?? name;
            try {
              return (fn as (...a: unknown[]) => unknown)(...args);
            } finally {
              labelRef.current = outer;
            }
          },
        ]),
      ) as typeof actions,
    [actions],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      loadStatus: initial.status,
      persistenceAvailable,
      progressEvents,
      freeCaseAvailable: isFreeCaseAvailable(state),
      balanceHold,
      ...labeled,
    }),
    [state, initial.status, persistenceAvailable, progressEvents, balanceHold, labeled],
  );

  return createElement(StoreContext.Provider, { value }, children);
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
