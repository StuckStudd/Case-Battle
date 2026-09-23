import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { COINFLIP_PAYOUT } from '../utils/config';
import { launchConfetti } from '../utils/confetti';
import { formatMoney, formatSignedMoney } from '../utils/format';
import type { CoinSide } from '../utils/gamesEngine';
import { cx, prefersReducedMotion } from '../utils/ui';
import { BetInput } from './BetInput';
import { useToast } from './Toast';

const SIDE_STYLE: Record<CoinSide, string> = {
  ct: 'from-sky-400 to-blue-700 text-white',
  t: 'from-amber-300 to-orange-600 text-black',
};

function CoinFace({ side, back }: { side: CoinSide; back?: boolean }) {
  return (
    <div
      className={cx(
        'coin-face absolute inset-0 grid place-items-center rounded-full bg-gradient-to-br font-display text-5xl font-bold shadow-[inset_0_-8px_20px_rgba(0,0,0,0.35)] ring-4 ring-white/20',
        SIDE_STYLE[side],
      )}
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      {side === 'ct' ? 'CT' : 'T'}
    </div>
  );
}

interface Flip {
  id: number;
  side: CoinSide;
  won: boolean;
  profit: number;
}

export function Coinflip() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, coinflip, holdBalance, releaseBalance } = useStore();
  const [bet, setBet] = useState('1');
  const [pick, setPick] = useState<CoinSide>('ct');
  const [rotation, setRotation] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [recent, setRecent] = useState<Flip[]>([]);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Leaving mid-animation must not keep winnings hidden in the header.
  useEffect(() => () => releaseBalance(Number.MAX_VALUE), [releaseBalance]);


  const flip = () => {
    if (flipping) return;
    const amount = Number(bet.replace(',', '.'));
    const result = coinflip(amount, pick);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    const { side, won, payout } = result.value;
    holdBalance(payout);
    const duration = prefersReducedMotion() ? 400 : 2000;
    // Spin several turns and stop showing the decided side (T is the back face).
    setRotation((r) => r - (r % 360) + 1800 + (side === 't' ? 180 : 0));
    setFlipping(true);
    sound.play('coin');
    timer.current = window.setTimeout(() => {
      setFlipping(false);
      releaseBalance(payout);
      const profit = won ? payout - amount : -amount;
      setRecent((list) => [{ id: Date.now(), side, won, profit }, ...list].slice(0, 12));
      if (won) {
        sound.play('win');
        launchConfetti(1600);
      } else {
        sound.play('lose');
      }
      toast({ type: won ? 'win' : 'loss', title: won ? t('games.youWon') : t('games.youLost'), message: formatSignedMoney(profit) });
    }, duration);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="panel flex flex-col items-center justify-center gap-6 p-6" style={{ perspective: 800 }}>
        <div
          className="coin relative size-40 sm:size-48"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transition: flipping ? `transform ${prefersReducedMotion() ? 0.4 : 2}s cubic-bezier(0.2, 0.7, 0.2, 1)` : 'none',
          }}
        >
          <CoinFace side="ct" />
          <CoinFace side="t" back />
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {recent.map((f) => (
            <span
              key={f.id}
              title={formatSignedMoney(f.profit)}
              className={cx(
                'grid size-7 place-items-center rounded-full bg-gradient-to-br text-[10px] font-bold',
                SIDE_STYLE[f.side],
                !f.won && 'opacity-40',
              )}
            >
              {f.side === 'ct' ? 'CT' : 'T'}
            </span>
          ))}
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <BetInput value={bet} onChange={setBet} max={state.balance} disabled={flipping} />
        <div>
          <div className="mb-1.5 text-xs text-slate-400">{t('games.pickSide')}</div>
          <div className="grid grid-cols-2 gap-2">
            {(['ct', 't'] as const).map((side) => (
              <button
                key={side}
                type="button"
                disabled={flipping}
                onClick={() => setPick(side)}
                className={cx(
                  'btn h-14 border text-lg',
                  pick === side ? 'border-amber-400 bg-amber-400/10 text-white' : 'border-line bg-white/[0.02] text-slate-400',
                )}
              >
                <span className={cx('grid size-8 place-items-center rounded-full bg-gradient-to-br text-xs font-bold', SIDE_STYLE[side])}>
                  {side === 'ct' ? 'CT' : 'T'}
                </span>
                {side === 'ct' ? t('games.ct') : t('games.t')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{t('games.payout')}</span>
          <span className="font-semibold text-emerald-400">
            x{COINFLIP_PAYOUT} · {formatMoney((Number(bet.replace(',', '.')) || 0) * COINFLIP_PAYOUT)}
          </span>
        </div>
        <button type="button" onClick={flip} disabled={flipping} className="btn btn-primary h-12 w-full text-base tracking-wider">
          {flipping ? t('games.flipping') : t('games.flip')}
        </button>
        <p className="text-center text-[11px] text-slate-500">{t('games.coinflipRules', { payout: COINFLIP_PAYOUT })}</p>
      </div>
    </div>
  );
}
