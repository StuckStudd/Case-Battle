import { CalendarCheck, Check } from 'lucide-react';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { DAILY_REWARDS } from '../utils/config';
import { launchConfetti } from '../utils/confetti';
import { formatMoney, roundMoney } from '../utils/format';
import { dailyMultiplier, getDailyStatus, levelFromXp } from '../utils/progression';
import { cx } from '../utils/ui';
import { Modal } from './Modal';
import { useToast } from './Toast';

export function DailyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, claimDailyReward } = useStore();
  const status = getDailyStatus(state);
  const multiplier = dailyMultiplier(levelFromXp(state.xp));
  // Days already collected in the current 7-day cycle.
  const claimedInCycle = status.available ? status.nextDay - 1 : status.nextDay;

  const claim = () => {
    const result = claimDailyReward();
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('buy');
    launchConfetti(1800);
    toast({ type: 'success', title: t('daily.claimed', { amount: formatMoney(result.value) }) });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
          <CalendarCheck size={28} />
        </div>
        <h2 className="font-display text-3xl font-bold text-white">{t('daily.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('daily.subtitle', { multiplier: `x${multiplier.toFixed(1)}` })}</p>

        <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAILY_REWARDS.map((base, i) => {
            const day = i + 1;
            const claimed = day <= claimedInCycle;
            const next = status.available && day === status.nextDay;
            return (
              <div
                key={day}
                className={cx(
                  'relative rounded-xl border p-2.5 text-center transition',
                  next
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_24px_-6px_rgb(var(--accent-rgb)/0.8)]'
                    : claimed
                      ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                      : 'border-line bg-white/[0.02]',
                  day === 7 && 'col-span-4 sm:col-span-1',
                )}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('daily.day', { day })}</div>
                <div className={cx('mt-1 font-display text-lg font-bold tabular-nums', next ? 'text-amber-300' : 'text-white')}>
                  {formatMoney(roundMoney(base * multiplier))}
                </div>
                {claimed && (
                  <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-emerald-500 text-black">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-slate-500">{t('daily.streak', { days: state.daily.streak })}</p>
        <button
          type="button"
          onClick={claim}
          disabled={!status.available}
          className="btn btn-primary mt-4 h-12 w-full text-base tracking-wider"
        >
          {status.available ? t('daily.claim', { amount: formatMoney(status.reward) }) : t('daily.comeBack')}
        </button>
      </div>
    </Modal>
  );
}
