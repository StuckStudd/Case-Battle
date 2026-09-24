import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { OBTAINABLE_SKINS } from '../data/skinData';
import { useT } from '../i18n';
import type { Skin } from '../types/types';
import { PICKER_PAGE_SIZE } from '../utils/config';
import { DEFAULT_FILTERS, filterAndSort } from '../utils/filters';
import { formatPercent } from '../utils/format';
import { calculateChance, isTargetEligible } from '../utils/upgradeEngine';
import { ChevronMark } from './Logo';
import { Pagination, usePagination } from './Pagination';
import { SkinCard } from './SkinCard';

interface TargetPickerProps {
  stakeValue: number;
  luckBonus: number;
  selectedId: string | null;
  disabled: boolean;
  onSelect: (skin: Skin) => void;
}

export function TargetPicker({ stakeValue, luckBonus, selectedId, disabled, onSelect }: TargetPickerProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [descending, setDescending] = useState(false);

  const visible = useMemo(() => {
    const candidates = stakeValue > 0 ? OBTAINABLE_SKINS.filter((s) => isTargetEligible(stakeValue, s.price)) : OBTAINABLE_SKINS;
    return filterAndSort(candidates, (s) => s, {
      ...DEFAULT_FILTERS,
      query,
      minPrice,
      maxPrice,
      sort: descending ? 'price-desc' : 'price-asc',
    });
  }, [stakeValue, query, minPrice, maxPrice, descending]);
  const { page, pageCount, pageItems, setPage } = usePagination(visible, PICKER_PAGE_SIZE);

  return (
    <section className="panel flex flex-col p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto flex w-full items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-white">
          <ChevronMark className="size-5" /> {t('upgrade.chooseSkin')}
        </h2>
        <label className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search')}
            className="input h-9 py-1 pl-8"
            aria-label={t('upgrade.searchTargets')}
          />
        </label>
        <input
          inputMode="decimal"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder={t('filters.from')}
          className="input h-9 w-20 py-1"
          aria-label={t('filters.minPrice')}
        />
        <input
          inputMode="decimal"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder={t('filters.to')}
          className="input h-9 w-20 py-1"
          aria-label={t('filters.maxPrice')}
        />
        <button
          type="button"
          className="btn btn-ghost size-9 shrink-0"
          aria-label={t('filters.toggleSort')}
          onClick={() => setDescending((v) => !v)}
        >
          {descending ? <ArrowDownWideNarrow size={16} /> : <ArrowUpNarrowWide size={16} />}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="flex-1 py-10 text-center text-sm text-slate-500">
          {stakeValue > 0 ? t('upgrade.noTargets') : t('common.nothingMatches')}
        </p>
      ) : (
        <div className="grid flex-1 grid-cols-3 content-start gap-2 sm:grid-cols-4">
          {pageItems.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              compact
              disabled={disabled}
              selected={selectedId === skin.id}
              onClick={() => onSelect(skin)}
              badge={
                stakeValue > 0 ? (
                  <span className="rounded bg-amber-400/15 px-1 py-0.5 text-[9px] font-bold normal-case tracking-normal text-amber-300">
                    {formatPercent(calculateChance(stakeValue, skin.price, luckBonus), 1)}
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
    </section>
  );
}
