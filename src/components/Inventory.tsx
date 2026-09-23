import { Backpack, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem, Skin } from '../types/types';
import { DEFAULT_FILTERS, filterAndSort } from '../utils/filters';
import type { SkinFilterState } from '../utils/filters';
import { cx } from '../utils/ui';
import { EmptyState } from './common';
import { ItemFilters } from './ItemFilters';
import { SkinCard } from './SkinCard';

interface ResolvedItem {
  item: InventoryItem;
  skin: Skin;
}

interface InventoryProps {
  onItemClick: (item: InventoryItem) => void;
  selectedUid?: string | null;
  renderBadge?: (item: InventoryItem, skin: Skin) => ReactNode;
  emptyAction?: ReactNode;
  compact?: boolean;
  gridClassName?: string;
}

export function Inventory({ onItemClick, selectedUid, renderBadge, emptyAction, compact, gridClassName }: InventoryProps) {
  const t = useT();
  const { state, toggleFavorite } = useStore();
  const [filters, setFilters] = useState<SkinFilterState>({ ...DEFAULT_FILTERS, sort: 'newest' });
  const favorites = useMemo(() => new Set(state.favorites), [state.favorites]);

  const resolved = useMemo<ResolvedItem[]>(
    () =>
      state.inventory.flatMap((item) => {
        const skin = getSkin(item.skinId);
        return skin ? [{ item, skin }] : [];
      }),
    [state.inventory],
  );

  const visible = useMemo(
    () => filterAndSort(resolved, (r) => r.skin, filters, { favorites, getTime: (r) => r.item.acquiredAt }),
    [resolved, filters, favorites],
  );

  if (resolved.length === 0) {
    return (
      <EmptyState
        icon={Backpack}
        title={t('inventory.emptyTitle')}
        description={t('inventory.emptyText')}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ItemFilters
        value={filters}
        onChange={setFilters}
        sortModes={['newest', 'price-asc', 'price-desc', 'rarity']}
        showFavorites
        compact={compact}
      />
      {visible.length === 0 ? (
        <EmptyState icon={SearchX} title={t('common.nothingMatches')} description={t('common.tryOtherFilters')} />
      ) : (
        <div
          className={cx(
            'grid gap-2.5 sm:gap-3',
            gridClassName ?? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
          )}
        >
          {visible.map(({ item, skin }) => (
            <SkinCard
              key={item.uid}
              skin={skin}
              item={item}
              compact={compact}
              selected={selectedUid === item.uid}
              onClick={() => onItemClick(item)}
              badge={renderBadge?.(item, skin)}
              favorite={favorites.has(skin.id)}
              onToggleFavorite={() => toggleFavorite(skin.id)}
              className="anim-fade-up"
            />
          ))}
        </div>
      )}
    </div>
  );
}
