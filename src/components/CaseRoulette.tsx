import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Skin } from '../types/types';
import { ROULETTE_FAST_DURATION_MS } from '../utils/config';
import { secureRandom } from '../utils/random';
import { cx, prefersReducedMotion, rarityStyle } from '../utils/ui';
import { SkinImage } from './SkinImage';

const TILE_COUNT = 56;
const LANDING_INDEX = 46;
const GAP = 6;

interface CaseRouletteProps {
  winner: Skin;
  /** Random skin for the non-winning tiles. */
  filler: () => Skin;
  durationMs: number;
  onTick: () => void;
  onFinish: () => void;
}

/** Horizontal case-opening strip that stops on the already-decided drop. */
export function CaseRoulette({ winner, filler, durationMs, onTick, onFinish }: CaseRouletteProps) {
  const [tiles] = useState(() =>
    Array.from({ length: TILE_COUNT }, (_, i) => (i === LANDING_INDEX ? winner : filler())),
  );
  const [landingOffset] = useState(() => (secureRandom() - 0.5) * 0.8);
  const [tileWidth] = useState(() => (window.innerWidth < 640 ? 100 : 128));
  const [landed, setLanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onTick, onFinish });

  useEffect(() => {
    callbacks.current = { onTick, onFinish };
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const step = tileWidth + GAP;
    const center = container.clientWidth / 2;
    const startX = center - (2 * step + tileWidth / 2);
    const endX = center - (LANDING_INDEX * step + tileWidth / 2 + landingOffset * tileWidth);
    const duration = prefersReducedMotion() ? Math.min(durationMs, ROULETTE_FAST_DURATION_MS) : durationMs;

    let frame = 0;
    let finishTimer = 0;
    let lastIndex = -1;
    const start = performance.now();

    const render = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const x = startX + (endX - startX) * (1 - Math.pow(1 - t, 4));
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      const index = Math.floor((center - x) / step);
      if (index !== lastIndex) {
        lastIndex = index;
        callbacks.current.onTick();
      }
      if (t < 1) {
        frame = requestAnimationFrame(render);
      } else {
        setLanded(true);
        finishTimer = window.setTimeout(() => callbacks.current.onFinish(), 600);
      }
    };

    track.style.transform = `translate3d(${startX}px, 0, 0)`;
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(finishTimer);
    };
  }, [durationMs, landingOffset, tileWidth]);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl border border-line bg-black/40 py-3">
      <div ref={trackRef} className="flex will-change-transform" style={{ gap: GAP }}>
        {tiles.map((skin, i) => (
          <div
            key={i}
            style={{ width: tileWidth, ...rarityStyle(skin.rarity) }}
            className={cx(
              'rarity-card flex shrink-0 flex-col items-center p-2 transition-all duration-300',
              landed && i === LANDING_INDEX && 'scale-105',
              landed && i !== LANDING_INDEX && 'opacity-30',
            )}
            data-selected={landed && i === LANDING_INDEX}
          >
            <SkinImage skin={skin} className="h-16 w-full sm:h-20" />
            <div className="mt-1 w-full truncate text-center text-[10px] text-slate-400">{skin.finish}</div>
            <div className="rarity-bar absolute inset-x-0 bottom-0 h-1" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0e0f11] to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0e0f11] to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_14px_3px_rgb(var(--accent-rgb)/0.7)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 size-0 -translate-x-1/2 border-x-[8px] border-t-[10px] border-x-transparent border-t-amber-300" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 size-0 -translate-x-1/2 border-x-[8px] border-b-[10px] border-x-transparent border-b-amber-300" />
    </div>
  );
}
