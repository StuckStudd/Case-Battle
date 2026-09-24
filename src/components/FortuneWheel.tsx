import { Disc3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { WHEEL_SEGMENTS } from '../data/extras';
import type { Prize } from '../data/extras';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { WheelSpin } from '../store/transitions';
import { wheelReadyAt } from '../store/transitions';
import { celebrate } from '../utils/effects';
import { formatMoney } from '../utils/format';
import { cx, prefersReducedMotion } from '../utils/ui';
import { Modal } from './Modal';
import { useToast } from './Toast';

const SIZE = 320;
const R = SIZE / 2;
const SEG = 360 / WHEEL_SEGMENTS.length;
/** Alternating segment fills; the label on each segment carries its meaning. */
const FILLS = ['#2a2418', '#1c1d22'];
const HIGHLIGHT: Record<string, string> = { legend: '#ff4fd8', keyKato: '#eb4b4b', cash2500: '#ffc800', knife: '#ffd24a' };

const LABEL: Record<string, TKey> = {
  skinSmall: 'wheelPrize.skinSmall',
  skinBig: 'wheelPrize.skinBig',
  keyDiamond: 'wheelPrize.keyDiamond',
  knife: 'wheelPrize.knife',
  keyKato: 'wheelPrize.keyKato',
  legend: 'wheelPrize.legend',
};

function segmentLabel(t: ReturnType<typeof useT>, id: string, prize: Prize): string {
  if (prize.kind === 'money') return `$${prize.amount}`;
  return t(LABEL[id] ?? 'wheelPrize.skinSmall');
}

function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}:${String(minutes % 60).padStart(2, '0')}` : `${minutes}m`;
}

function arc(index: number): string {
  const a0 = ((index * SEG - 90 - SEG / 2) * Math.PI) / 180;
  const a1 = (((index + 1) * SEG - 90 - SEG / 2) * Math.PI) / 180;
  return `M${R},${R} L${R + R * Math.cos(a0)},${R + R * Math.sin(a0)} A${R},${R} 0 0 1 ${R + R * Math.cos(a1)},${R + R * Math.sin(a1)} Z`;
}

/** Header button with a countdown, opening the free fortune wheel. */
export function FortuneWheel() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, spinWheel, holdBalance, releaseBalance } = useStore();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [rotation, setRotation] = useState(0);
  const [spin, setSpin] = useState<{ result: WheelSpin; done: boolean } | null>(null);
  const heldRef = useRef(0);
  const readyAt = wheelReadyAt(state);
  const ready = now >= readyAt;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Closing mid-spin still shows the prize in the balance.
  useEffect(
    () => () => {
      if (heldRef.current > 0) releaseBalance(heldRef.current);
    },
    [releaseBalance],
  );

  const duration = prefersReducedMotion() ? 800 : 4200;

  const start = () => {
    const result = spinWheel();
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    const { index, prize } = result.value;
    if (prize.kind === 'money') {
      heldRef.current = prize.amount;
      holdBalance(prize.amount);
    }
    sound.play('click');
    setSpin({ result: result.value, done: false });
    // Land the chosen segment under the pointer after several full turns.
    const target = 360 * 6 - index * SEG + (Math.random() - 0.5) * SEG * 0.6;
    setRotation((r) => r - (r % 360) + target);
    window.setTimeout(() => {
      if (heldRef.current > 0) {
        releaseBalance(heldRef.current);
        heldRef.current = 0;
      }
      setSpin({ result: result.value, done: true });
      setNow(Date.now());
      const skin = getSkin(result.value.item?.skinId);
      if (skin) celebrate(skin, state.settings.soundEnabled);
      else sound.play('win');
    }, duration + 150);
  };

  const result = spin?.done ? spin.result : null;
  const wonSkin = getSkin(result?.item?.skinId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('wheel.fortune')}
        className={cx('btn btn-ghost relative h-11 gap-1.5 px-3 text-xs font-bold', ready && 'border-amber-400/50 text-amber-300')}
      >
        <Disc3 size={18} className={ready ? 'anim-spin-slow' : undefined} />
        {!ready && <span className="hidden tabular-nums text-slate-400 sm:inline">{formatWait(readyAt - now)}</span>}
        {ready && <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgb(var(--accent-rgb)/0.9)]" />}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} size="md">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white">{t('wheel.fortune')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('wheel.fortuneHint')}</p>
          <div className="relative mx-auto mt-5 w-full max-w-[320px]">
            <div className="absolute left-1/2 top-[-6px] z-10 size-0 -translate-x-1/2 border-x-[12px] border-t-[22px] border-x-transparent border-t-amber-400 drop-shadow-[0_0_8px_rgba(255,200,0,0.8)]" />
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="w-full"
              style={{ transform: `rotate(${rotation}deg)`, transition: spin && !spin.done ? `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.2, 1)` : 'none' }}
              role="img"
              aria-label={t('wheel.fortune')}
            >
              {WHEEL_SEGMENTS.map((segment, i) => (
                <g key={segment.id}>
                  <path d={arc(i)} fill={FILLS[i % 2]} stroke="#0e0f11" strokeWidth="2" />
                  <text
                    x={R}
                    y={34}
                    transform={`rotate(${i * SEG} ${R} ${R})`}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill={HIGHLIGHT[segment.id] ?? '#e2e8f0'}
                  >
                    {segmentLabel(t, segment.id, segment.prize)}
                  </text>
                </g>
              ))}
              <circle cx={R} cy={R} r={R - 2} fill="none" stroke="rgba(255,200,0,0.5)" strokeWidth="4" />
              <circle cx={R} cy={R} r="30" fill="#0e0f11" stroke="rgba(255,200,0,0.7)" strokeWidth="3" />
            </svg>
          </div>

          <div className="mt-5 min-h-12">
            {result ? (
              <div className="anim-pop">
                <div className="text-xs uppercase tracking-wider text-slate-500">{t('wheel.youWon')}</div>
                <div className="font-display text-2xl font-bold text-amber-300">
                  {result.prize.kind === 'money'
                    ? formatMoney(result.prize.amount)
                    : wonSkin
                      ? `${wonSkin.name} · ${formatMoney(wonSkin.price)}`
                      : segmentLabel(t, result.segment.id, result.prize)}
                </div>
              </div>
            ) : null}
          </div>

          <button type="button" onClick={start} disabled={!ready || (!!spin && !spin.done)} className="btn btn-primary mt-3 h-14 w-full text-lg tracking-wider">
            {ready ? t('wheel.spin') : t('wheel.nextIn', { time: formatWait(readyAt - now) })}
          </button>
        </div>
      </Modal>
    </>
  );
}
