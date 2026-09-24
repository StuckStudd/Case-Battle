import { RARITIES } from '../data/rarities';
import type { TKey } from '../i18n';
import type { Rarity, Skin } from '../types/types';

export type QuickFilter = 'all' | 'knives' | 'rifles' | 'pistols' | 'smgs' | 'gloves' | 'agents' | 'charms' | 'music' | 'classified' | 'covert' | 'rare';
export type SortMode = 'price-asc' | 'price-desc' | 'newest' | 'rarity';

export const QUICK_FILTERS: { id: QuickFilter; label: TKey }[] = [
  { id: 'all', label: 'filters.all' },
  { id: 'knives', label: 'filters.knives' },
  { id: 'rifles', label: 'filters.rifles' },
  { id: 'pistols', label: 'filters.pistols' },
  { id: 'smgs', label: 'filters.smgs' },
  { id: 'gloves', label: 'filters.gloves' },
  { id: 'agents', label: 'filters.agents' },
  { id: 'charms', label: 'filters.charms' },
  { id: 'music', label: 'filters.music' },
  { id: 'classified', label: 'filters.classified' },
  { id: 'covert', label: 'filters.covert' },
  { id: 'rare', label: 'filters.rare' },
];

export const SORT_LABELS: Record<SortMode, TKey> = {
  'price-asc': 'sort.priceAsc',
  'price-desc': 'sort.priceDesc',
  newest: 'sort.newest',
  rarity: 'sort.rarity',
};

export interface SkinFilterState {
  query: string;
  quick: QuickFilter;
  rarity: Rarity | 'any';
  minPrice: string;
  maxPrice: string;
  sort: SortMode;
  favoritesOnly: boolean;
}

export const DEFAULT_FILTERS: SkinFilterState = {
  query: '',
  quick: 'all',
  rarity: 'any',
  minPrice: '',
  maxPrice: '',
  sort: 'price-asc',
  favoritesOnly: false,
};

export function matchesQuickFilter(skin: Skin, quick: QuickFilter): boolean {
  switch (quick) {
    case 'all':
      return true;
    case 'knives':
      return skin.category === 'knife';
    case 'rifles':
      return skin.category === 'rifle' || skin.category === 'sniper';
    case 'pistols':
      return skin.category === 'pistol';
    case 'smgs':
      return skin.category === 'smg';
    case 'gloves':
      return skin.category === 'gloves';
    case 'agents':
      return skin.category === 'agent';
    case 'charms':
      return skin.category === 'charm';
    case 'music':
      return skin.category === 'music';
    case 'classified':
      return skin.rarity === 'classified';
    case 'covert':
      return skin.rarity === 'covert';
    case 'rare':
      return skin.rarity === 'rare' || skin.rarity === 'contraband' || skin.rarity === 'legendary' || skin.rarity === 'mythic';
  }
}

export function parsePriceInput(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function countActiveFilters(filters: SkinFilterState): number {
  return (
    (filters.rarity !== 'any' ? 1 : 0) +
    (parsePriceInput(filters.minPrice) !== null ? 1 : 0) +
    (parsePriceInput(filters.maxPrice) !== null ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0)
  );
}

interface FilterOptions<T> {
  favorites?: ReadonlySet<string>;
  getTime?: (item: T) => number;
}

export function filterAndSort<T>(
  items: readonly T[],
  getItemSkin: (item: T) => Skin,
  filters: SkinFilterState,
  options: FilterOptions<T> = {},
): T[] {
  const query = filters.query.trim().toLowerCase();
  let min = parsePriceInput(filters.minPrice);
  let max = parsePriceInput(filters.maxPrice);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  const indexed = items
    .map((item, index) => ({ item, index, skin: getItemSkin(item) }))
    .filter(({ skin }) => {
      if (query && !`${skin.name} ${skin.collection} ${RARITIES[skin.rarity].label}`.toLowerCase().includes(query)) {
        return false;
      }
      if (!matchesQuickFilter(skin, filters.quick)) return false;
      if (filters.rarity !== 'any' && skin.rarity !== filters.rarity) return false;
      if (min !== null && skin.price < min) return false;
      if (max !== null && skin.price > max) return false;
      if (filters.favoritesOnly && !options.favorites?.has(skin.id)) return false;
      return true;
    });

  indexed.sort((a, b) => {
    switch (filters.sort) {
      case 'price-asc':
        return a.skin.price - b.skin.price;
      case 'price-desc':
        return b.skin.price - a.skin.price;
      case 'rarity':
        return RARITIES[b.skin.rarity].order - RARITIES[a.skin.rarity].order || b.skin.price - a.skin.price;
      case 'newest':
        return options.getTime ? options.getTime(b.item) - options.getTime(a.item) : b.index - a.index;
    }
  });

  return indexed.map(({ item }) => item);
}
