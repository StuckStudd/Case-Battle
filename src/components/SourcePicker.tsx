import { Backpack, Check, Gift, Search, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem, Skin } from '../types/types';
import { PICKER_PAGE_SIZE } from '../utils/config';
import { DEFAULT_FILTERS, filterAndSort } from '../utils/filters';
import { formatMoney } from '../utils/format';
import { itemValue } from '../utils/itemValue';
import { EmptyState } from './common';
import { Pagination, usePagination } from './Pagination';
import { SkinCard } from './SkinCard';

interface SourcePickerProps {
  selectedUids: string[];
  disabled: boolean;
  onToggle: (uid: string) => void;
  onClear: () => void;
  onGoToShop: () => void;
  onOpenFreeCase: () => void;
}

export function SourcePicker({ selectedUids, disabled, onToggle, onClear, onGoToShop, onOpenFreeCase }: SourcePickerProps) {
  const t = useT();
  const { state, freeCaseAvailable } = useStore();
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(selectedUids), [selectedUids]);

  const items = useMemo(() => {
    const resolved = state.inventory.flatMap((item) => {
      const skin = getSkin(item.skinId);
      return skin ? [{ item, skin }] : [];
    });
    return filterAndSort(resolved, (r) => r.skin, { ...DEFAULT_FILTERS, query, sort: 'price-desc' });
  }, [state.inventory, query]);
  const { page, pageCount, pageItems, setPage } = usePagination(items, PICKER_PAGE_SIZE);

  const selectedValue = state.inventory
    .filter((i) => selected.has(i.uid))
    .reduce((sum, i) => sum + itemValue(i), 0);

  return (
    <section className="panel flex flex-col p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-white">
          <Backpack size={18} className="text-amber-300" /> {t('upgrade.mySkins')}
        </h2>
        {selectedUids.length > 0 && !disabled && (
          <span className="text-xs text-slate-400">
            {t('upgrade.selectedCount', { count: selectedUids.length })} · <span className="text-amber-300">{formatMoney(selectedValue)}</span>
            <button type="button" className="ml-2 text-slate-500 underline hover:text-white" onClick={onClear}>
              {t('common.clear')}
            </button>
          </span>
        )}
        {state.inventory.length > 0 && (
          <label className="relative ml-auto w-full sm:w-40">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.search')}
              className="input h-9 py-1 pl-8"
              aria-label={t('common.search')}
            />
          </label>
        )}
      </div>

      {state.inventory.length === 0 ? (
        <EmptyState
          icon={Backpack}
          title={t('upgrade.noSkins')}
          description={
            freeCaseAvailable ? t('upgrade.noSkinsFree') : t('upgrade.noSkinsShop')
          }
          action={
            freeCaseAvailable ? (
              <button type="button" className="btn btn-primary h-11 px-5" onClick={onOpenFreeCase}>
                <Gift size={16} /> {t('freeCase.open')}
              </button>
            ) : (
              <button type="button" className="btn btn-primary h-11 px-5" onClick={onGoToShop}>
                <ShoppingBag size={16} /> {t('common.goToShop')}
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="grid flex-1 grid-cols-3 content-start gap-2 sm:grid-cols-4">
            {pageItems.map(({ item, skin }: { item: InventoryItem; skin: Skin }) => {
              const isSelected = selected.has(item.uid);
              return (
                <SkinCard
                  key={item.uid}
                  skin={skin}
                  item={item}
                  compact
                  selected={isSelected}
                  disabled={disabled}
                  onClick={() => onToggle(item.uid)}
                  badge={
                    isSelected ? (
                      <span className="grid size-4 place-items-center rounded-full bg-amber-400 text-black">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
          {items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">{t('common.nothingMatches')}</p>}
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </section>
  );
}
