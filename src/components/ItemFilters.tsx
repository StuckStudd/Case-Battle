import { Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { useState } from 'react';
import { RARITY_LIST } from '../data/rarities';
import { useT } from '../i18n';
import type { Rarity } from '../types/types';
import { DEFAULT_FILTERS, QUICK_FILTERS, SORT_LABELS, countActiveFilters } from '../utils/filters';
import type { SkinFilterState, SortMode } from '../utils/filters';
import { cx } from '../utils/ui';

interface ItemFiltersProps {
  value: SkinFilterState;
  onChange: (next: SkinFilterState) => void;
  sortModes?: SortMode[];
  showFavorites?: boolean;
  compact?: boolean;
}

export function ItemFilters({
  value,
  onChange,
  sortModes = ['price-asc', 'price-desc', 'rarity'],
  showFavorites = false,
  compact = false,
}: ItemFiltersProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const set = <K extends keyof SkinFilterState>(key: K, v: SkinFilterState[K]) => onChange({ ...value, [key]: v });
  const activeCount = countActiveFilters(value);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={value.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder={t('filters.searchSkins')}
            className="input pl-9"
            aria-label={t('filters.searchSkins')}
          />
        </label>
        <select
          value={value.sort}
          onChange={(e) => set('sort', e.target.value as SortMode)}
          className="input w-auto max-w-[46%] pr-2"
          aria-label={t('filters.sort')}
        >
          {sortModes.map((mode) => (
            <option key={mode} value={mode}>
              {t(SORT_LABELS[mode])}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={t('filters.more')}
          className={cx('btn btn-ghost relative h-[42px] shrink-0 px-3', expanded && 'border-amber-400/50 text-white')}
        >
          <SlidersHorizontal size={16} />
          {!compact && <span className="hidden sm:inline">{t('filters.filters')}</span>}
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="chip"
            data-active={value.quick === f.id}
            onClick={() => set('quick', f.id)}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {expanded && (
        <div className="anim-fade-up grid gap-3 rounded-xl border border-line bg-white/[0.02] p-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={value.rarity}
            onChange={(e) => set('rarity', e.target.value as Rarity | 'any')}
            className="input"
            aria-label={t('filters.rarity')}
          >
            <option value="any">{t('filters.anyRarity')}</option>
            {RARITY_LIST.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal"
              value={value.minPrice}
              onChange={(e) => set('minPrice', e.target.value)}
              placeholder={t('filters.from')}
              className="input"
              aria-label={t('filters.minPrice')}
            />
            <span className="text-slate-600">—</span>
            <input
              inputMode="decimal"
              value={value.maxPrice}
              onChange={(e) => set('maxPrice', e.target.value)}
              placeholder={t('filters.to')}
              className="input"
              aria-label={t('filters.maxPrice')}
            />
          </div>
          <div className="flex items-center gap-2">
            {showFavorites && (
              <button
                type="button"
                className="chip h-[42px]"
                data-active={value.favoritesOnly}
                onClick={() => set('favoritesOnly', !value.favoritesOnly)}
              >
                <Star size={14} fill={value.favoritesOnly ? 'currentColor' : 'none'} />
                {t('filters.favorites')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost h-[42px] px-3 text-sm"
              onClick={() => onChange({ ...DEFAULT_FILTERS, sort: value.sort })}
            >
              <X size={14} />
              {t('filters.reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
