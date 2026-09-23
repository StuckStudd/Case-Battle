import { Trophy, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RARITIES } from '../data/rarities';
import type { HistoryEntry, Skin } from '../types/types';
import { formatPercent, formatSignedMoney } from '../utils/format';
import { cx, rarityStyle } from '../utils/ui';
import { useT } from '../i18n';
import { ChevronMark } from './Logo';
import { SkinImage } from './SkinImage';

interface UpgradeAnimationProps {
  entry: HistoryEntry;
  /** First staked skin, or null when only balance was staked. */
  stakeSkin: Skin | null;
  target: Skin;
  onContinue: () => void;
}

/** Full-screen reveal of an upgrade result after the roulette stops. */
export function UpgradeAnimation({ entry, stakeSkin, target, onContinue }: UpgradeAnimationProps) {
  const t = useT();
  const win = entry.result === 'win';
  const shown = win ? target : stakeSkin;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={win ? t('result.success') : t('result.failed')}>
      <div className="anim-fade-in absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onContinue} />
      <div
        className={cx(
          'pointer-events-none absolute inset-0',
          win
            ? 'anim-flash-win bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.55),transparent_70%)]'
            : 'anim-flash-loss bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.5),transparent_70%)]',
        )}
      />

      <div
        style={shown ? rarityStyle(shown.rarity) : undefined}
        className={cx(
          'panel relative w-full max-w-md overflow-hidden p-6 text-center',
          win ? 'anim-pop border-emerald-500/40' : 'anim-shake border-rose-500/40',
        )}
      >
        <div
          className={cx(
            'pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full blur-3xl',
            win ? 'bg-emerald-500/30' : 'bg-rose-600/25',
          )}
        />

        <div
          className={cx(
            'relative mx-auto mb-3 grid size-12 place-items-center rounded-2xl',
            win ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-400',
          )}
        >
          {win ? <Trophy size={24} /> : <XCircle size={24} />}
        </div>
        <h2
          className={cx(
            'relative font-display text-3xl font-bold tracking-wider',
            win ? 'text-emerald-400' : 'text-rose-400',
          )}
        >
          {win ? t('result.success') : t('result.failed')}
        </h2>

        <div className="relative my-5 h-36">
          <div className={cx('rarity-glow absolute inset-6 blur-2xl', win ? 'opacity-90' : 'opacity-20')} />
          {shown ? (
            <SkinImage
              skin={shown}
              className={cx('relative h-full w-full', win ? 'anim-float' : 'opacity-40 grayscale')}
            />
          ) : (
            <ChevronMark className="relative mx-auto h-full opacity-30 grayscale" />
          )}
          {!win && <div className="absolute inset-x-10 top-1/2 h-0.5 -rotate-6 bg-rose-500/80" />}
        </div>

        <div className="relative">
          {win && shown ? (
            <>
              <div className="text-sm text-slate-400">{shown.weapon}</div>
              <div className="text-lg font-semibold text-white">{shown.finish}</div>
              <div className="rarity-text text-xs font-bold uppercase tracking-wider">{RARITIES[shown.rarity].label}</div>
            </>
          ) : (
            <div className="text-sm text-slate-400">{entry.fromName}</div>
          )}
          <div
            className={cx(
              'mt-3 font-display text-4xl font-bold tabular-nums',
              win ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {formatSignedMoney(entry.profit)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {win ? t('result.added') : t('result.stakeLost')} · {t('result.rollInfo', { chance: formatPercent(entry.chance), roll: entry.roll.toFixed(2) })}
          </p>
        </div>

        <button
          type="button"
          autoFocus
          onClick={onContinue}
          className={cx('btn relative mt-6 h-12 w-full text-base tracking-wider', win ? 'btn-success' : 'btn-primary')}
        >
          {win ? t('result.continue') : t('result.tryAgain')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
