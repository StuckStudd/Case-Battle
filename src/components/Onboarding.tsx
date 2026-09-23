import { ArrowUpCircle, Gift, ShoppingBag, Sparkles } from 'lucide-react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { STARTING_BALANCE } from '../utils/config';
import { formatMoney } from '../utils/format';
import { cx } from '../utils/ui';
import { Logo } from './Logo';
import { Modal } from './Modal';

export function SplashScreen({ leaving }: { leaving: boolean }) {
  const t = useT();
  return (
    <div
      className={cx(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-ink transition-opacity duration-500',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      aria-hidden={leaving}
    >
      <div className="absolute size-72 rounded-full bg-amber-500/20 blur-3xl anim-pulse-glow" />
      <div className="anim-pop relative">
        <Logo large />
      </div>
      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-white/5">
        <div className="anim-loading-bar absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500" />
      </div>
      <p className="relative text-xs uppercase tracking-[0.3em] text-slate-500">{t('splash.loading')}</p>
    </div>
  );
}

const STEPS: { icon: typeof ShoppingBag; title: TKey; text: TKey }[] = [
  { icon: ShoppingBag, title: 'welcome.step1Title', text: 'welcome.step1Text' },
  { icon: ArrowUpCircle, title: 'welcome.step2Title', text: 'welcome.step2Text' },
  { icon: Sparkles, title: 'welcome.step3Title', text: 'welcome.step3Text' },
];

export function WelcomeModal({ open, onStart }: { open: boolean; onStart: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onStart} dismissible={false} size="md">
      <div className="text-center">
        <div className="relative mx-auto mb-5 grid size-20 place-items-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl anim-pulse-glow" />
          <div className="anim-float relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-600/40">
            <Gift size={30} />
          </div>
        </div>
        <h2 className="font-display text-3xl font-bold text-white">{t('welcome.title')}</h2>
        <p className="mt-2 text-slate-400">
          {t('welcome.received', { amount: formatMoney(STARTING_BALANCE) })}
        </p>

        <div className="mt-6 grid gap-2 text-left sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="rounded-xl border border-line bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-2 text-amber-300">
                <Icon size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('welcome.step', { n: i + 1 })}</span>
              </div>
              <div className="text-sm font-semibold text-white">{t(title)}</div>
              <div className="text-xs text-slate-500">{t(text)}</div>
            </div>
          ))}
        </div>

        <button type="button" onClick={onStart} className="btn btn-primary mt-6 h-12 w-full text-base tracking-wide">
          {t('welcome.start')}
        </button>
        <p className="mt-3 text-[11px] text-slate-600">
          {t('common.disclaimer')}
        </p>
      </div>
    </Modal>
  );
}
