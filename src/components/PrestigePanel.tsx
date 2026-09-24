import { Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { prestigeDailyMultiplier, prestigeFrame, prestigeRequirement, prestigeStartBalance } from '../data/extras';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { launchConfetti } from '../utils/confetti';
import { formatMoney } from '../utils/format';
import { getNetWorth } from '../utils/progression';
import { PRESTIGE_CHANCE_MAX, prestigeBonus } from '../utils/upgradeEngine';
import { Modal } from './Modal';
import { useToast } from './Toast';

/** Progress to the next prestige, current bonuses and the reset button with a confirmation. */
export function PrestigePanel() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, prestige } = useStore();
  const [confirming, setConfirming] = useState(false);
  const level = state.prestige;
  const need = prestigeRequirement(level);
  const worth = getNetWorth(state);
  const ready = worth >= need;
  const next = level + 1;

  const bonuses = (p: number) => [
    t('prestige.bonusChance', { percent: (prestigeBonus(p) * 100).toFixed(0) }),
    t('prestige.bonusDaily', { percent: Math.round((prestigeDailyMultiplier(p) - 1) * 100) }),
    t('prestige.bonusStart', { amount: formatMoney(prestigeStartBalance(p)) }),
  ];

  const confirm = () => {
    const result = prestige();
    setConfirming(false);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('rare');
    launchConfetti(3500, 'gold');
    toast({ type: 'win', title: t('prestige.done', { n: result.value }) });
  };

  return (
    <section className="panel overflow-hidden border-fuchsia-400/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Star size={18} className="text-fuchsia-300" /> {t('prestige.title')}
            <span className="rounded-full bg-fuchsia-500/20 px-2 text-sm text-fuchsia-200">★{level}</span>
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">{t('prestige.hint')}</p>
        </div>
        <button type="button" disabled={!ready} onClick={() => setConfirming(true)} className="btn btn-primary h-11 px-5">
          <Sparkles size={16} /> {t('prestige.button', { n: next })}
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>{t('prestige.progress')}</span>
          <span className="tabular-nums text-white">
            {formatMoney(worth)} / {formatMoney(need)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-300" style={{ width: `${Math.min(100, (worth / need) * 100)}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">{t('prestige.now')}</div>
          <ul className="space-y-0.5 text-sm text-slate-300">{level > 0 ? bonuses(level).map((b) => <li key={b}>• {b}</li>) : <li>—</li>}</ul>
        </div>
        <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/[0.06] p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-fuchsia-300">{t('prestige.after', { n: next })}</div>
          <ul className="space-y-0.5 text-sm text-slate-200">
            {bonuses(next).map((b) => (
              <li key={b}>• {b}</li>
            ))}
            {prestigeFrame(next) && <li>• {t('prestige.bonusFrame')}</li>}
          </ul>
          {prestigeBonus(next) >= PRESTIGE_CHANCE_MAX && <div className="mt-1 text-[11px] text-slate-500">{t('prestige.chanceCap')}</div>}
        </div>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} size="sm">
        <h2 className="font-display text-2xl font-bold text-white">{t('prestige.confirmTitle', { n: next })}</h2>
        <p className="mt-2 text-sm text-slate-300">{t('prestige.confirmText', { amount: formatMoney(prestigeStartBalance(next)) })}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost h-11" onClick={() => setConfirming(false)}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary h-11" onClick={confirm}>
            {t('prestige.confirm')}
          </button>
        </div>
      </Modal>
    </section>
  );
}
