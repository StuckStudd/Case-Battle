import { Check, Coins, Flame, Package, Rocket } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { CrashPayout } from '../store/transitions';
import { CRASH_GROWTH, CRASH_MAX_MULTIPLIER, CRASH_RETURN } from '../utils/config';
import { celebrate } from '../utils/effects';
import { formatMoney } from '../utils/format';
import { crashMultiplierAt, crashTimeFor } from '../utils/gamesEngine';
import { itemValue } from '../utils/itemValue';
import { cx } from '../utils/ui';
import { BetInput } from './BetInput';
import { Pagination, usePagination } from './Pagination';
import { SkinCard } from './SkinCard';
import { SkinImage } from './SkinImage';
import { useToast } from './Toast';

type View =
  | { status: 'idle' }
  | { status: 'running'; m: number; ms: number }
  | { status: 'crashed'; m: number; ms: number }
  | { status: 'cashed'; m: number; ms: number };

const W = 600;
const H = 300;
const PAD = 36;

function point(time: number, maxM: number, maxMs: number): [number, number] {
  const m = Math.exp((CRASH_GROWTH * time) / 1000);
  return [PAD + (time / maxMs) * (W - PAD * 2), H - PAD - ((m - 1) / (maxM - 1)) * (H - PAD * 2)];
}

