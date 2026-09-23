import { useEffect, useLayoutEffect, useRef } from 'react';
import type { UpgradeOutcome } from '../types/types';
import { ROULETTE_FAST_DURATION_MS } from '../utils/config';
import { cx, prefersReducedMotion } from '../utils/ui';
import { useT } from '../i18n';
import { ChevronMark } from './Logo';

export type WheelStatus = 'idle' | 'rolling' | 'win' | 'loss';

const SIZE = 320;
const C = SIZE / 2;
const TRACK_R = 118;
const CIRCUMFERENCE = 2 * Math.PI * TRACK_R;
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

interface UpgradeRouletteProps {
  chance: number | null;
  status: WheelStatus;
  /** When set, the pointer spins and stops on this already-decided roll. */
  outcome: UpgradeOutcome | null;
  durationMs: number;
  onTick: () => void;
  onFinish: () => void;
}

/**
 * Circular upgrade wheel. The winning sector spans [0, chance) percent clockwise from the top,
 * and the pointer stops at `roll` percent, so it lands inside the sector exactly when the roll wins.
 */
export function UpgradeRoulette({ chance, status, outcome, durationMs, onTick, onFinish }: UpgradeRouletteProps) {
  const t = useT();
  const pointerRef = useRef<SVGGElement>(null);
  const callbacks = useRef({ onTick, onFinish });

  useEffect(() => {
    callbacks.current = { onTick, onFinish };
  });

  useLayoutEffect(() => {
    const pointer = pointerRef.current;
    if (!pointer) return;
    const setAngle = (deg: number) => pointer.setAttribute('transform', `rotate(${deg} ${C} ${C})`);
    if (!outcome) {
      setAngle(0);
      return;
    }

    const reduced = prefersReducedMotion();
    const duration = reduced ? Math.min(durationMs, ROULETTE_FAST_DURATION_MS) : durationMs;
    const spins = duration < 3000 ? 3 : 5;
    const end = spins * 360 + outcome.roll * 3.6;
    const start = performance.now();
    let frame = 0;
    let finishTimer = 0;
    let lastStep = 0;

    const render = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const angle = end * (1 - Math.pow(1 - t, 4));
      setAngle(angle);
      const step = Math.floor(angle / 15);
      if (step !== lastStep) {
        lastStep = step;
        callbacks.current.onTick();
      }
      if (t < 1) frame = requestAnimationFrame(render);
      else finishTimer = window.setTimeout(() => callbacks.current.onFinish(), 450);
    };

    setAngle(0);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(finishTimer);
    };
  }, [outcome, durationMs]);

  const fraction = chance === null ? 0 : Math.min(1, chance / 100);
  const winDeg = fraction * 360;
  const arcColor = status === 'loss' ? '#ef4444' : status === 'win' ? '#22c55e' : null;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[320px]">
      <div
        className={cx(
          'absolute inset-10 rounded-full blur-3xl transition-colors duration-500',
          status === 'win' ? 'bg-emerald-500/30' : status === 'loss' ? 'bg-rose-600/30' : 'bg-amber-400/15',
        )}
      />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="wheel-win" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="1" stopColor="#7ed321" />
          </linearGradient>
          <radialGradient id="wheel-disk" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0" stopColor="#26272c" />
            <stop offset="1" stopColor="#141518" />
          </radialGradient>
          <filter id="wheel-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {TICKS.map((deg) => {
          const major = deg % 30 === 0;
          const inWin = deg < winDeg;
          return (
            <line
              key={deg}
              x1={C}
              y1={major ? 10 : 14}
              x2={C}
              y2={22}
              style={{ stroke: inWin ? (arcColor ?? 'var(--accent)') : 'rgba(255,255,255,0.14)' }}
              strokeWidth={major ? 2.4 : 1.4}
              strokeLinecap="round"
              transform={`rotate(${deg} ${C} ${C})`}
            />
          );
        })}

        <circle cx={C} cy={C} r={TRACK_R} fill="none" stroke="#202125" strokeWidth={26} />
        <circle
          cx={C}
          cy={C}
          r={TRACK_R}
          fill="none"
          stroke={arcColor ?? 'url(#wheel-win)'}
          strokeWidth={26}
          strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${C} ${C})`}
          filter="url(#wheel-glow)"
          style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.2,0.8,0.2,1), stroke 0.3s' }}
        />
        <circle cx={C} cy={C} r={TRACK_R - 13} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
        <circle cx={C} cy={C} r={96} fill="url(#wheel-disk)" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />

        <g ref={pointerRef}>
          <path
            d={`M${C} 44 L${C - 12} 14 L${C} 21 L${C + 12} 14 Z`}
            style={{ fill: status === 'loss' ? '#ef4444' : 'var(--accent)' }}
            filter="url(#wheel-glow)"
          />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {chance === null ? (
          <ChevronMark className="size-20 opacity-90 drop-shadow-[0_0_18px_rgb(var(--accent-rgb)/0.4)]" />
        ) : (
          <div className="text-center">
            <div
              className={cx(
                'font-display text-4xl font-bold tabular-nums sm:text-5xl',
                status === 'win' ? 'text-emerald-400' : status === 'loss' ? 'text-rose-400' : 'text-white',
              )}
            >
              {chance.toFixed(2)}%
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
              {t(status === 'win' ? 'wheel.success' : status === 'loss' ? 'wheel.failed' : status === 'rolling' ? 'wheel.rolling' : 'wheel.chance')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
