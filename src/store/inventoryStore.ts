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
} from './transitions';
import type {
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

  const commit = useCallback((next: AppState) => {
    const settled = settleProgress(stateRef.current, next);
    stateRef.current = settled.state;
    setState(settled.state);
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

  useEffect(() => {
    setPersistenceAvailable(saveState(state));
  }, [state]);

  const actions = useMemo(
    () => ({
      clearProgressEvents: () => setProgressEvents([]),
      holdBalance: (amount: number) => setBalanceHold((h) => h + Math.max(0, amount)),
      releaseBalance: (amount: number) => setBalanceHold((h) => Math.max(0, h - Math.max(0, amount))),
      finishBattle: () => update((s) => settleBattle(s)),
      jackpot: (uids: string[], mode?: JackpotMode) => run((s) => playJackpot(s, uids, mode)),
      finishJackpot: () => update((s) => settleJackpot(s)),
      claimCollection: (collectionId: string) => run((s) => claimCollectionTransition(s, collectionId)),
      buy: (skinId: string) => run((s) => buySkin(s, skinId)),
      sell: (uid: string) => run((s) => sellItem(s, uid)),
      startUpgrade: (request: UpgradeRequest) => run((s) => beginUpgrade(s, request)),
      resolveUpgrade: () => run((s) => finishUpgrade(s)),
      openCase: () => run((s) => openFreeCase(s)),
      openShopCase: (caseId: string) => run((s) => openPaidCase(s, caseId)),
      openCapsule: (capsuleId: string) => run((s) => openCapsuleTransition(s, capsuleId)),
      applySticker: (itemUid: string, stickerUid: string) => run((s) => applyStickerTransition(s, itemUid, stickerUid)),
      sellSticker: (stickerUid: string) => run((s) => sellStickerTransition(s, stickerUid)),
      battle: (caseId: string, bots: number, rounds: number) => run((s) => playBattle(s, caseId, bots, rounds)),
      tradeUp: (uids: string[]) => run((s) => signContract(s, uids)),
      coinflip: (bet: number, side: CoinSide) => run((s) => playCoinflip(s, bet, side)),
      roulette: (bet: number, color: RouletteColor) => run((s) => playRoulette(s, bet, color)),
      plinko: (bet: number, risk: PlinkoRisk) => run((s) => playPlinko(s, bet, risk)),
      startMines: (bet: number, mines: number) => run((s) => startMinesTransition(s, bet, mines)),
      revealMine: (cell: number) => run((s) => revealMineTransition(s, cell)),
      cashOutMines: () => run((s) => cashOutMinesTransition(s)),
      startCrash: (stake: CrashStake, autoCashout: number | null) => run((s) => startCrashTransition(s, stake, autoCashout)),
      cashOut: (multiplier: number) => run((s) => cashOutCrash(s, multiplier)),
      endCrash: () => run((s) => settleCrash(s)),
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
        const fresh = createInitialState();
        stateRef.current = { ...fresh, settings: { ...fresh.settings, language, theme, soundPack } };
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
    [run, update],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      loadStatus: initial.status,
      persistenceAvailable,
      progressEvents,
      freeCaseAvailable: isFreeCaseAvailable(state),
      balanceHold,
      ...actions,
    }),
    [state, initial.status, persistenceAvailable, progressEvents, balanceHold, actions],
  );

  return createElement(StoreContext.Provider, { value }, children);
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
