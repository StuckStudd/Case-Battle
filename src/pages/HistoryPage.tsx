import { ArrowUpCircle, History } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, PageHeader, StatCard } from '../components/common';
import { UpgradeHistory } from '../components/UpgradeHistory';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { Page, UpgradeResult } from '../types/types';
import { formatPercent, formatSignedMoney } from '../utils/format';
import { getWinRate } from '../utils/stats';

const PAGE_SIZE = 25;

export function HistoryPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const t = useT();
  const { state } = useStore();
  const [filter, setFilter] = useState<UpgradeResult | 'all'>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const entries = useMemo(
    () => (filter === 'all' ? state.history : state.history.filter((e) => e.result === filter)),
    [state.history, filter],
  );
  const { stats } = state;

  return (
    <div>
      <PageHeader title={t('nav.history')} subtitle={t('history.subtitle')} />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('stats.totalUpgrades')} value={stats.totalUpgrades} />
        <StatCard label={t('stats.wins')} value={stats.wins} tone="win" />
        <StatCard label={t('sidebar.winRate')} value={formatPercent(getWinRate(stats), 1)} tone="accent" />
        <StatCard
          label={t('stats.totalProfit')}
          value={formatSignedMoney(stats.totalProfit)}
          tone={stats.totalProfit >= 0 ? 'win' : 'loss'}
        />
      </div>

      <section className="panel p-3 sm:p-5">
        <div className="mb-4 flex gap-1.5">
          {(['all', 'win', 'loss'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              data-active={filter === f}
              onClick={() => {
                setFilter(f);
                setLimit(PAGE_SIZE);
              }}
            >
              {f === 'all' ? t('filters.all') : f === 'win' ? t('stats.wins') : t('stats.losses')}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title={state.history.length === 0 ? t('history.emptyTitle') : t('common.nothingMatches')}
            description={state.history.length === 0 ? t('history.emptyText') : t('history.noMatch')}
            action={
              state.history.length === 0 && (
                <button type="button" className="btn btn-primary h-11 px-5" onClick={() => onNavigate('upgrade')}>
                  <ArrowUpCircle size={16} /> {t('history.start')}
                </button>
              )
            }
          />
        ) : (
          <>
            <UpgradeHistory entries={entries.slice(0, limit)} />
            {entries.length > limit && (
              <button
                type="button"
                className="btn btn-ghost mt-4 h-11 w-full"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
              >
                {t('history.showMore', { count: entries.length - limit })}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
