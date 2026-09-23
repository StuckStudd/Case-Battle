import type { Exterior, Skin } from '../types/types';
import { exteriorFromFloat, exteriorShort } from '../utils/exterior';
import { CATALOG, STEAM_CDN, type CatalogRow } from './catalog';
import { LEGENDS, LEGENDS_COLLECTION, PROTOTYPES_COLLECTION } from './legends';
import { RARITIES } from './rarities';

/** Order of the per-wear prices in catalog rows. */
const WEARS: Exterior[] = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];

interface BaseEntry {
  skin: Skin;
  minFloat: number;
  maxFloat: number;
  prices: number[];
  statTrakPrices: number[] | null;
}

function toBase([id, weapon, finish, category, rarity, collection, float, minFloat, maxFloat, image, prices]: CatalogRow): BaseEntry {
  const exterior = exteriorFromFloat(float);
  const star = category === 'knife' || category === 'gloves' ? '★ ' : '';
  return {
    skin: {
      id,
      baseId: id,
      name: `${star}${weapon} | ${finish}`,
      weapon,
      finish,
      category,
      rarity,
      price: prices[WEARS.indexOf(exterior)] || Math.max(...prices.slice(0, 5)),
      image: image ? STEAM_CDN + image : null,
      collection,
      float,
      exterior,
      colors: [RARITIES[rarity].color, '#1b1d22'],
      statTrak: false,
      priceChange: 0,
    },
    minFloat,
    maxFloat,
    prices: prices.slice(0, 5),
    statTrakPrices: prices.length > 5 ? prices.slice(5, 10) : null,
  };
}

/**
 * Catalog of every CS2 weapon skin, knife and glove finish with real market prices per wear.
 * Regenerate it with `node scripts/build-catalog.mjs`. SkinImage falls back to generated art if a picture fails to load.
 */
const BASE_LIST: BaseEntry[] = CATALOG.map(toBase);

const EXTERIOR_RANGES: [Exterior, number, number][] = [
  ['Factory New', 0, 0.07],
  ['Minimal Wear', 0.07, 0.15],
  ['Field-Tested', 0.15, 0.38],
  ['Well-Worn', 0.38, 0.45],
  ['Battle-Scarred', 0.45, 1],
];

/** Maximum daily price swing (±8%). */
const DAILY_SWING = 0.08;
const DAY_MS = 86_400_000;

function hash01(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Final avalanche so neighbouring days ("id:100" vs "id:101") get unrelated values.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Deterministic per-skin market factor for a given day, the same for every visitor. */
function marketFactor(baseId: string, day: number): number {
  return 1 + DAILY_SWING * (hash01(`${baseId}:${day}`) * 2 - 1);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildVariants({ skin: base, minFloat, maxFloat, prices, statTrakPrices }: BaseEntry, day: number): Skin[] {
  const today = marketFactor(base.id, day);
  const priceChange = Math.round((today / marketFactor(base.id, day - 1) - 1) * 10000) / 10000;
  const star = base.category === 'knife' || base.category === 'gloves' ? '★ ' : '';
  const variants: Skin[] = [];

  for (const [exterior, lo, hi] of EXTERIOR_RANGES) {
    const isBaseExterior = exterior === base.exterior;
    const from = Math.max(lo, minFloat);
    const to = Math.min(hi, maxFloat);
    if (from >= to && !isBaseExterior) continue;
    const float = isBaseExterior ? base.float : Math.round((from + (to - from) * 0.35) * 1000) / 1000;

    for (const statTrak of statTrakPrices ? [false, true] : [false]) {
      const suffix = `${exteriorShort(exterior).toLowerCase()}${statTrak ? '-st' : ''}`;
      // The default wear always exists (saved items point at it) even if its float range is unusual.
      const price = (statTrak && statTrakPrices ? statTrakPrices : prices)[WEARS.indexOf(exterior)] || base.price;
      variants.push({
        ...base,
        id: isBaseExterior && !statTrak ? base.id : `${base.id}--${suffix}`,
        name: `${star}${statTrak ? 'StatTrak™ ' : ''}${base.weapon} | ${base.finish}`,
        float,
        exterior,
        statTrak,
        price: Math.max(0.03, round2(price * today)),
        priceChange,
      });
    }
  }
  return variants;
}

const TODAY = Math.floor(Date.now() / DAY_MS);

const REGULAR: Skin[] = BASE_LIST.flatMap((base) => buildVariants(base, TODAY));
const REGULAR_MAP = new Map(REGULAR.map((s) => [s.id, s]));

/** Legendary one-offs: a single fixed variant each, borrowing artwork from their catalog skin. */
const LEGEND_SKINS: Skin[] = LEGENDS.flatMap((def) => {
  const base = REGULAR_MAP.get(def.base);
  if (!base) return [];
  const today = marketFactor(def.id, TODAY);
  const star = base.category === 'knife' || base.category === 'gloves' ? '★ ' : '';
  const finish = `${base.finish} «${def.tag}»`;
  return [
    {
      ...base,
      id: def.id,
      baseId: def.id,
      name: `${star}${def.statTrak ? 'StatTrak™ ' : ''}${base.weapon} | ${finish}`,
      finish,
      rarity: 'legendary',
      price: round2(def.price * today),
      collection: def.prototype ? PROTOTYPES_COLLECTION : LEGENDS_COLLECTION,
      float: def.float,
      exterior: exteriorFromFloat(def.float),
      colors: [RARITIES.legendary.color, '#1b1d22'],
      statTrak: !!def.statTrak,
      priceChange: Math.round((today / marketFactor(def.id, TODAY - 1) - 1) * 10000) / 10000,
    } satisfies Skin,
  ];
});

/** Every wear and StatTrak variant plus legendary items. Used for upgrades, cases, contracts and inventory lookups. */
export const SKINS: Skin[] = [...REGULAR, ...LEGEND_SKINS];

export const SKIN_MAP: ReadonlyMap<string, Skin> = new Map(SKINS.map((s) => [s.id, s]));

/** One entry per skin (its default wear, no StatTrak) for catalog listings like the Shop. */
export const BASE_SKINS: Skin[] = [...BASE_LIST.map(({ skin }) => SKIN_MAP.get(skin.id) ?? skin), ...LEGEND_SKINS];

const FLOAT_RANGES = new Map(BASE_LIST.map((b) => [b.skin.id, [b.minFloat, b.maxFloat] as const]));

/** Float range a base skin can drop with (used for real case odds per wear). */
export function getFloatRange(baseId: string): readonly [number, number] {
  return FLOAT_RANGES.get(baseId) ?? [0, 1];
}

const VARIANTS_BY_BASE = new Map<string, Skin[]>();
for (const variant of SKINS) {
  VARIANTS_BY_BASE.set(variant.baseId, [...(VARIANTS_BY_BASE.get(variant.baseId) ?? []), variant]);
}

export function getVariants(baseId: string): Skin[] {
  return VARIANTS_BY_BASE.get(baseId) ?? [];
}

export function getSkin(id: string | null | undefined): Skin | undefined {
  return id ? SKIN_MAP.get(id) : undefined;
}

export function isValidSkin(skin: Skin | undefined): skin is Skin {
  return !!skin && Number.isFinite(skin.price) && skin.price > 0;
}
