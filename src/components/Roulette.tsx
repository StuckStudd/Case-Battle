import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { launchConfetti } from '../utils/confetti';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { ROULETTE_PAYOUT, ROULETTE_SLOTS } from '../utils/gamesEngine';
import type { RouletteColor } from '../utils/gamesEngine';
import { secureRandom } from '../utils/random';
import { cx, prefersReducedMotion } from '../utils/ui';
import { BetInput } from './BetInput';
import { useToast } from './Toast';

const TILE = 72;
const GAP = 6;
const LOOPS = 8;
const COLOR_CLASS: Record<RouletteColor, string> = {
  red: 'bg-gradient-to-b from-rose-500 to-rose-700',
  black: 'bg-gradient-to-b from-slate-700 to-slate-900',
  green: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
};

interface Spin {
  id: number;
  slot: number;
  won: boolean;
  profit: number;
  payout: number;
}

export function Roulette() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, roulette, holdBalance, releaseBalance } = useStore();
  const [bet, setBet] = useState('1');
  const [spin, setSpin] = useState<Spin | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [recent, setRecent] = useState<RouletteColor[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  // Leaving mid-animation must not keep winnings hidden in the header.
  useEffect(() => () => releaseBalance(Number.MAX_VALUE), [releaseBalance]);
  const strip = Array.from({ length: ROULETTE_SLOTS.length * (LOOPS + 2) }, (_, i) => i % ROULETTE_SLOTS.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track || !spin) return;
    const step = TILE + GAP;
    const center = container.clientWidth / 2;
    // Land on the chosen slot in the last full loop, a little off-center for realism.
    const index = ROULETTE_SLOTS.length * LOOPS + spin.slot;
    const jitter = (secureRandom() - 0.5) * TILE * 0.7;
    const startX = offset.current;
    const endX = center - (index * step + TILE / 2 + jitter);
    const duration = prefersReducedMotion() ? 1200 : state.settings.fastRoulette ? 2200 : 4500;
    const start = performance.now();
    let frame = 0;
    let last = -1;
    const render = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const x = startX + (endX - startX) * (1 - Math.pow(1 - p, 4));
      track.style.transform = `translate3d(${x}px,0,0)`;
      const cur = Math.floor((center - x) / step);
      if (cur !== last) {
        last = cur;
        sound.play('tick');
      }
      if (p < 1) frame = requestAnimationFrame(render);
      else {
        // Snap back to the same slot near the strip start so the next spin has room to travel.
        offset.current = endX + ROULETTE_SLOTS.length * LOOPS * step;
        window.setTimeout(() => {
          track.style.transform = `translate3d(${offset.current}px,0,0)`;
          setSpinning(false);
          releaseBalance(spin.payout);
          setRecent((list) => [ROULETTE_SLOTS[spin.slot], ...list].slice(0, 12));
          if (spin.won) {
            sound.play('win');
            if (ROULETTE_SLOTS[spin.slot] === 'green') launchConfetti(2200, 'gold');
          } else sound.play('lose');
          toast({ type: spin.won ? 'win' : 'loss', title: spin.won ? t('games.youWon') : t('games.youLost'), message: formatSignedMoney(spin.profit) });
        }, 350);
      }
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.id]);

  // Initial position: center the green slot.
  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    offset.current = container.clientWidth / 2 - (ROULETTE_SLOTS.length * (TILE + GAP) + TILE / 2);
    track.style.transform = `translate3d(${offset.current}px,0,0)`;
  }, []);

  const play = (color: RouletteColor) => {
    if (spinning) return;
    const amount = Number(bet.replace(',', '.'));
    const result = roulette(amount, color);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    holdBalance(result.value.payout);
    setSpinning(true);
    setSpin({ id: Date.now(), slot: result.value.slot, won: result.value.payout > 0, profit: result.value.payout - amount, payout: result.value.payout });
  };

  return (
    <div className="space-y-5">
      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {recent.map((c, i) => (
            <span key={i} className={cx('size-6 rounded-full', COLOR_CLASS[c])} />
          ))}
        </div>
        <div ref={containerRef} className="relative overflow-hidden rounded-2xl border border-line bg-black/40 py-3">
          <div ref={trackRef} className="flex will-change-transform" style={{ gap: GAP }}>
            {strip.map((slot, i) => (
              <div key={i} style={{ width: TILE, height: TILE }} className={cx('grid shrink-0 place-items-center rounded-xl font-display text-2xl font-bold text-white', COLOR_CLASS[ROULETTE_SLOTS[slot]])}>
                {slot}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0e0f11] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0e0f11] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded bg-amber-300 shadow-[0_0_14px_3px_rgb(var(--accent-rgb)/0.7)]" />
        </div>
      </div>

      <div className="panel grid gap-4 p-5 md:grid-cols-[1fr_2fr] md:items-end">
        <BetInput value={bet} onChange={setBet} max={state.balance} disabled={spinning} />
        <div className="grid grid-cols-3 gap-2">
          {(['red', 'green', 'black'] as const).map((color) => (
            <button key={color} type="button" disabled={spinning} onClick={() => play(color)} className={cx('btn h-14 flex-col gap-0 text-white', COLOR_CLASS[color])}>
              <span className="text-sm font-bold">{t(`roulette.${color}`)}</span>
              <span className="text-xs opacity-80">
                x{ROULETTE_PAYOUT[color]} · {formatMoney((Number(bet.replace(',', '.')) || 0) * ROULETTE_PAYOUT[color])}
              </span>
            </button>
          ))}
        </div>
        <p className="text-center text-[11px] text-slate-500 md:col-span-2">{t('roulette.rules')}</p>
      </div>
    </div>
  );
}
