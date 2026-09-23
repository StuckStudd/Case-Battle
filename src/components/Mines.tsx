import { Bomb, Gem } from 'lucide-react';
import { useState } from 'react';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { MINES_GRID } from '../utils/config';
import { launchConfetti } from '../utils/confetti';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { minesMultiplier } from '../utils/gamesEngine';
import { cx } from '../utils/ui';
import { BetInput } from './BetInput';
import { useToast } from './Toast';

const PRESETS = [1, 3, 5, 10, 24];

export function Mines() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, startMines, revealMine, cashOutMines } = useStore();
  const [bet, setBet] = useState('1');
  const [count, setCount] = useState(3);
  // Board shown after a game ends: all mines plus the tiles the player opened.
  const [lastBoard, setLastBoard] = useState<{ mines: number[]; revealed: number[]; hit: number | null } | null>(null);
  const game = state.pendingMines;
  const mineCount = game ? game.mines.length : count;
  const picks = game?.revealed.length ?? 0;
  const current = minesMultiplier(mineCount, picks);
  const next = minesMultiplier(mineCount, picks + 1);

  const start = () => {
    const result = startMines(Number(bet.replace(',', '.')), count);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    setLastBoard(null);
    sound.play('click');
  };

  const reveal = (cell: number) => {
    if (!game) return;
    const revealedBefore = game.revealed;
    const result = revealMine(cell);
    if (!result.ok) return;
    const { hit, mines, payout, multiplier } = result.value;
    if (hit) {
      sound.play('boom');
      setLastBoard({ mines: mines ?? [], revealed: revealedBefore, hit: cell });
      toast({ type: 'loss', title: t('mines.boom'), message: formatSignedMoney(-game.bet) });
      return;
    }
    sound.play('pop');
    if (mines) {
      // Board cleared: automatic cash-out.
      setLastBoard({ mines, revealed: [...revealedBefore, cell], hit: null });
      launchConfetti(2000);
      toast({ type: 'win', title: t('games.cashedOut', { m: multiplier.toFixed(2) }), message: formatMoney(payout) });
    }
  };

  const cashOut = () => {
    if (!game) return;
    const revealed = game.revealed;
    const result = cashOutMines();
    if (!result.ok) return;
    sound.play('cashout');
    setLastBoard({ mines: result.value.mines, revealed, hit: null });
    toast({ type: 'win', title: t('games.cashedOut', { m: current.toFixed(2) }), message: formatSignedMoney(result.value.payout - game.bet) });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="panel grid place-items-center p-4">
        <div className="grid w-full max-w-md grid-cols-5 gap-2">
          {Array.from({ length: MINES_GRID }, (_, cell) => {
            const opened = game?.revealed.includes(cell) || lastBoard?.revealed.includes(cell);
            const isMine = !game && lastBoard?.mines.includes(cell);
            const isHit = lastBoard?.hit === cell;
            return (
              <button
                key={cell}
                type="button"
                disabled={!game || game.revealed.includes(cell)}
                onClick={() => reveal(cell)}
                aria-label={t('mines.tile', { n: cell + 1 })}
                className={cx(
                  'grid aspect-square place-items-center rounded-xl border transition',
                  opened && !isMine
                    ? 'anim-pop border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                    : isMine
                      ? cx('border-rose-500/40 bg-rose-500/10 text-rose-400', isHit && 'anim-shake bg-rose-500/30')
                      : game
                        ? 'border-line bg-white/[0.04] hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-white/[0.08]'
                        : 'border-line bg-white/[0.02]',
                )}
              >
                {opened && !isMine ? <Gem size={26} /> : isMine ? <Bomb size={26} /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <BetInput value={bet} onChange={setBet} max={state.balance} disabled={!!game} />
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-slate-400">
            <span>{t('mines.count')}</span>
            <span className="font-semibold text-white">{mineCount}</span>
          </div>
          <div className="flex gap-1.5">
            {PRESETS.map((n) => (
              <button key={n} type="button" className="chip flex-1 justify-center" data-active={count === n} disabled={!!game} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('mines.current')}</div>
            <div className="font-display text-lg font-bold text-white">x{current.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('mines.next')}</div>
            <div className="font-display text-lg font-bold text-emerald-400">x{next.toFixed(2)}</div>
          </div>
        </div>
        {game ? (
          <button type="button" onClick={cashOut} disabled={picks === 0} className="btn btn-success h-14 w-full text-lg">
            {t('games.cashOutFor', { amount: formatMoney(game.bet * current) })}
          </button>
        ) : (
          <button type="button" onClick={start} className="btn btn-primary h-14 w-full text-lg tracking-wider">
            {t('games.startRound')}
          </button>
        )}
        <p className="text-center text-[11px] text-slate-500">{t('mines.rules')}</p>
      </div>
    </div>
  );
}
