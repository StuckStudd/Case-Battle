import { BarChart3 } from 'lucide-react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { GameId } from '../store/transitions';
import { formatMoney, formatSignedMoney } from '../utils/format';
import { cx } from '../utils/ui';

const GAMES: [GameId, TKey][] = [
  ['upgrade', 'nav.upgrade'],
  ['cases', 'cases.tabCases'],
  ['capsules', 'cases.tabCapsules'],
  ['battles', 'cases.tabBattles'],
  ['contracts', 'nav.contracts'],
  ['crash', 'games.crash'],
  ['jackpot', 'games.jackpot'],
  ['duel', 'games.duel'],
  ['mega', 'games.mega'],
  ['roulette', 'games.roulette'],
  ['mines', 'games.mines'],
  ['towers', 'games.towers'],
  ['hilo', 'games.hilo'],
  ['plinko', 'games.plinko'],
  ['coinflip', 'games.coinflip'],
  ['matches', 'nav.matches'],
];

/** Rounds, total staked and net result for every game, tracked since this feature was added. */
export function GameStatsTable() {
  const t = useT();
  const stats = useStore().state.gameStats;
  const rows = GAMES.map(([id, label]) => ({ id, label, stat: stats[id] })).filter((r) => r.stat && r.stat.played > 0);
  const total = rows.reduce((sum, r) => sum + (r.stat?.profit ?? 0), 0);

  return (
    <section className="panel p-5">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-white">
        <BarChart3 size={18} className="text-amber-300" /> {t('gameStats.title')}
      </h2>
      <p className="mb-3 text-xs text-slate-500">{t('gameStats.hint')}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t('gameStats.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2 font-semibold">{t('gameStats.game')}</th>
                <th className="py-2 text-right font-semibold">{t('gameStats.played')}</th>
                <th className="py-2 text-right font-semibold">{t('gameStats.wagered')}</th>
                <th className="py-2 text-right font-semibold">{t('gameStats.profit')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ id, label, stat }) => (
                <tr key={id} className="border-t border-line">
                  <td className="py-2 text-white">{t(label)}</td>
                  <td className="py-2 text-right tabular-nums text-slate-300">{stat!.played}</td>
                  <td className="py-2 text-right tabular-nums text-slate-300">{formatMoney(stat!.wagered)}</td>
                  <td className={cx('py-2 text-right font-semibold tabular-nums', stat!.profit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {formatSignedMoney(stat!.profit)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="py-2 font-semibold text-white" colSpan={3}>
                  {t('gameStats.total')}
                </td>
                <td className={cx('py-2 text-right font-bold tabular-nums', total >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{formatSignedMoney(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
