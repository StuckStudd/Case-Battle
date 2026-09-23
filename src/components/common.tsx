import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../utils/ui';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-wide text-white sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'anim-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-300 ring-1 ring-amber-400/20">
        <Icon size={26} />
      </div>
      <h3 className="font-display text-xl font-bold text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'win' | 'loss' | 'accent';
  hint?: ReactNode;
}

const TONES = {
  default: 'text-white',
  win: 'text-emerald-400',
  loss: 'text-rose-400',
  accent: 'text-gradient',
};

export function StatCard({ label, value, icon: Icon, tone = 'default', hint }: StatCardProps) {
  return (
    <div className="panel anim-fade-up relative overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        {Icon && <Icon size={16} className="text-slate-600" />}
      </div>
      <div className={cx('mt-2 font-display text-2xl font-bold tabular-nums sm:text-3xl', TONES[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-7 w-12 shrink-0 rounded-full border transition-colors',
        checked ? 'border-amber-400/60 bg-gradient-to-r from-amber-500 to-yellow-500' : 'border-white/10 bg-white/5',
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 size-5.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