function curvePath(ms: number, maxM: number, maxMs: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const [x, y] = point((ms * i) / 60, maxM, maxMs);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

export function Crash() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, startCrash, cashOut, endCrash } = useStore();
  const [mode, setMode] = useState<'money' | 'skins'>('money');
  const [bet, setBet] = useState('1');
  const [auto, setAuto] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [view, setView] = useState<View>({ status: 'idle' });
  const [recent, setRecent] = useState<number[]>([]);
  const frame = useRef(0);
  const round = state.pendingCrash;
  const roundRef = useRef(round);
  roundRef.current = round;

  const pickedItems = useMemo(() => state.inventory.filter((i) => picked.includes(i.uid)), [state.inventory, picked]);
  const pickedValue = pickedItems.reduce((sum, i) => sum + itemValue(i), 0);
  const sortedInventory = useMemo(() => [...state.inventory].sort((a, b) => itemValue(b) - itemValue(a)), [state.inventory]);
  const { page, pageCount, pageItems, setPage } = usePagination(sortedInventory, 12);
  const ridingSkin = getSkin(round?.skinStake?.skinIds[0]);

  const announcePayout = useCallback(
    (value: CrashPayout) => {
      if (value.item) {
        const skin = getSkin(value.item.skinId);
        if (skin) celebrate(skin, state.settings.soundEnabled);
        toast({
          type: 'win',
          title: t('crash.gotSkin', { name: skin?.name ?? '', m: value.multiplier.toFixed(2) }),
          message: value.cash > 0 ? t('crash.plusCash', { amount: formatMoney(value.cash) }) : undefined,
        });
      } else {
        sound.play('cashout');
        toast({ type: 'win', title: t('games.cashedOut', { m: value.multiplier.toFixed(2) }), message: formatMoney(value.payout) });
      }
    },
    [sound, toast, t, state.settings.soundEnabled],
  );

  const finishCrashed = useCallback(
    (crashPoint: number) => {
      const result = endCrash();
      sound.play('boom');
      setView({ status: 'crashed', m: crashPoint, ms: crashTimeFor(crashPoint) });
      setRecent((list) => [crashPoint, ...list].slice(0, 14));
      if (result.ok && result.value.payout > 0) announcePayout(result.value);
    },
    [endCrash, sound, announcePayout],
  );

  // Animation loop: runs whenever a round is pending, including after navigating back to the page.
  useEffect(() => {
    if (!round) return;
    const tick = () => {
      const current = roundRef.current;
      if (!current) return;
      const ms = Date.now() - current.startedAt;
      const m = crashMultiplierAt(ms);
      if (current.autoCashout !== null && current.autoCashout <= current.crashPoint && m >= current.autoCashout) {
        const result = cashOut(current.autoCashout);
        if (result.ok) {
          setView({ status: 'cashed', m: current.autoCashout, ms: crashTimeFor(current.autoCashout) });
          setRecent((list) => [current.crashPoint, ...list].slice(0, 14));
          announcePayout(result.value);
          return;
        }
      }
      if (m >= current.crashPoint) {
        finishCrashed(current.crashPoint);
        return;
      }
      setView({ status: 'running', m, ms });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // Restart only when a different round begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id]);

  const start = () => {
    const autoValue = auto.trim() ? Number(auto.replace(',', '.')) : null;
    const autoCashout = autoValue && autoValue > 1 ? Math.min(autoValue, CRASH_MAX_MULTIPLIER) : null;
    const result =
      mode === 'skins' ? startCrash({ uids: picked }, autoCashout) : startCrash({ bet: Number(bet.replace(',', '.')) }, autoCashout);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    setPicked([]);
    sound.play('click');
    setView({ status: 'running', m: 1, ms: 0 });
  };

  const manualCashOut = () => {
    if (view.status !== 'running' || !round) return;
    const m = crashMultiplierAt(Date.now() - round.startedAt);
    if (m >= round.crashPoint) {
      cancelAnimationFrame(frame.current);
      finishCrashed(round.crashPoint);
      return;
    }
    const result = cashOut(m);
    if (!result.ok) return;
    cancelAnimationFrame(frame.current);
    setView({ status: 'cashed', m, ms: view.ms });
    setRecent((list) => [round.crashPoint, ...list].slice(0, 14));
    announcePayout(result.value);
  };

  const running = view.status === 'running';
  const shownM = view.status === 'idle' ? 1 : view.m;
  const ms = view.status === 'idle' ? 0 : view.ms;
  const maxMs = Math.max(8000, ms * 1.15);
  const maxM = Math.max(2, shownM * 1.25);
  const color = view.status === 'crashed' ? '#ef4444' : view.status === 'cashed' ? '#22c55e' : 'var(--accent)';
  const [headX, headY] = point(ms, maxM, maxMs);
  const stake = round?.bet ?? (mode === 'skins' ? pickedValue : Number(bet.replace(',', '.')) || 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {recent.map((m, i) => (
            <span key={i} className={cx('rounded-md px-2 py-0.5 text-xs font-bold tabular-nums', m >= 2 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300')}>
              x{m.toFixed(2)}
            </span>
          ))}
        </div>
        <div className="relative overflow-hidden rounded-xl bg-black/30">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('games.crash')}>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="rgba(255,255,255,0.05)" />
            ))}
            <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.12)" />
            {ms > 0 && (
              <>
                <path d={`${curvePath(ms, maxM, maxMs)} L${headX.toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`} style={{ fill: color }} opacity="0.08" />
                <path d={curvePath(ms, maxM, maxMs)} fill="none" style={{ stroke: color }} strokeWidth="3" strokeLinecap="round" />
              </>
            )}
          </svg>
          {ms > 0 && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(headX / W) * 100}%`, top: `${(headY / H) * 100}%` }}
            >
              {view.status === 'crashed' ? (
                <Flame size={44} className="anim-pop text-rose-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.9)]" />
              ) : (
                <div className="relative">
                  <Rocket size={38} className="-rotate-12 text-white drop-shadow-[0_0_14px_rgb(var(--accent-rgb)/0.9)]" style={{ fill: 'var(--accent)' }} />
                  {ridingSkin && <SkinImage skin={ridingSkin} className="absolute -left-14 top-3 h-8 w-14" />}
                </div>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className={cx('font-display text-6xl font-bold tabular-nums sm:text-7xl', view.status === 'crashed' ? 'text-rose-400' : view.status === 'cashed' ? 'text-emerald-400' : 'text-white')}>
                x{shownM.toFixed(2)}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                {view.status === 'crashed'
                  ? t('games.crashed')
                  : view.status === 'cashed'
                    ? t('games.cashedOut', { m: view.m.toFixed(2) })
                    : running
                      ? t('games.flying')
                      : t('games.waiting')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ['money', t('crash.modeMoney'), Coins],
              ['skins', t('crash.modeSkins'), Package],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} type="button" className="chip justify-center py-2" data-active={mode === id} disabled={running} onClick={() => setMode(id)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {mode === 'money' ? (
          <BetInput value={bet} onChange={setBet} max={state.balance} disabled={running} />
        ) : (
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-slate-400">
              <span>{t('crash.pickSkins')}</span>
              <span className="font-semibold tabular-nums text-amber-300">{formatMoney(pickedValue)}</span>
            </div>
            {state.inventory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">{t('crash.noSkins')}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {pageItems.map((item) => {
                    const skin = getSkin(item.skinId);
                    if (!skin) return null;
                    const selected = picked.includes(item.uid);
                    return (
                      <SkinCard
                        key={item.uid}
                        skin={skin}
                        item={item}
                        compact
                        selected={selected}
                        disabled={running}
                        onClick={() => setPicked((list) => (selected ? list.filter((u) => u !== item.uid) : [...list, item.uid]))}
                        badge={
                          selected ? (
                            <span className="grid size-4 place-items-center rounded-full bg-amber-400 text-black">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
                {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
              </>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs text-slate-400">{t('games.autoCashout')}</div>
          <input inputMode="decimal" value={auto} disabled={running} onChange={(e) => setAuto(e.target.value)} placeholder="x2.00" className="input h-11" aria-label={t('games.autoCashout')} />
        </div>

        {running && round ? (
          <button type="button" onClick={manualCashOut} className="btn btn-success h-14 w-full text-lg">
            {round.skinStake ? t('crash.cashOutSkin', { amount: formatMoney(round.bet * shownM) }) : t('games.cashOutFor', { amount: formatMoney(round.bet * shownM) })}
          </button>
        ) : (
          <button type="button" onClick={start} className="btn btn-primary h-14 w-full text-lg tracking-wider">
            <Rocket size={18} /> {t('games.startRound')} · {formatMoney(stake)}
          </button>
        )}
        <p className="text-center text-[11px] text-slate-500">
          {mode === 'skins' ? t('crash.skinRules', { max: CRASH_MAX_MULTIPLIER }) : t('games.crashRules', { edge: Math.round((1 - CRASH_RETURN) * 100) })}
        </p>
      </div>
    </div>
  );
}
