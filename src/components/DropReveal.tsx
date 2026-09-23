import type { ReactNode } from 'react';
import { RARITIES } from '../data/rarities';
import type { Skin } from '../types/types';
import { exteriorShort } from '../utils/exterior';
import { formatMoney } from '../utils/format';
import { isJackpot } from '../utils/effects';
import { cx, rarityStyle } from '../utils/ui';
import { SkinImage } from './SkinImage';

/** Big reveal of a won skin with action buttons underneath. */
export function DropReveal({ skin, children }: { skin: Skin; children?: ReactNode }) {
  const jackpot = isJackpot(skin);
  return (
    <div style={rarityStyle(skin.rarity)} className="text-center">
      <div className="anim-pop relative my-4 h-40">
        <div className={cx('rarity-glow absolute inset-6 blur-2xl', jackpot && 'anim-pulse-glow')} />
        <SkinImage skin={skin} className="anim-float relative h-full w-full" />
      </div>
      <div className="text-sm text-slate-400">
        {skin.statTrak && <span className="mr-1 font-semibold text-orange-400">StatTrak™</span>}
        {skin.weapon}
      </div>
      <div className="text-xl font-semibold text-white">{skin.finish}</div>
      <div className="mt-0.5 flex items-center justify-center gap-2 text-xs">
        <span className="rarity-text font-bold uppercase tracking-wider">{RARITIES[skin.rarity].label}</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-slate-400">{exteriorShort(skin.exterior)}</span>
      </div>
      <div className={cx('mt-2 font-display text-3xl font-bold tabular-nums', jackpot ? 'text-amber-300' : 'text-white')}>
        {formatMoney(skin.price)}
      </div>
      {children && <div className="mt-5 grid gap-2 sm:grid-cols-2">{children}</div>}
    </div>
  );
}
