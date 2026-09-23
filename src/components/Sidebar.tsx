import { ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { Page } from '../types/types';
import { formatMoney, formatPercent } from '../utils/format';
import { getInventoryValue, getWinRate } from '../utils/stats';
import { cx } from '../utils/ui';
import { LevelBadge } from './LevelBadge';
import { NAV_ITEMS } from './navigation';

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ page, onNavigate }: SidebarProps) {
  const t = useT();
  const { state } = useStore();

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line px-3 py-5 lg:flex">
      <div className="px-1">
        <LevelBadge />
      </div>
      <nav className="flex flex-col gap-0.5" aria-label={t('nav.main')}>
        {NAV_ITEMS.map(({ page: target, label, icon: Icon }) => {
          const active = page === target;
          return (
            <button
              key={target}
              type="button"
              onClick={() => onNavigate(target)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                active
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/5 text-white'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-amber-400 to-yellow-500 shadow-[0_0_12px_rgb(var(--accent-rgb)/0.9)]" />
              )}
              <Icon size={18} className={cx('transition', active ? 'text-amber-300' : 'group-hover:text-slate-200')} />
              {t(label)}
              {target === 'inventory' && state.inventory.length > 0 && (
                <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300">
                  {state.inventory.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="panel space-y-3 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t('sidebar.stash')}</div>
        <SidebarStat label={t('sidebar.inventoryValue')} value={formatMoney(getInventoryValue(state.inventory))} />
        <SidebarStat label={t('sidebar.items')} value={String(state.inventory.length)} />
        <SidebarStat label={t('sidebar.upgrades')} value={String(state.stats.totalUpgrades)} />
        <SidebarStat label={t('sidebar.winRate')} value={formatPercent(getWinRate(state.stats), 1)} />
      </div>

      <div className="mt-auto flex items-start gap-2 rounded-xl bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400/70" />
        {t('common.disclaimer')}
      </div>
    </aside>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-display font-bold tabular-nums text-white">{value}</span>
    </div>
  );
}
