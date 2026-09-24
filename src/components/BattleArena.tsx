import { Crown, Swords } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CASES, getCaseTable } from '../data/cases';
import type { CaseDef } from '../data/cases';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { BattleOutcome } from '../store/transitions';
import { rollDrop } from '../utils/dropTable';
import { celebrate } from '../utils/effects';
import { formatMoney } from '../utils/format';
import { levelFromXp } from '../utils/progression';
import { cx } from '../utils/ui';
import { CaseRoulette } from './CaseRoulette';
import { useToast } from './Toast';

interface Running {
  id: number;
  outcome: BattleOutcome;
  def: CaseDef;
  round: number;
  finished: number;
  revealedRounds: number;
}

export function BattleArena() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, battle, finishBattle } = useStore();
  const level = levelFromXp(state.xp);
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [bots, setBots] = useState(1);
  const [rounds, setRounds] = useState(1);
  const [run, setRunState] = useState<Running | null>(null);
  const runRef = useRef<Running | null>(null);
  const setRun = (next: Running | null) => {
    runRef.current = next;
    setRunState(next);
  };
  const def = CASES.find((c) => c.id === caseId) ?? CASES[0];
  const table = useMemo(() => getCaseTable(def), [def]);
  const cost = def.price * rounds;
  const nextTimer = useRef(0);

  // Leaving mid-battle still delivers held winnings.
  useEffect(
    () => () => {
      window.clearTimeout(nextTimer.current);
      finishBattle();
    },
    [finishBattle],
  );

  const start = () => {
    const result = battle(def.id, bots, rounds);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('click');
    setRun({ id: Date.now(), outcome: result.value, def, round: 0, finished: 0, revealedRounds: 0 });
  };

  const onRowFinished = () => {
    const current = runRef.current;
    if (!current) return;
    const finished = current.finished + 1;
    if (finished < current.outcome.players.length) {
      setRun({ ...current, finished });
      return;
    }
    // Every player revealed this round: move on or finish.
    const revealedRounds = current.round + 1;
    setRun({ ...current, finished, revealedRounds });
    if (revealedRounds < current.outcome.players[0].drops.length) {
      nextTimer.current = window.setTimeout(() => {
        const latest = runRef.current;
        if (latest) setRun({ ...latest, round: latest.round + 1, finished: 0 });
      }, 700);
    } else {
      finishBattle();
      const you = current.outcome.players[0];
      if (current.outcome.won) {
        const best = [...current.outcome.players.flatMap((p) => p.drops)].sort((a, b) => b.price - a.price)[0];
        celebrate(best, state.settings.soundEnabled);
      } else {
        sound.play('lose');
      }
      toast({
        type: current.outcome.won ? 'win' : 'loss',
        title: current.outcome.won ? t('battle.won') : t('battle.lost'),
        message: `${formatMoney(you.total)}`,
      });
    }
  };

  const totalsSoFar = (index: number) =>
    run ? run.outcome.players[index].drops.slice(0, run.revealedRounds).reduce((sum, s) => sum + s.price, 0) : 0;
  const done = run && run.revealedRounds === run.outcome.players[0].drops.length;

  return (
    <div className="space-y-4">
      <section className="panel grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-400">
            {t('battle.case')}
            <select className="input mt-1" value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={!!run && !done}>
              {(['premium', 'official', 'souvenir'] as const).map((kind) => (
                <optgroup key={kind} label={t(`cases.${kind}`)}>
                  {CASES.filter((c) => c.kind === kind).map((c) => (
                    <option key={c.id} value={c.id} disabled={level < c.minLevel}>
                      {c.name} — {formatMoney(c.price)}
                      {level < c.minLevel ? ` (${t('cases.requiresLevel', { level: c.minLevel })})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="text-xs text-slate-400">
            {t('battle.opponents')}
            <div className="mt-1 flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" className="chip flex-1 justify-center" data-active={bots === n} onClick={() => setBots(n)} disabled={!!run && !done}>
                  1v{n}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {t('battle.rounds')}
            <div className="mt-1 flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" className="chip flex-1 justify-center" data-active={rounds === n} onClick={() => setRounds(n)} disabled={!!run && !done}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button type="button" onClick={start} disabled={!!run && !done} className="btn btn-primary h-12 px-6 text-base">
          <Swords size={18} /> {t('battle.start', { price: formatMoney(cost) })}
        </button>
      </section>
      <p className="text-center text-xs text-slate-500">{t('battle.rules')}</p>

      {run && (
        <section className="panel space-y-3 p-3 sm:p-4">
          <div className="text-center text-sm text-slate-400">
            {done ? t('battle.finished') : t('battle.round', { round: run.round + 1, total: run.outcome.players[0].drops.length })}
          </div>
          {run.outcome.players.map((player, index) => {
            const isWinner = done && run.outcome.winner === index;
            return (
              <div
                key={index}
                className={cx(
                  'rounded-2xl border p-2 transition',
                  isWinner ? 'border-amber-400 bg-amber-400/[0.06]' : 'border-line',
                  done && !isWinner && 'opacity-60',
                )}
              >
                <div className="mb-1.5 flex items-center justify-between px-1 text-sm">
                  <span className={cx('font-semibold', player.isYou ? 'text-amber-300' : 'text-white')}>
                    {isWinner && <Crown size={14} className="mr-1 inline text-amber-300" />}
                    {player.isYou ? state.nickname || t('battle.you') : player.name}
                  </span>
                  <span className="font-display font-bold tabular-nums text-white">{formatMoney(totalsSoFar(index))}</span>
                </div>
                {!done ? (
                  <CaseRoulette
                    key={`${run.id}-${run.round}-${index}`}
                    winner={player.drops[run.round]}
                    filler={() => rollDrop(table)}
                    durationMs={state.settings.fastRoulette ? 1400 : 2600}
                    onTick={() => index === 0 && sound.play('tick')}
                    onFinish={onRowFinished}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {player.drops.map((s, i) => (
                      <span key={i} className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">
                        {s.name} · <span className="tabular-nums text-white">{formatMoney(s.price)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
