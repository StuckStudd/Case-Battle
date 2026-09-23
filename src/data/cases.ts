import { buildDropTable } from '../utils/dropTable';
import type { DropEntry, DropTable } from '../utils/dropTable';
import type { Exterior, Rarity, Skin, WeaponCategory } from '../types/types';
import { OFFICIAL_CASES } from './officialCases';
import { SKINS, getFloatRange, getSkin, getVariants } from './skinData';

const STEAM_CDN = 'https://community.akamai.steamstatic.com/economy/image/';

export interface CaseDef {
  id: string;
  name: string;
  /** 'official': real CS2 case with its real contents and odds. 'premium': simulator case drawing from a price band. */
  kind: 'premium' | 'official';
  price: number;
  image: string;
  /** Player level required to open. */
  minLevel: number;
  /** Premium cases: price band (and optionally weapon types) of the skins the case can drop. */
  minPrice?: number;
  maxPrice?: number;
  categories?: WeaponCategory[];
  /** Expected drop value as a share of the case price. */
  returnRate: number;
  /** Official cases: catalog ids of the regular and ★ contents. */
  contents?: { skins: string[]; rare: string[] };
  released?: string;
}

const RETURN_RATE = 0.9;
const officialImage = (id: string) => `${STEAM_CDN}${OFFICIAL_CASES.find((c) => c[0] === id)?.[2] ?? ''}`;

const PREMIUM_CASES: CaseDef[] = [
  {
    id: 'kilowatt',
    name: 'Starter Case',
    kind: 'premium',
    price: 1,
    minLevel: 1,
    minPrice: 0.03,
    maxPrice: 40,
    returnRate: RETURN_RATE,
    image: `${STEAM_CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnEVvqf_a6VoIfGSXz7Hlbwg57QwSS_mxhl15jiGyN37c3_GZw91W8BwRflK7EfKsa2sfw`,
  },
  {
    id: 'dreams',
    name: 'Bronze Case',
    kind: 'premium',
    price: 5,
    minLevel: 1,
    minPrice: 0.3,
    maxPrice: 200,
    returnRate: RETURN_RATE,
    image: `${STEAM_CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnIV7Kb5OaU-JqfHDzXFle0u4LY8Gy_kkRgisGzcm4v4J3vDOAQmDMdyRvlK7EcmeCU3yw`,
  },
  {
    id: 'clutch',
    name: 'Silver Case',
    kind: 'premium',
    price: 25,
    minLevel: 3,
    minPrice: 2,
    maxPrice: 1000,
    returnRate: RETURN_RATE,
    image: `${STEAM_CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frHsVtqr8a_dsdKTAWDWVxLgjsrAwHSvgwEQk4m-ByYuqIC2eO1VyD5QiR_lK7EcxQQPYQA`,
  },
  {
    id: 'prisma',
    name: 'Gold Case',
    kind: 'premium',
    price: 100,
    minLevel: 6,
    minPrice: 10,
    maxPrice: 4000,
    returnRate: RETURN_RATE,
    image: `${STEAM_CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3cV6vT9avBvefWWDDGTxbZ14rhsTX7qkE90sDiHwt2pdC-TblJ2DsB1QPlK7Ee9riHKAA`,
  },
  {
    id: 'gamma',
    name: 'Diamond Case',
    kind: 'premium',
    price: 500,
    minLevel: 10,
    minPrice: 60,
    maxPrice: 20000,
    returnRate: RETURN_RATE,
    image: `${STEAM_CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frHEVtvP5bPZrd6XECmOSxe0v4bRoTnnjwBkitWrRm4yoeX3GagMnCZZ2FPlK7EcEv22BnQ`,
  },
  {
    id: 'knives',
    name: 'Knife Only Case',
    kind: 'premium',
    price: 1500,
    minLevel: 8,
    minPrice: 50,
    maxPrice: 1_000_000,
    categories: ['knife'],
    returnRate: RETURN_RATE,
    image: officialImage('cs-cs-go-weapon-case'),
  },
  {
    id: 'gloves-only',
    name: 'Gloves Only Case',
    kind: 'premium',
    price: 2500,
    minLevel: 8,
    minPrice: 50,
    maxPrice: 1_000_000,
    categories: ['gloves'],
    returnRate: RETURN_RATE,
    image: officialImage('cs-glove-case'),
  },
  {
    id: 'elite',
    name: 'Elite Case',
    kind: 'premium',
    price: 10_000,
    minLevel: 12,
    minPrice: 300,
    maxPrice: 1_000_000,
    returnRate: RETURN_RATE,
    image: officialImage('cs-operation-hydra-case'),
  },
  {
    id: 'whale',
    name: 'Whale Case',
    kind: 'premium',
    price: 50_000,
    minLevel: 15,
    minPrice: 2000,
    maxPrice: 5_000_000,
    returnRate: RETURN_RATE,
    image: officialImage('cs-operation-breakout-weapon-case'),
  },
  {
    id: 'legend',
    name: 'Legend Case',
    kind: 'premium',
    price: 250_000,
    minLevel: 20,
    minPrice: 10_000,
    maxPrice: 20_000_000,
    returnRate: RETURN_RATE,
    image: officialImage('cs-esports-2013-case'),
  },
  {
    id: 'billionaire',
    name: 'Billionaire Case',
    kind: 'premium',
    price: 1_000_000,
    minLevel: 25,
    minPrice: 50_000,
    maxPrice: Infinity,
    returnRate: RETURN_RATE,
    image: officialImage('cs-cs20-case'),
  },
];

