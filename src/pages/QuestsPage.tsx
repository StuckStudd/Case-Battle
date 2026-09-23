import { CalendarDays, Check, Frame, Gift, KeyRound, Lock, Target, Trophy } from 'lucide-react';
import { PageHeader } from '../components/common';
import { useToast } from '../components/Toast';
import { getCapsule } from '../data/capsules';
import { getCase } from '../data/cases';
import { dailyQuests, weeklyQuests } from '../data/quests';
import type { QuestDef } from '../data/quests';
import { SEASON_REWARDS } from '../data/season';
import type { SeasonReward } from '../data/season';
import { useSound } from '../hooks/useSound';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';
import { questProgress, seasonTier } from '../store/transitions';
import type { QuestPeriod } from '../store/transitions';
import { FIRST_SEASON_ID, SEASON_DAYS, SEASON_TIER_XP } from '../utils/config';
import { launchConfetti } from '../utils/confetti';
import { formatMoney } from '../utils/format';
import { currentDay } from '../utils/progression';
import { cx } from '../utils/ui';

function QuestRow({ quest, period }: { quest: QuestDef; period: QuestPeriod }) {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, claimQuest } = useStore();
  const progress = Math.min(quest.goal, questProgress(state, period, quest.stat));
  const claimed = state.quests.claimed.includes(`${period === 'daily' ? 'd' : 'w'}:${quest.id}`);
  const ready = progress >= quest.goal && !claimed;
  const money = quest.stat === 'totalWagered';

  return (
    <div className={cx('flex items-center gap-3 rounded-xl border p-3', claimed ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : ready ? 'border-amber-400/60 bg-amber-400/[0.06]' : 'border-line bg-white/[0.02]')}>
      <div className={cx('grid size-10 shrink-0 place-items-center rounded-xl', claimed ? 'bg-emerald-500 text-black' : 'bg-white/5 text-amber-300')}>
        {claimed ? <Check size={18} /> : <Target size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{t(`quest.${quest.id}` as TKey, { goal: quest.goal })}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${(progress / quest.goal) * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {money ? `${formatMoney(progress)} / ${formatMoney(quest.goal)}` : `${progress}/${quest.goal}`}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs font-semibold text-emerald-400">+{formatMoney(quest.reward)}</div>
        <div className="text-[10px] text-slate-500">+{quest.xp} XP</div>
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          const result = claimQuest(period, quest.id);
          if (!result.ok) {
            toast({ type: 'error', title: t(`error.${result.error}`) });
            return;
          }
          sound.play('cashout');
          toast({ type: 'success', title: t('quests.claimed', { amount: formatMoney(result.value) }) });
        }}
        className="btn btn-primary h-9 shrink-0 px-3 text-xs"
      >
        {claimed ? t('quests.done') : t('quests.claim')}
      </button>
    </div>
  );
}

function RewardLabel({ reward }: { reward: SeasonReward }) {
  const t = useT();
  if (reward.type === 'money') return <>{formatMoney(reward.amount)}</>;
  if (reward.type === 'frame') return <>{t('pass.frame', { name: t(`frame.${reward.id}` as TKey) })}</>;
  const name = getCase(reward.id)?.name ?? getCapsule(reward.id)?.name ?? reward.id;
  return <>{name}</>;
}

export function QuestsPage() {
  const t = useT();
  const toast = useToast();
  const { state, claimTier } = useStore();
  const tier = seasonTier(state);
  const xpInTier = Math.max(0, state.xp - state.season.startXp) - tier * SEASON_TIER_XP;
  const daysLeft = SEASON_DAYS - (currentDay() % SEASON_DAYS);
  const daily = dailyQuests(state.quests.day);
  const weekly = weeklyQuests(state.quests.week);

  return (
    <div className="space-y-6">
      <PageHeader title={t('quests.title')} subtitle={t('quests.subtitle')} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <CalendarDays size={18} className="text-amber-300" /> {t('quests.daily')}
          </h2>
          <div className="space-y-2">
            {daily.map((q) => (
              <QuestRow key={q.id} quest={q} period="daily" />
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <Trophy size={18} className="text-amber-300" /> {t('quests.weekly')}
          </h2>
          <div className="space-y-2">
            {weekly.map((q) => (
              <QuestRow key={q.id} quest={q} period="weekly" />
            ))}
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <Gift size={20} className="text-amber-300" /> {t('pass.title', { season: Math.max(1, state.season.id - FIRST_SEASON_ID + 1) })}
            </h2>
            <p className="text-sm text-slate-400">{t('pass.subtitle', { days: daysLeft })}</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{t('pass.tier', { tier })}</span>
              <span className="tabular-nums">
                {tier >= SEASON_REWARDS.length ? '—' : `${xpInTier}/${SEASON_TIER_XP} XP`}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${Math.min(100, (xpInTier / SEASON_TIER_XP) * 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {SEASON_REWARDS.map((reward, i) => {
            const n = i + 1;
            const unlocked = n <= tier;
            const claimed = state.season.claimed.includes(n);
            const Icon = reward.type === 'money' ? Gift : reward.type === 'frame' ? Frame : KeyRound;
            return (
              <div
                key={n}
                className={cx(
                  'flex w-28 shrink-0 flex-col items-center rounded-xl border p-2.5 text-center',
                  claimed ? 'border-emerald-500/40 bg-emerald-500/[0.05]' : unlocked ? 'border-amber-400 bg-amber-400/10' : 'border-line bg-white/[0.02] opacity-70',
                )}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('pass.tierShort', { tier: n })}</div>
                <div className={cx('my-2 grid size-10 place-items-center rounded-xl', reward.type === 'money' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300')}>
                  {unlocked ? <Icon size={20} /> : <Lock size={16} />}
                </div>
                <div className="line-clamp-2 min-h-8 text-[11px] font-semibold text-white">
                  <RewardLabel reward={reward} />
                </div>
                <button
                  type="button"
                  disabled={!unlocked || claimed}
                  onClick={() => {
                    const result = claimTier(n);
                    if (!result.ok) {
                      toast({ type: 'error', title: t(`error.${result.error}`) });
                      return;
                    }
                    launchConfetti(1500);
                    toast({ type: 'success', title: t('pass.claimed', { tier: n }) });
                  }}
                  className="btn btn-primary mt-2 h-7 w-full text-[11px]"
                >
                  {claimed ? <Check size={13} /> : t('quests.claim')}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
