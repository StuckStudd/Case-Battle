import { Bomb, Gem } from 'lucide-react';
import { useState } from 'react';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { TowersDifficulty } from '../types/types';
import { TOWERS_FLOORS } from '../utils/config';
import { launchConfetti } from '../utils/confetti';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { TOWERS_LAYOUT, towersMultiplier } from '../utils/gamesEngine';
import { cx } from '../utils/ui';
import { BetInput } from './BetInput';
import { useToast } from './Toast';

const DIFFICULTIES: TowersDifficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Climb floors by picking a safe tile on each; bombs of every floor are decided when the game starts. */
export function Towers() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, startTowers, climbTowers, cashOutTowers } = useStore();
  const [bet, setBet] = useState('1');
  const [difficulty, setDifficulty] = useState<TowersDifficulty>('medium');
  // Tower shown after a game ends: every bomb plus the player's picks.
  const [last, setLast] = useState<{ bombs: number[][]; picks: number[]; hit: { floor: number; tile: number } | null } | null>(null);
  const game = state.pendingTowers;
  const mode = game?.difficulty ?? difficulty;
  const { tiles } = TOWERS_LAYOUT[mode];
  const floor = game?.picks.length ?? 0;
  const current = towersMultiplier(mode, floor);

  const start = () => {
    const result = startTowers(Number(bet.replace(',', '.')), difficulty);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    setLast(null);
    sound.play('click');
  };

  const pick = (tile: number) => {
    if (!game) return;
    const picksBefore = game.picks;
    const result = climbTowers(tile);
    if (!result.ok) return;
    const { hit, bombs, payout, multiplier } = result.value;
    if (hit) {
      sound.play('boom');
      setLast({ bombs: bombs ?? [], picks: picksBefore, hit: { floor: picksBefore.length, tile } });
      toast({ type: 'loss', title: t('towers.fell'), message: formatSignedMoney(-game.bet) });
      return;
    }
    sound.play('pop');
    if (bombs) {
      setLast({ bombs, picks: [...picksBefore, tile], hit: null });
      launchConfetti(2400);
      toast({ type: 'win', title: t('towers.top', { m: multiplier.toFixed(2) }), message: formatMoney(payout) });
    }
  };

  const cashOut = () => {
    if (!game) return;
    const picks = game.picks;
    const result = cashOutTowers();
    if (!result.ok) return;
    sound.play('cashout');
    setLast({ bombs: result.value.bombs, picks, hit: null });
    toast({ type: 'win', title: t('games.cashedOut', { m: current.toFixed(2) }), message: formatSignedMoney(result.value.payout - game.bet) });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="panel p-4">
        <div className="mx-auto flex max-w-md flex-col-reverse gap-2">
          {Array.from({ length: TOWERS_FLOORS }, (_, f) => {
            const active = !!game && f === floor;
            const cleared = game ? f < floor : !!last && f < last.picks.length;
            const pickedTile = game ? game.picks[f] : last?.picks[f];
            const bombs = !game ? last?.bombs[f] : undefined;
            return (
              <div key={f} className="flex items-center gap-2">
                <div className={cx('w-16 shrink-0 text-right text-xs font-bold tabular-nums', active ? 'text-amber-300' : cleared ? 'text-emerald-400' : 'text-slate-500')}>
                  x{towersMultiplier(mode, f + 1).toFixed(2)}
                </div>
                <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))` }}>
                  {Array.from({ length: tiles }, (_, tile) => {
                    const isPick = pickedTile === tile && (cleared || last?.hit?.floor === f);
                    const isBomb = bombs?.includes(tile);
                    const isHit = last?.hit?.floor === f && last.hit.tile === tile;
                    return (
                      <button
                        key={tile}
                        type="button"
                        disabled={!active}
                        onClick={() => pick(tile)}
                        aria-label={t('towers.tile', { floor: f + 1, tile: tile + 1 })}
                        className={cx(
                          'grid h-12 place-items-center rounded-xl border transition',
                          isHit
                            ? 'anim-shake border-rose-500/60 bg-rose-500/30 text-rose-300'
                            : isPick
                              ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                              : isBomb
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                : active
                                  ? 'border-amber-400/40 bg-white/[0.06] hover:-translate-y-0.5 hover:bg-amber-400/15'
                                  : 'border-line bg-white/[0.02]',
                        )}
                      >
                        {isHit || isBomb ? <Bomb size={20} /> : isPick ? <Gem size={20} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <BetInput value={bet} onChange={setBet} max={state.balance} disabled={!!game} />
        <div>
          <div className="mb-1.5 text-xs text-slate-400">{t('towers.difficulty')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button key={d} type="button" className="chip justify-center" data-active={mode === d} disabled={!!game} onClick={() => setDifficulty(d)}>
                {t(`towers.${d}`)}
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
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('towers.topPrize')}</div>
            <div className="font-display text-lg font-bold text-emerald-400">x{towersMultiplier(mode, TOWERS_FLOORS).toFixed(2)}</div>
          </div>
        </div>
        {game ? (
          <button type="button" onClick={cashOut} disabled={floor === 0} className="btn btn-success h-14 w-full text-lg">
            {t('games.cashOutFor', { amount: formatMoney(game.bet * current) })}
          </button>
        ) : (
          <button type="button" onClick={start} className="btn btn-primary h-14 w-full text-lg tracking-wider">
            {t('games.startRound')}
          </button>
        )}
        <p className="text-center text-[11px] text-slate-500">{t('towers.rules')}</p>
      </div>
    </div>
  );
}
