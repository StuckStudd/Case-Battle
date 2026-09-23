import { Star, TrendingDown, TrendingUp } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { RARITIES } from '../data/rarities';
import { getSticker } from '../data/stickers';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import type { InventoryItem, Skin } from '../types/types';
import { itemValue } from '../utils/itemValue';
import { exteriorShort } from '../utils/exterior';
import { formatMoney } from '../utils/format';
import { cx, rarityStyle } from '../utils/ui';
import { SkinImage } from './SkinImage';

interface SkinCardProps {
  skin: Skin;
  /** Inventory item: shows its stickers, rare pattern and real value. */
  item?: InventoryItem;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  footer?: ReactNode;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
  /** Show the price change versus yesterday. */
  showTrend?: boolean;
  className?: string;
}

export function SkinCard({
  skin,
  item,
  onClick,
  selected,
  disabled,
  badge,
  footer,
  favorite,
  onToggleFavorite,
  compact,
  showTrend,
  className,
}: SkinCardProps) {
  const t = useT();
  const rarity = RARITIES[skin.rarity];
  const price = item ? itemValue(item) : skin.price;
  const float = item?.float ?? skin.float;
  const interactive = !!onClick && !disabled;

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? (disabled ? -1 : 0) : undefined}
      aria-pressed={onClick ? !!selected : undefined}
      aria-disabled={disabled || undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKey}
      data-interactive={interactive}
      data-selected={!!selected}
      data-disabled={!!disabled}
      style={rarityStyle(skin.rarity)}
      className={cx('rarity-card group flex flex-col overflow-hidden', compact ? 'p-2.5' : 'p-3', className)}
    >
      <div className="flex items-start justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="rounded-md bg-white/5 px-1.5 py-0.5" title={`${skin.exterior} · float ${float.toFixed(5)}`}>
          {skin.statTrak && <span className="mr-1 text-orange-400">ST</span>}
          {exteriorShort(skin.exterior)}
          {!compact && <> · {float.toFixed(float < 0.01 ? 4 : 3)}</>}
        </span>
        <div className="flex items-center gap-1">
          {badge}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
              className={cx(
                'rounded-md p-0.5 transition hover:scale-110',
                favorite ? 'text-amber-300' : 'text-slate-600 hover:text-slate-300',
              )}
            >
              <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      <div className={cx('relative mx-auto w-full', compact ? 'my-1 h-16' : 'my-2 h-24')}>
        <div className="rarity-glow absolute inset-x-6 inset-y-0 opacity-40 blur-xl transition-opacity group-hover:opacity-80" />
        <SkinImage skin={skin} className="relative h-full w-full transition-transform duration-300 group-hover:scale-110" />
        {item?.special && (
          <span className="absolute left-0 top-0 rounded-md bg-gradient-to-r from-fuchsia-500 to-sky-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
            {t(`special.${item.special}` as TKey)}
          </span>
        )}
        {item?.stickers && item.stickers.length > 0 && (
          <div className="absolute bottom-0 left-0 flex gap-0.5">
            {item.stickers.map((id, i) => {
              const sticker = getSticker(id);
              return sticker ? <img key={i} src={sticker.image} alt={sticker.name} title={sticker.name} className="size-5 object-contain drop-shadow" /> : null;
            })}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-slate-500">
          <span className="truncate">{skin.weapon}</span>
          {showTrend && skin.priceChange !== 0 && (
            <span
              className={cx(
                'inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold tabular-nums',
                skin.priceChange > 0 ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {skin.priceChange > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(skin.priceChange * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <div className={cx('truncate font-semibold text-white', compact ? 'text-xs' : 'text-sm')} title={skin.name}>
          {skin.finish}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="rarity-text truncate text-[10px] font-bold uppercase tracking-wide">{rarity.short}</span>
          <span className={cx('font-display font-bold tabular-nums text-white', compact ? 'text-sm' : 'text-base')}>
            {formatMoney(price)}
          </span>
        </div>
      </div>

      {footer && <div className="mt-2.5">{footer}</div>}
      <div className="rarity-bar absolute inset-x-0 bottom-0 h-[2px] opacity-70" />
    </div>
  );
}
