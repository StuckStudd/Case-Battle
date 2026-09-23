import { useStore } from '../store/inventoryStore';
import { useT } from '../i18n';
import { getLevelProgress } from '../utils/progression';
import { cx } from '../utils/ui';

/** Level number with an XP progress bar. */
export function LevelBadge({ compact }: { compact?: boolean }) {
  const t = useT();
  const { level, current, needed, fraction } = getLevelProgress(useStore().state.xp);

  return (
    <div className={cx('flex items-center gap-2.5', compact ? '' : 'w-full')} title={t('level.xp', { current, needed })}>
      <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-400/40 bg-amber-400/10 font-display text-base font-bold text-amber-300">
        {level}
      </div>
      <div className={cx('min-w-0', compact ? 'w-24' : 'flex-1')}>
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>{t('level.label')}</span>
          <span className="tabular-nums normal-case tracking-normal">
            {current}/{needed}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-[width] duration-700"
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
