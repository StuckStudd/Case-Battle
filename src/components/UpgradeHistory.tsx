import { ArrowRight } from 'lucide-react';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import type { HistoryEntry } from '../types/types';
import { formatDateTime, formatMoney, formatPercent, formatSignedMoney, formatTime } from '../utils/format';
import { cx, rarityStyle } from '../utils/ui';
import { SkinImage } from './SkinImage';

function ItemCell({ skinId, name, price }: { skinId: string; name: string; price: number }) {
  const skin = getSkin(skinId);
  return (
    <div className="flex min-w-0 items-center gap-2.5" style={skin ? rarityStyle(skin.rarity) : undefined}>
      <div className="relative h-9 w-14 shrink-0 rounded-lg bg-white/[0.03]">
        {skin && <SkinImage skin={skin} className="h-full w-full p-0.5" />}
        <span className="rarity-bar absolute inset-x-1 bottom-0 h-px" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white" title={name}>
          {name}
        </div>
        <div className="text-xs tabular-nums text-slate-500">{formatMoney(price)}</div>
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: HistoryEntry['result'] }) {
  const t = useT();
  return (
    <span
      className={cx(
        'inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider',
        result === 'win' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
      )}
    >
      {result === 'win' ? t('history.win') : t('history.loss')}
    </span>
  );
}

export function UpgradeHistory({ entries }: { entries: HistoryEntry[] }) {
  const t = useT();
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <th className="px-3 py-2 font-semibold">{t('history.time')}</th>
              <th className="px-3 py-2 font-semibold">{t('history.from')}</th>
              <th className="px-1 py-2" />
              <th className="px-3 py-2 font-semibold">{t('history.to')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('wheel.chance')}</th>
              <th className="px-3 py-2 text-center font-semibold">{t('history.result')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('history.profitLoss')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-line transition hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-3 py-2.5 text-sm tabular-nums text-slate-400" title={formatDateTime(e.timestamp)}>
                  {formatTime(e.timestamp)}
                </td>
                <td className="max-w-[240px] px-3 py-2.5">
                  <ItemCell skinId={e.fromSkinId} name={e.fromName} price={e.fromPrice} />
                </td>
                <td className="px-1 text-slate-600">
                  <ArrowRight size={16} />
                </td>
                <td className="max-w-[240px] px-3 py-2.5">
                  <ItemCell skinId={e.toSkinId} name={e.toName} price={e.toPrice} />
                </td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums text-slate-300">{formatPercent(e.chance)}</td>
                <td className="px-3 py-2.5 text-center">
                  <ResultBadge result={e.result} />
                </td>
                <td
                  className={cx(
                    'px-3 py-2.5 text-right font-display text-base font-bold tabular-nums',
                    e.profit >= 0 ? 'text-emerald-400' : 'text-rose-400',
                  )}
                >
                  {formatSignedMoney(e.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {entries.map((e) => (
          <div key={e.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span className="tabular-nums">{formatDateTime(e.timestamp)}</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">{formatPercent(e.chance)}</span>
                <ResultBadge result={e.result} />
              </div>
            </div>
            <div className="space-y-1.5">
              <ItemCell skinId={e.fromSkinId} name={e.fromName} price={e.fromPrice} />
              <div className="pl-4 text-slate-600">↓</div>
              <ItemCell skinId={e.toSkinId} name={e.toName} price={e.toPrice} />
            </div>
            <div
              className={cx(
                'mt-2 text-right font-display text-lg font-bold tabular-nums',
                e.profit >= 0 ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {formatSignedMoney(e.profit)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
