import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { PLINKO_ROWS } from '../utils/config';
import { PLINKO_MULTIPLIERS } from '../utils/gamesEngine';
import type { PlinkoRisk } from '../utils/gamesEngine';
import { cx, prefersReducedMotion } from '../utils/ui';
import { BetInput } from './BetInput';
import { useToast } from './Toast';

const W = 520;
const H = 460;
const TOP = 40;
const ROW_GAP = (H - TOP - 70) / PLINKO_ROWS;
const PEG_GAP = W / (PLINKO_ROWS + 3);

interface Ball {
  id: number;
  path: boolean[];
  step: number;
  bin: number;
  multiplier: number;
  payout: number;
}

function ballPosition(ball: Ball): [number, number] {
  const rights = ball.path.slice(0, ball.step).filter(Boolean).length;
  const x = W / 2 + (rights - ball.step / 2) * PEG_GAP;
  const y = TOP - 20 + ball.step * ROW_GAP;
  return [x, y];
}

function binColor(multiplier: number): string {
  if (multiplier >= 10) return 'bg-rose-500 text-white';
  if (multiplier >= 2) return 'bg-orange-500 text-white';
  if (multiplier >= 1) return 'bg-amber-400 text-black';
  return 'bg-yellow-200/80 text-black';
}

export function Plinko() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, plinko, holdBalance, releaseBalance } = useStore();
  const [bet, setBet] = useState('1');
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [balls, setBalls] = useState<Ball[]>([]);
  const [hitBin, setHitBin] = useState<number | null>(null);
  // Leaving mid-animation must not keep winnings hidden in the header.
  useEffect(() => () => releaseBalance(Number.MAX_VALUE), [releaseBalance]);
  const multipliers = PLINKO_MULTIPLIERS[risk];
  const timer = useRef(0);

  // One animation clock drives every ball in flight.
  useEffect(() => {
    if (balls.length === 0) return;
    timer.current = window.setTimeout(() => {
      const landed = balls.filter((ball) => ball.step >= PLINKO_ROWS);
      for (const ball of landed) {
        setHitBin(ball.bin);
        releaseBalance(ball.payout);
        if (ball.multiplier >= 2) sound.play('win');
      }
      // Functional update keeps balls dropped while this tick was pending.
      setBalls((list) => list.filter((ball) => ball.step < PLINKO_ROWS).map((ball) => ({ ...ball, step: ball.step + 1 })));
      sound.play('tick');
    }, prefersReducedMotion() ? 40 : 110);
    return () => window.clearTimeout(timer.current);
  }, [balls, sound]);

  const drop = () => {
    const amount = Number(bet.replace(',', '.'));
    const result = plinko(amount, risk);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    const { path, bin, multiplier, payout } = result.value;
    holdBalance(payout);
    setBalls((list) => [...list, { id: Date.now() + Math.random(), path, step: 0, bin, multiplier, payout }]);
  };

  const binWidth = PEG_GAP;
  const binsLeft = W / 2 - (multipliers.length / 2) * binWidth;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="panel p-3">
        <div className="relative mx-auto w-full max-w-[560px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('games.plinko')}>
            {Array.from({ length: PLINKO_ROWS }, (_, row) =>
              Array.from({ length: row + 3 }, (_, i) => (
                <circle key={`${row}-${i}`} cx={W / 2 + (i - (row + 2) / 2) * PEG_GAP} cy={TOP + row * ROW_GAP} r="4" fill="rgba(255,255,255,0.55)" />
              )),
            )}
            {balls.map((ball) => {
              const [x, y] = ballPosition(ball);
              return <circle key={ball.id} cx={x} cy={y} r="8" style={{ fill: 'var(--accent)', transition: 'cx 0.1s linear, cy 0.1s linear' }} />;
            })}
          </svg>
          <div className="absolute bottom-2 flex gap-[2px]" style={{ left: `${(binsLeft / W) * 100}%`, width: `${((multipliers.length * binWidth) / W) * 100}%` }}>
            {multipliers.map((m, i) => (
              <div
                key={i}
                className={cx('flex-1 rounded-md py-1 text-center text-[10px] font-bold transition sm:text-xs', binColor(m), hitBin === i && 'anim-pop ring-2 ring-white')}
              >
                {m}x
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <BetInput value={bet} onChange={setBet} max={state.balance} />
        <div>
          <div className="mb-1.5 text-xs text-slate-400">{t('plinko.risk')}</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['low', 'medium', 'high'] as const).map((r) => (
              <button key={r} type="button" className="chip justify-center" data-active={risk === r} disabled={balls.length > 0} onClick={() => setRisk(r)}>
                {t(`plinko.${r}`)}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={drop} className="btn btn-primary h-14 w-full text-lg tracking-wider">
          {t('plinko.drop')}
        </button>
        <p className="text-center text-[11px] text-slate-500">{t('plinko.rules')}</p>
      </div>
    </div>
  );
}
