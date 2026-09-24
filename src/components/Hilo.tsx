import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { launchConfetti } from '../utils/confetti';
import { formatMoney, formatPercent, formatSignedMoney } from '../utils/format';
import { hiloChance, hiloStep } from '../utils/gamesEngine';
import type { HiloGuess } from '../utils/gamesEngine';
import { cx } from '../utils/ui';
import { BetInput } from './BetInput';
import { useToast } from './Toast';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

function Card({ value, seed, faded, small, highlight }: { value: number; seed: number; faded?: boolean; small?: boolean; highlight?: 'win' | 'loss' }) {
  const suit = SUITS[seed % SUITS.length];
  const red = suit === '♥' || suit === '♦';
  return (
    <div
      className={cx(
        'anim-pop relative grid aspect-[5/7] w-full place-items-center border-2',
        small ? 'rounded-lg' : 'rounded-2xl',
        'bg-gradient-to-br from-slate-100 to-slate-300 font-display shadow-xl',
        red ? 'text-rose-600' : 'text-slate-900',
        highlight === 'win' ? 'border-emerald-400' : highlight === 'loss' ? 'border-rose-500' : 'border-white/60',
        faded && 'opacity-50',
      )}
    >
      {!small && <span className="absolute left-2 top-1.5 text-sm font-bold">{RANKS[value - 1]}</span>}
      <span className={small ? 'text-sm font-bold' : 'text-4xl font-bold'}>
        {RANKS[value - 1]}
        {suit}
      </span>
      {!small && <span className="absolute bottom-1.5 right-2 rotate-180 text-sm font-bold">{RANKS[value - 1]}</span>}
    </div>
  );
}

/** Guess whether the next card is higher or lower. The deck is drawn when the game starts. */
export function Hilo() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, startHilo, guessHilo, cashOutHilo } = useStore();
  const [bet, setBet] = useState('1');
  // Cards of the current or last game that are face up, newest last.
  const [trail, setTrail] = useState<{ value: number; result?: 'win' | 'loss' }[]>([]);
  const game = state.pendingHilo;
  const card = game ? game.cards[game.index] : trail[trail.length - 1]?.value;

  const start = () => {
    const result = startHilo(Number(bet.replace(',', '.')));
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    setTrail([{ value: result.value.cards[0] }]);
    sound.play('click');
  };

  const guess = (g: HiloGuess) => {
    if (!game) return;
    const result = guessHilo(g);
    if (!result.ok) return;
    const { win, card: next, payout, multiplier } = result.value;
    setTrail((list) => [...list, { value: next, result: win ? 'win' : 'loss' }]);
    if (!win) {
      sound.play('lose');
      toast({ type: 'loss', title: t('hilo.wrong'), message: formatSignedMoney(-game.bet) });
      return;
    }
    sound.play('pop');
    if (payout > 0) {
      launchConfetti(2000);
      toast({ type: 'win', title: t('games.cashedOut', { m: multiplier.toFixed(2) }), message: formatMoney(payout) });
    }
  };

  const cashOut = () => {
    if (!game) return;
    const result = cashOutHilo();
    if (!result.ok) return;
    sound.play('cashout');
    toast({ type: 'win', title: t('games.cashedOut', { m: game.multiplier.toFixed(2) }), message: formatSignedMoney(result.value - game.bet) });
  };

  // Resuming after a reload: show the face-up card.
  const shown = game && trail.length === 0 ? [{ value: game.cards[game.index] }] : trail;
  const options: [HiloGuess, typeof ArrowUp][] = [
    ['higher', ArrowUp],
    ['lower', ArrowDown],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="panel p-5">
        <div className="mx-auto grid max-w-xs place-items-center">
          <div className="w-40">{card ? <Card value={card} seed={shown.length} highlight={shown[shown.length - 1]?.result} /> : <div className="aspect-[5/7] w-full rounded-2xl border-2 border-dashed border-white/10" />}</div>
        </div>
        {game && (
          <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2">
            {options.map(([g, Icon]) => {
              const chance = hiloChance(game.cards[game.index], g);
              const disabled = chance >= 1;
              return (
                <button key={g} type="button" disabled={disabled} onClick={() => guess(g)} className={cx('btn h-16 flex-col gap-0.5', g === 'higher' ? 'btn-success' : 'btn-danger')}>
                  <span className="flex items-center gap-1 font-bold">
                    <Icon size={18} /> {t(`hilo.${g}`)}
                  </span>
                  <span className="text-xs opacity-80">
                    {formatPercent(chance * 100, 1)} · x{disabled ? '—' : hiloStep(game.cards[game.index], g).toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {shown.length > 1 && (
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
            {shown.slice(0, -1).map((c, i) => (
              <div key={i} className="w-12 shrink-0">
                <Card value={c.value} seed={i + 1} faded small highlight={c.result} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel space-y-4 p-5">
        <BetInput value={bet} onChange={setBet} max={state.balance} disabled={!!game} />
        <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-sm">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('mines.current')}</div>
          <div className="font-display text-lg font-bold text-white">x{(game?.multiplier ?? 1).toFixed(2)}</div>
        </div>
        {game ? (
          <button type="button" onClick={cashOut} disabled={game.index === 0} className="btn btn-success h-14 w-full text-lg">
            {t('games.cashOutFor', { amount: formatMoney(game.bet * game.multiplier) })}
          </button>
        ) : (
          <button type="button" onClick={start} className="btn btn-primary h-14 w-full text-lg tracking-wider">
            {t('games.startRound')}
          </button>
        )}
        <p className="text-center text-[11px] text-slate-500">{t('hilo.rules')}</p>
      </div>
    </div>
  );
}
