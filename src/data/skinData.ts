import type { Exterior, Skin } from '../types/types';
import { exteriorFromFloat, exteriorShort } from '../utils/exterior';
import { CATALOG, STEAM_CDN, type CatalogRow } from './catalog';
import { LEGENDS, LEGENDS_COLLECTION, PROTOTYPES_COLLECTION } from './legends';
import { MARKET_HOUR, factorHistory, marketFactor, setEventCollections } from './market';
import { RARITIES } from './rarities';

/** Order of the per-wear prices in catalog rows. */
const WEARS: Exterior[] = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const STAR_CATEGORIES = new Set(['knife', 'gloves']);

interface BaseEntry {
  skin: Skin;
  minFloat: number;
  maxFloat: number;
  prices: number[];
  statTrakPrices: number[] | null;
  souvenirPrices: number[] | null;
}

function displayName(skin: Pick<Skin, 'category' | 'weapon' | 'finish'>, prefix = ''): string {
  const star = STAR_CATEGORIES.has(skin.category) ? '★ ' : '';
  // Vanilla knives are just "★ Karambit" in the game.
  return skin.finish === 'Vanilla' ? `${star}${prefix}${skin.weapon}` : `${star}${prefix}${skin.weapon} | ${skin.finish}`;
}

function toBase([id, weapon, finish, category, rarity, collection, float, minFloat, maxFloat, image, prices, souvenir]: CatalogRow): BaseEntry {
  const wearless = maxFloat === 0;
  const exterior = wearless ? 'Factory New' : exteriorFromFloat(float);
  const skin: Skin = {
    id,
    baseId: id,
    name: '',
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
    wearless: wearless || undefined,
    priceChange: 0,
  };
  skin.name = displayName(skin);
  return {
    skin,
    minFloat,
    maxFloat,
    prices: prices.slice(0, 5),
    statTrakPrices: prices.length > 5 ? prices.slice(5, 10) : null,
    souvenirPrices: souvenir.length === 5 ? souvenir : null,
  };
}

/**
 * Catalog of every CS2 weapon skin, knife and glove finish, vanilla knife, agent, charm and music kit
 * with real market prices per wear. Regenerate it with `npm run catalog`.
 */
const BASE_LIST: BaseEntry[] = CATALOG.map(toBase);

// Collections big enough for a "discontinued" market event.
const COLLECTION_SIZES = new Map<string, number>();
for (const { skin } of BASE_LIST) {
  if (!skin.wearless && !STAR_CATEGORIES.has(skin.category)) COLLECTION_SIZES.set(skin.collection, (COLLECTION_SIZES.get(skin.collection) ?? 0) + 1);
}
setEventCollections([...COLLECTION_SIZES].filter(([, n]) => n >= 8).map(([name]) => name).sort());

