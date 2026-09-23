import { Crown, Medal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';
import { leaderboard } from '../utils/botEngine';
import type { LeaderMetric } from '../utils/botEngine';
import { formatMoney } from '../utils/format';
import { currentDay } from '../utils/progression';
import { cx } from '../utils/ui';

const METRICS: [LeaderMetric, TKey][] = [
  ['netWorth', 'leaders.netWorth'],
  ['biggestWin', 'leaders.biggestWin'],
  ['level', 'leaders.level'],
];

export function LeaderboardPage() {
  const t = useT();
  const { state } = useStore();
  const [metric, setMetric] = useState<LeaderMetric>('netWorth');
  const rows = useMemo(
    () => leaderboard(state, metric, currentDay(), state.nickname || t('profile.defaultName')),
    [state, metric, t],
  );
  const yourRank = rows.findIndex((r) => r.isYou) + 1;
  const format = (value: number) => (metric === 'level' ? String(value) : formatMoney(value));

  return (
    <div className="space-y-5">
      <PageHeader title={t('leaders.title')} subtitle={t('leaders.subtitle')} />
      <div className="flex flex-wrap items-center gap-2">
        {METRICS.map(([id, label]) => (
          <button key={id} type="button" className="chip px-4 py-2 text-sm" data-active={metric === id} onClick={() => setMetric(id)}>
            {t(label)}
          </button>
        ))}
        <span className="ml-auto rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm font-semibold text-amber-200">
          {t('leaders.yourRank', { rank: yourRank, total: rows.length })}
        </span>
      </div>
      <section className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">{t('leaders.player')}</th>
              <th className="px-4 py-3 text-right font-semibold">{t(METRICS.find(([id]) => id === metric)?.[1] ?? 'leaders.netWorth')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.name + i} className={cx('border-t border-line', row.isYou && 'bg-amber-400/10')}>
                <td className="w-14 px-4 py-2.5">
                  {i < 3 ? (
                    <Medal size={18} className={i === 0 ? 'text-amber-300' : i === 1 ? 'text-slate-300' : 'text-orange-400'} />
                  ) : (
                    <span className="tabular-nums text-slate-500">{i + 1}</span>
                  )}
                </td>
                <td className={cx('px-4 py-2.5 font-semibold', row.isYou ? 'text-amber-200' : 'text-white')}>
                  {i === 0 && <Crown size={14} className="mr-1.5 inline text-amber-300" />}
                  {row.name}
                  {row.isYou && <span className="ml-2 text-xs font-normal text-amber-300/80">({t('battle.you')})</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-display text-base font-bold tabular-nums text-white">{format(row[metric])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-center text-xs text-slate-500">{t('leaders.note')}</p>
    </div>
  );
}