/** Real CS2 drop odds per rarity; ★ items are the 0.26% "rare special item". */
const OFFICIAL_ODDS: [Rarity, number][] = [
  ['milspec', 0.7992],
  ['restricted', 0.1598],
  ['classified', 0.032],
  ['covert', 0.0064],
  ['rare', 0.0026],
];
const WEAR_RANGES: Record<Exterior, [number, number]> = {
  'Factory New': [0, 0.07],
  'Minimal Wear': [0.07, 0.15],
  'Field-Tested': [0.15, 0.38],
  'Well-Worn': [0.38, 0.45],
  'Battle-Scarred': [0.45, 1],
};
const STATTRAK_SHARE = 0.1;

/**
 * Drop table of an official case: rarity by real odds, skin uniformly within its rarity,
 * wear by how much of the skin's float range falls in each wear, StatTrak 10% of the time.
 */
function officialTable(contents: { skins: string[]; rare: string[] }): DropTable<Skin> {
  const groups = new Map<Rarity, string[]>();
  for (const id of contents.skins) {
    const rarity = getSkin(id)?.rarity;
    if (rarity) groups.set(rarity, [...(groups.get(rarity) ?? []), id]);
  }
  groups.set('rare', contents.rare.filter((id) => getSkin(id)));
  const present = OFFICIAL_ODDS.filter(([rarity]) => (groups.get(rarity)?.length ?? 0) > 0);
  const oddsTotal = present.reduce((sum, [, w]) => sum + w, 0);

  const entries: DropEntry<Skin>[] = [];
  for (const [rarity, weight] of present) {
    const bases = groups.get(rarity)!;
    for (const baseId of bases) {
      const [min, max] = getFloatRange(baseId);
      const variants = getVariants(baseId);
      const hasStatTrak = variants.some((v) => v.statTrak);
      for (const skin of variants) {
        const [lo, hi] = WEAR_RANGES[skin.exterior];
        const share = Math.max(0, Math.min(hi, max) - Math.max(lo, min)) / Math.max(1e-6, max - min);
        const trak = hasStatTrak ? (skin.statTrak ? STATTRAK_SHARE : 1 - STATTRAK_SHARE) : 1;
        const chance = (weight / oddsTotal / bases.length) * share * trak;
        if (chance > 0) entries.push({ skin, chance });
      }
    }
  }
  const total = entries.reduce((sum, e) => sum + e.chance, 0);
  for (const e of entries) e.chance /= total;
  entries.sort((a, b) => b.skin.price - a.skin.price);
  return { entries, expectedValue: entries.reduce((sum, e) => sum + e.chance * e.skin.price, 0) };
}

const tables = new Map<string, DropTable<Skin>>();

/** Official cases are priced so that, like every case here, they return 90% on average. */
const OFFICIAL: CaseDef[] = OFFICIAL_CASES.map(([id, name, image, released, skins, rare]) => {
  const table = officialTable({ skins, rare });
  tables.set(id, table);
  return {
    id,
    name,
    kind: 'official' as const,
    price: Math.max(0.5, Math.round((table.expectedValue / RETURN_RATE) * 100) / 100),
    image: `${STEAM_CDN}${image}`,
    minLevel: 1,
    returnRate: RETURN_RATE,
    contents: { skins, rare },
    released,
  };
})
  .filter((def) => (tables.get(def.id)?.entries.length ?? 0) > 0)
  .sort((a, b) => (b.released ?? '').localeCompare(a.released ?? ''));

export const CASES: CaseDef[] = [...PREMIUM_CASES, ...OFFICIAL];

export function getCaseTable(def: CaseDef): DropTable<Skin> {
  let table = tables.get(def.id);
  if (!table) {
    const pool = SKINS.filter(
      (s) => s.price >= (def.minPrice ?? 0) && s.price <= (def.maxPrice ?? Infinity) && (!def.categories || def.categories.includes(s.category)),
    );
    table = buildDropTable(pool, def.price * def.returnRate);
    tables.set(def.id, table);
  }
  return table;
}

export function getCase(id: string): CaseDef | undefined {
  return CASES.find((c) => c.id === id);
}
