import { Check, Swords, Timer, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BetInput } from '../components/BetInput';
import { PageHeader } from '../components/common';
import { useToast } from '../components/Toast';
import { localDay } from '../data/events';
import { useSound } from '../hooks/useSound';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { MatchBet } from '../types/types';
import { launchConfetti } from '../utils/confetti';
import { formatMoney, formatSignedMoney } from '../utils/format';
import {
  MATCH_MARGIN,
  MATCH_SLOT_MS,
  PICKEM_REWARDS,
  ROUNDS_TO_WIN,
  getTeam,
  matchSlot,
  matchesForSlot,
  pickemPair,
  pickemTeams,
} from '../utils/matchEngine';
import { cx, prefersReducedMotion } from '../utils/ui';

function TeamBadge({ id, size = 'md' }: { id: string | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const team = id ? getTeam(id) : undefined;
  const px = size === 'lg' ? 'size-14 text-sm' : size === 'sm' ? 'size-7 text-[9px]' : 'size-10 text-[11px]';
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-xl border-2 font-display font-bold', px)}
      style={{ borderColor: team?.color ?? '#334155', background: `${team?.color ?? '#334155'}22`, color: team?.color ?? '#94a3b8' }}
      title={team?.name}
    >
      {team?.tag ?? '?'}
    </span>
  );
}

function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- live match