const EXTERIOR_RANGES: [Exterior, number, number][] = [
  ['Factory New', 0, 0.07],
  ['Minimal Wear', 0.07, 0.15],
  ['Field-Tested', 0.15, 0.38],
  ['Well-Worn', 0.38, 0.45],
  ['Battle-Scarred', 0.45, 1],
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_HOURS = 24;

/** Market multiplier now and the change versus 24 hours ago. */
function market(base: Skin): { now: number; change: number } {
  const now = marketFactor(base, MARKET_HOUR);
  const before = marketFactor(base, MARKET_HOUR - DAY_HOURS);
  return { now, change: Math.round((now / before - 1) * 10000) / 10000 };
}

type Kind = 'normal' | 'statTrak' | 'souvenir';

function buildVariants({ skin: base, minFloat, maxFloat, prices, statTrakPrices, souvenirPrices }: BaseEntry): Skin[] {
  const { now, change } = market(base);
  const variants: Skin[] = [];
  const kinds: Kind[] = ['normal', ...(statTrakPrices ? (['statTrak'] as const) : []), ...(souvenirPrices ? (['souvenir'] as const) : [])];
  const priceList = (kind: Kind) => (kind === 'statTrak' ? statTrakPrices! : kind === 'souvenir' ? souvenirPrices! : prices);
  const make = (kind: Kind, exterior: Exterior, float: number, id: string, price: number): Skin => ({
    ...base,
    id,
    name: displayName(base, kind === 'statTrak' ? 'StatTrak™ ' : kind === 'souvenir' ? 'Souvenir ' : ''),
    float,
    exterior,
    statTrak: kind === 'statTrak',
    souvenir: kind === 'souvenir' || undefined,
    price: Math.max(0.03, round2(price * now)),
    priceChange: change,
  });

  if (base.wearless) {
    for (const kind of kinds) variants.push(make(kind, 'Factory New', 0, kind === 'normal' ? base.id : `${base.id}--${kind === 'statTrak' ? 'st' : 'sv'}`, priceList(kind)[0] || base.price));
    return variants;
  }

  for (const [exterior, lo, hi] of EXTERIOR_RANGES) {
    const isBaseExterior = exterior === base.exterior;
    const from = Math.max(lo, minFloat);
    const to = Math.min(hi, maxFloat);
    if (from >= to && !isBaseExterior) continue;
    const float = isBaseExterior ? base.float : Math.round((from + (to - from) * 0.35) * 1000) / 1000;
    const wear = exteriorShort(exterior).toLowerCase();

    for (const kind of kinds) {
      const price = priceList(kind)[WEARS.indexOf(exterior)];
      // The default wear always exists (saved items point at it) even if its float range is unusual.
      if (kind !== 'normal' && !price) continue;
      const id = isBaseExterior && kind === 'normal' ? base.id : `${base.id}--${wear}${kind === 'statTrak' ? '-st' : kind === 'souvenir' ? '-sv' : ''}`;
      variants.push(make(kind, exterior, float, id, price || base.price));
    }
  }
  return variants;
}

const REGULAR: Skin[] = BASE_LIST.flatMap(buildVariants);
const REGULAR_MAP = new Map(REGULAR.map((s) => [s.id, s]));

/** Legendary one-offs: a single fixed variant each, borrowing artwork from their catalog skin. */
const LEGEND_SKINS: Skin[] = LEGENDS.flatMap((def) => {
  const base = REGULAR_MAP.get(def.base);
  if (!base) return [];
  const finish = `${base.finish} «${def.tag}»`;
  const skin: Skin = {
    ...base,
    id: def.id,
    baseId: def.id,
    name: displayName({ ...base, finish }, def.statTrak ? 'StatTrak™ ' : ''),
    finish,
    rarity: 'legendary',
    price: def.price,
    collection: def.prototype ? PROTOTYPES_COLLECTION : LEGENDS_COLLECTION,
    float: def.float,
    exterior: exteriorFromFloat(def.float),
    colors: [RARITIES.legendary.color, '#1b1d22'],
    statTrak: !!def.statTrak,
    souvenir: undefined,
  };
  const { now, change } = market(skin);
  return [{ ...skin, price: round2(def.price * now), priceChange: change }];
});

/** Every variant plus legendary items. Used for upgrades, cases, contracts and inventory lookups. */
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
  const list = VARIANTS_BY_BASE.get(variant.baseId);
  if (list) list.push(variant);
  else VARIANTS_BY_BASE.set(variant.baseId, [variant]);
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

/** Hourly prices of a skin over the last week (oldest first), ending at the current price. */
export function priceHistory(skin: Skin, hours = DAY_HOURS * 7): number[] {
  const base = SKIN_MAP.get(skin.baseId) ?? skin;
  const factors = factorHistory(base, MARKET_HOUR, hours);
  const scale = skin.price / factors[factors.length - 1];
  return factors.map((f) => round2(f * scale));
}

/** True for weapon skins, knives and gloves (not agents, charms or music kits). */
export function isWeaponSkin(skin: Skin): boolean {
  return skin.category !== 'agent' && skin.category !== 'charm' && skin.category !== 'music';
}
