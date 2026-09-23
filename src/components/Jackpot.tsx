import { Check, Crown, Users } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { JackpotOutcome } from '../store/transitions';
import { JACKPOT_EDGE } from '../utils/botEngine';
import type { JackpotMode } from '../utils/botEngine';
import { celebrate } from '../utils/effects';
import { formatMoney, formatPercent } from '../utils/format';
import { itemValue } from '../utils/itemValue';
import { secureRandom } from '../utils/random';
import { cx, prefersReducedMotion } from '../utils/ui';
import { Pagination, usePagination } from './Pagination';
import { SkinCard } from './SkinCard';
import { SkinImage } from './SkinImage';
import { useToast } from './Toast';

const PLAYER_COLORS = ['#ffc800', '#60a5fa', '#f472b6', '#34d399', '#a78bfa', '#fb923c'];
const TILE = 88;
const GAP = 6;
const TILE_COUNT = 70;
const LANDING = 58;

/** Strip of player tiles sampled by win chance; the landing tile is the decided winner. */
function buildStrip(outcome: JackpotOutcome): number[] {
  const pick = () => {
    let r = secureRandom();
    for (let i = 0; i < outcome.entries.length; i++) {
      r -= outcome.entries[i].chance;
      if (r < 0) return i;
    }
    return outcome.entries.length - 1;
  };
  return Array.from({ length: TILE_COUNT }, (_, i) => (i === LANDING ? outcome.winner : pick()));
}

export function Jackpot({ mode = 'classic' }: { mode?: JackpotMode }) {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, jackpot, finishJackpot } = useStore();
  const [picked, setPicked] = useState<string[]>([]);
  const [run, setRun] = useState<{ id: number; outcome: JackpotOutcome; strip: number[]; done: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => [...state.inventory].sort((a, b) => itemValue(b) - itemValue(a)), [state.inventory]);
  const { page, pageCount, pageItems, setPage } = usePagination(sorted, 12);
  const pickedValue = state.inventory.filter((i) => picked.includes(i.uid)).reduce((sum, i) => sum + itemValue(i), 0);
  const spinning = !!run && !run.done;
  const you = state.nickname || t('battle.you');

  // Leaving mid-spin still delivers held winnings.
  useEffect(() => () => finishJackpot(), [finishJackpot]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!run || run.done || !container || !track) return;
    const step = TILE + GAP;
    const center = container.clientWidth / 2;
    const startX = center - (2 * step + TILE / 2);
    const endX = center - (LANDING * step + TILE / 2 + (secureRandom() - 0.5) * TILE * 0.7);
    const duration = prefersReducedMotion() ? 1200 : state.settings.fastRoulette ? 2400 : 5000;
    const start = performance.now();
    let frame = 0;
    let last = -1;
    let timer = 0;
    const render = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const x = startX + (endX - startX) * (1 - Math.pow(1 - p, 4));
      track.style.transform = `translate3d(${x}px,0,0)`;
      const cur = Math.floor((center - x) / step);
      if (cur !== last) {
        last = cur;
        sound.play('tick');
      }
      if (p < 1) {
        frame = requestAnimationFrame(render);
        return;
      }
      timer = window.setTimeout(() => {
        finishJackpot();
        setRun((r) => (r ? { ...r, done: true } : r));
        const { outcome } = run;
        if (outcome.won) {
          const best = outcome.entries.flatMap((e) => e.skins).sort((a, b) => b.price - a.price)[0];
          celebrate(best, state.settings.soundEnabled);
          toast({ type: 'win', title: t('jackpot.won', { amount: formatMoney(outcome.pot) }) });
        } else {
          sound.play('lose');
          toast({ type: 'loss', title: t('jackpot.lost', { name: outcome.entries[outcome.winner].name }) });
        }
      }, 400);
    };
    track.style.transform = `translate3d(${startX}px,0,0)`;
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id]);

  const start = () => {
    const result = jackpot(picked, mode);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('click');
    setPicked([]);
    setRun({ id: Date.now(), outcome: result.value, strip: buildStrip(result.value), done: false });
  };

  const entries = run?.outcome.entries ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      {/* min-w-0 keeps the long player strip from stretching the grid column. */}
      <div className="min-w-0 space-y-4">
        <div className="panel p-4">
          {run ? (
            <>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-400">
                  <Users size={16} /> {t('jackpot.players', { count: entries.length })}
                </span>
                <span className="font-display text-xl font-bold text-amber-300">{formatMoney(run.outcome.pot)}</span>
              </div>
              <div ref={containerRef} className="relative overflow-hidden rounded-2xl border border-line bg-black/40 py-3">
                <div ref={trackRef} className="flex will-change-transform" style={{ gap: GAP }}>
                  {run.strip.map((player, i) => (
                    <div
                      key={i}
                      style={{ width: TILE, height: TILE, background: `${PLAYER_COLORS[player % PLAYER_COLORS.length]}22`, borderColor: PLAYER_COLORS[player % PLAYER_COLORS.length] }}
                      className={cx('grid shrink-0 place-items-center rounded-xl border-2 p-1 text-center', run.done && i === LANDING && 'scale-105')}
                    >
                      <span className="line-clamp-2 text-[11px] font-bold text-white">{entries[player].isYou ? you : entries[player].name}</span>
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0e0f11] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0e0f11] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded bg-amber-300 shadow-[0_0_14px_3px_rgb(var(--accent-rgb)/0.7)]" />
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">{t('jackpot.idle')}</p>
          )}
        </div>

        {run && (
          <div className="panel space-y-2 p-4">
            {entries.map((entry, i) => {
              const isWinner = run.done && run.outcome.winner === i;
              return (
                <div key={i} className={cx('flex items-center gap-3 rounded-xl border p-2', isWinner ? 'border-amber-400 bg-amber-400/10' : 'border-line')}>
                  <span className="size-3 shrink-0 rounded-full" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                  <span className={cx('w-28 shrink-0 truncate text-sm font-semibold', entry.isYou ? 'text-amber-300' : 'text-white')}>
                    {isWinner && <Crown size={13} className="mr-1 inline" />}
                    {entry.isYou ? you : entry.name}
                  </span>
                  <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                    {entry.skins.slice(0, 4).map((s, j) => (
                      <SkinImage key={j} skin={s} className="h-8 w-12 shrink-0" />
                    ))}
                  </div>
                  <span className="shrink-0 text-right text-xs tabular-nums">
                    <span className="block font-semibold text-white">{formatMoney(entry.value)}</span>
                    <span className="text-slate-500">{formatPercent(entry.chance * 100, 1)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel space-y-4 p-5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{t('jackpot.deposit')}</span>
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
                    disabled={spinning}
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
        <button type="button" onClick={start} disabled={spinning || picked.length === 0} className="btn btn-primary h-14 w-full text-lg tracking-wider">
          {t('jackpot.join', { amount: formatMoney(pickedValue) })}
        </button>
        <p className="text-center text-[11px] text-slate-500">{t(mode === 'duel' ? 'jackpot.rulesDuel' : mode === 'mega' ? 'jackpot.rulesMega' : 'jackpot.rules', { edge: Math.round(JACKPOT_EDGE * 100) })}</p>
      </div>
    </div>
  );
}