function LiveMatch({ bet, onDone }: { bet: MatchBet; onDone: () => void }) {
  const t = useT();
  const sound = useSound();
  const { state } = useStore();
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  const step = prefersReducedMotion() || state.settings.fastRoulette ? 180 : 550;

  useEffect(() => {
    if (shown >= bet.rounds.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    const timer = window.setTimeout(() => {
      setShown((n) => n + 1);
      sound.play('tick');
    }, step);
    return () => window.clearTimeout(timer);
  }, [shown, bet.rounds.length, step, onDone, sound]);

  const played = bet.rounds.slice(0, shown);
  const scoreA = played.filter((r) => r === 'a').length;
  const scoreB = played.length - scoreA;
  const finished = shown >= bet.rounds.length;
  const won = bet.winner === bet.pick;

  return (
    <section className="panel p-5">
      <div className="mb-3 text-center text-xs uppercase tracking-wider text-slate-500">
        {bet.map} · {t('matches.firstTo', { n: ROUNDS_TO_WIN })}
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <TeamBadge id={bet.a} size="lg" />
          <span className={cx('text-sm font-semibold', bet.pick === 'a' ? 'text-amber-300' : 'text-white')}>{getTeam(bet.a)?.name}</span>
        </div>
        <div className="font-display text-5xl font-bold tabular-nums text-white">
          {scoreA}
          <span className="mx-2 text-slate-600">:</span>
          {scoreB}
        </div>
        <div className="flex flex-col items-center gap-2">
          <TeamBadge id={bet.b} size="lg" />
          <span className={cx('text-sm font-semibold', bet.pick === 'b' ? 'text-amber-300' : 'text-white')}>{getTeam(bet.b)?.name}</span>
        </div>
      </div>
      <div className="mx-auto mt-4 flex max-w-lg flex-wrap justify-center gap-1">
        {played.map((r, i) => (
          <span key={i} className="h-3 w-3 rounded-sm" style={{ background: getTeam(r === 'a' ? bet.a : bet.b)?.color }} />
        ))}
      </div>
      {finished && (
        <div className={cx('anim-pop mt-5 rounded-xl border p-3 text-center', won ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10')}>
          <div className="font-display text-xl font-bold text-white">{t('matches.winner', { name: getTeam(bet.winner === 'a' ? bet.a : bet.b)?.name ?? '' })}</div>
          <div className={won ? 'text-emerald-300' : 'text-rose-300'}>{won ? t('matches.youWon', { amount: formatMoney(bet.payout) }) : t('matches.youLost', { amount: formatMoney(bet.bet) })}</div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- bets

function Bets() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, betMatch, finishMatch } = useStore();
  const now = useNow();
  const slot = matchSlot(now);
  const matches = useMemo(() => matchesForSlot(slot), [slot]);
  const [selected, setSelected] = useState<{ id: string; pick: 'a' | 'b' } | null>(null);
  const [bet, setBet] = useState('10');
  const [live, setLive] = useState<{ bet: MatchBet; done: boolean } | null>(null);
  const liveRef = useRef(live);
  liveRef.current = live;

  // Leaving mid-match still pays out the decided result.
  useEffect(
    () => () => {
      if (liveRef.current && !liveRef.current.done) finishMatch();
    },
    [finishMatch],
  );

  const choice = selected ? matches.find((m) => m.id === selected.id) : undefined;
  const odds = choice && selected ? (selected.pick === 'a' ? choice.oddsA : choice.oddsB) : 0;
  const amount = Number(bet.replace(',', '.')) || 0;

  const place = () => {
    if (!selected) return;
    const result = betMatch(selected.id, selected.pick, amount);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('click');
    setLive({ bet: result.value, done: false });
  };

  const onDone = () => {
    finishMatch();
    setLive((l) => (l ? { ...l, done: true } : l));
    const b = liveRef.current?.bet;
    if (!b) return;
    if (b.winner === b.pick) {
      sound.play('win');
      launchConfetti(2000);
    } else sound.play('lose');
  };

  if (live) {
    return (
      <div className="space-y-4">
        <LiveMatch key={live.bet.id} bet={live.bet} onDone={onDone} />
        {live.done && (
          <button type="button" className="btn btn-primary h-12 w-full" onClick={() => (setLive(null), setSelected(null))}>
            {t('matches.next')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Timer size={14} /> {t('matches.newSlate', { time: mmss((slot + 1) * MATCH_SLOT_MS - now) })}
        </div>
        {matches.map((m) => (
          <div key={m.id} className="panel p-4">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">{m.map}</div>
            <div className="flex items-center gap-3">
              {(['a', 'b'] as const).map((side) => {
                const id = side === 'a' ? m.a : m.b;
                const active = selected?.id === m.id && selected.pick === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setSelected({ id: m.id, pick: side })}
                    className={cx(
                      'flex flex-1 items-center gap-3 rounded-xl border p-2 text-left transition',
                      side === 'b' && 'flex-row-reverse text-right',
                      active ? 'border-amber-400 bg-amber-400/10' : 'border-line hover:border-white/20',
                    )}
                  >
                    <TeamBadge id={id} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{getTeam(id)?.name}</div>
                      <div className="text-xs text-slate-500">{Math.round((side === 'a' ? m.pA : 1 - m.pA) * 100)}%</div>
                    </div>
                    <span className="rounded-lg bg-white/[0.06] px-2 py-1 font-display text-lg font-bold tabular-nums text-amber-300">
                      {(side === 'a' ? m.oddsA : m.oddsB).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="panel h-fit space-y-4 p-5">
        <div className="text-sm text-slate-400">
          {choice && selected ? (
            <>
              {t('matches.yourPick')} <span className="font-semibold text-white">{getTeam(selected.pick === 'a' ? choice.a : choice.b)?.name}</span> ·{' '}
              <span className="text-amber-300">x{odds.toFixed(2)}</span>
            </>
          ) : (
            t('matches.pickTeam')
          )}
        </div>
        <BetInput value={bet} onChange={setBet} max={state.balance} />
        <button type="button" className="btn btn-primary h-14 w-full text-lg" disabled={!selected || amount <= 0} onClick={place}>
          <Swords size={18} /> {selected ? t('matches.placeBet', { amount: formatMoney(amount * odds) }) : t('matches.pickTeam')}
        </button>
        <p className="text-center text-[11px] text-slate-500">{t('matches.rules', { margin: Math.round(MATCH_MARGIN * 100) })}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pick'em

const ROUND_LABELS = ['matches.qf', 'matches.sf', 'matches.final'] as const;
const COLUMNS = [
  [0, 1, 2, 3],
  [4, 5],
  [6],
];

function Pickem() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, lockPickem } = useStore();
  const now = useNow(30_000);
  const day = localDay(new Date(now));
  const teams = useMemo(() => pickemTeams(day), [day]);
  const locked = state.pickem?.day === day ? state.pickem : null;
  const [picks, setPicks] = useState<(string | undefined)[]>(Array(7).fill(undefined));
  const [revealed, setRevealed] = useState(locked ? 7 : 0);
  const shown = locked ? locked.picks : picks;

  useEffect(() => {
    if (!locked || revealed >= 7) return;
    const timer = window.setTimeout(() => setRevealed((n) => n + 1), prefersReducedMotion() ? 50 : 600);
    return () => window.clearTimeout(timer);
  }, [locked, revealed]);

  const pick = (slot: number, team: string) => {
    if (locked) return;
    setPicks((list) => {
      const next = [...list];
      next[slot] = team;
      // Later rounds that depended on the old pick are cleared.
      for (let s = 4; s < 7; s++) {
        if (next[s] && !pickemPair(teams, next, s).includes(next[s])) next[s] = undefined;
      }
      return next;
    });
  };

  const lock = () => {
    const result = lockPickem(picks as string[]);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    setRevealed(0);
    sound.play('click');
    window.setTimeout(() => {
      if (result.value.correct >= 5) launchConfetti(2500, 'gold');
      toast({ type: result.value.reward > 0 ? 'win' : 'info', title: t('matches.pickemResult', { correct: result.value.correct }), message: result.value.reward > 0 ? formatSignedMoney(result.value.reward) : undefined });
    }, prefersReducedMotion() ? 100 : 4300);
  };

  const done = locked && revealed >= 7;

  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <p className="text-sm text-slate-400">{t('matches.pickemHint')}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {COLUMNS.map((slots, col) => (
            <div key={col} className="flex flex-col gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t(ROUND_LABELS[col])}</div>
              <div className="flex flex-1 flex-col justify-around gap-3">
              {slots.map((slot) => {
                // While results are revealed, a later round shows the real finalists only once their matches are shown.
                const prerequisite = slot < 4 ? -1 : slot < 6 ? (slot - 4) * 2 + 1 : 5;
                const pairTeams = pickemPair(teams, locked ? (revealed > prerequisite ? locked.results : locked.picks) : picks, slot);
                const result = locked && revealed > slot ? locked.results[slot] : undefined;
                return (
                  <div key={slot} className="rounded-xl border border-line p-2">
                    {pairTeams.map((id, i) => {
                      const mine = shown[slot] === id && !!id;
                      const winner = result === id;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!!locked || !id}
                          onClick={() => id && pick(slot, id)}
                          className={cx(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                            mine && !result && 'bg-amber-400/15 text-amber-200',
                            result && winner && 'bg-emerald-500/15 text-emerald-200',
                            result && !winner && 'opacity-40',
                            !mine && !result && 'text-slate-300 hover:bg-white/5',
                          )}
                        >
                          <TeamBadge id={id} size="sm" />
                          <span className="flex-1 truncate">{id ? getTeam(id)?.name : t('matches.tbd')}</span>
                          {result && mine && (winner ? <Check size={14} className="text-emerald-400" /> : <X size={14} className="text-rose-400" />)}
                        </button>
                      );
                    })}
                    {locked && (
                      <div className="mt-1 px-2 text-[10px] text-slate-500">
                        {t('matches.yourPick')} {getTeam(locked.picks[slot])?.tag}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          ))}
        </div>

        {!locked ? (
          <button type="button" className="btn btn-primary mt-5 h-12 w-full" disabled={picks.some((p) => !p)} onClick={lock}>
            <Trophy size={17} /> {t('matches.lockPicks')}
          </button>
        ) : (
          <div className={cx('mt-5 rounded-xl border p-3 text-center', done ? 'border-amber-400/40 bg-amber-400/10' : 'border-line')}>
            {done ? (
              <>
                <div className="font-display text-xl font-bold text-white">{t('matches.pickemResult', { correct: locked.correct })}</div>
                <div className="text-amber-200">
                  {locked.reward > 0 ? `+${formatMoney(locked.reward)}` : t('matches.noReward')}
                  {locked.correct === 7 && ` · ${t('matches.perfectKey')}`}
                </div>
                <div className="mt-1 text-xs text-slate-500">{t('matches.pickemTomorrow')}</div>
              </>
            ) : (
              <div className="text-sm text-slate-400">{t('matches.playing')}</div>
            )}
          </div>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-2 font-display text-lg font-bold text-white">{t('matches.rewards')}</h2>
        <div className="grid grid-cols-4 gap-2 text-center text-sm sm:grid-cols-8">
          {PICKEM_REWARDS.map((r, correct) => (
            <div key={correct} className="rounded-lg border border-line p-2">
              <div className="text-xs text-slate-500">{correct}/7</div>
              <div className="font-semibold tabular-nums text-white">{r > 0 ? formatMoney(r) : '—'}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('matches.perfectHint')}</p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- page

export function MatchesPage() {
  const t = useT();
  const [tab, setTab] = useState<'bets' | 'pickem'>('bets');
  return (
    <div>
      <PageHeader title={t('matches.title')} subtitle={t('matches.subtitle')} />
      <div className="mb-5 flex gap-2" role="tablist">
        {(['bets', 'pickem'] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="chip px-4 py-2.5 text-sm" data-active={tab === id} onClick={() => setTab(id)}>
            {id === 'bets' ? <Swords size={15} /> : <Trophy size={15} />} {t(id === 'bets' ? 'matches.tabBets' : 'matches.tabPickem')}
          </button>
        ))}
      </div>
      {tab === 'bets' ? <Bets /> : <Pickem />}
    </div>
  );
}
