import { buildDropTable } from '../utils/dropTable';
import type { DropEntry, DropTable } from '../utils/dropTable';
import type { Exterior, Rarity, Skin, WeaponCategory } from '../types/types';
import { SEASONAL_EVENTS, isSeasonActive } from './events';
import type { SeasonalEvent } from './events';
import { OFFICIAL_CASES } from './officialCases';
import { OBTAINABLE_SKINS, getFloatRange, getSkin, getVariants } from './skinData';

const STEAM_CDN = 'https://community.akamai.steamstatic.com/economy/image/';

export interface CaseDef {
  id: string;
  name: string;
  /**
   * 'official': real CS2 case with its real contents and odds. 'souvenir': a major's souvenir package.
   * 'premium': simulator case drawing from a price band.
   */
  kind: 'premium' | 'official' | 'souvenir' | 'event';
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
  /** Event cases can only be opened while their season runs. */
  season?: SeasonalEvent['id'];
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
  {
    id: 'galaxy',
    name: 'Galaxy Case',
    kind: 'premium',
    price: 10_000_000,
    minLevel: 30,
    minPrice: 500_000,
    maxPrice: Infinity,
    returnRate: RETURN_RATE,
    image: officialImage('cs-operation-bravo-case'),
  },
  {
    id: 'universe',
    name: 'Universe Case',
    kind: 'premium',
    price: 100_000_000,
    minLevel: 40,
    minPrice: 5_000_000,
    maxPrice: Infinity,
    returnRate: RETURN_RATE,
    image: officialImage('cs-winter-offensive-weapon-case'),
  },
];

/** Real CS2 grade ladder: each grade is about 5× rarer than the one below. ★ items are a fixed 0.26%. */
const LADDER = [0.7992, 0.1598, 0.032, 0.0064, 0.0013, 0.0003];
const RARE_ODDS = 0.0026;
const GRADES: Rarity[] = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'contraband'];
const WEAR_RANGES: Record<Exterior, [number, number]> = {
  'Factory New': [0, 0.07],
  'Minimal Wear': [0.07, 0.15],
  'Field-Tested': [0.15, 0.38],
  'Well-Worn': [0.38, 0.45],
  'Battle-Scarred': [0.45, 1],
};
const STATTRAK_SHARE = 0.1;

/**
 * Drop table of an official case or souvenir package: grade by the real ladder (starting at the lowest grade
 * inside), skin uniformly within its grade, wear by how much of the skin's float range falls in each wear.
 * Cases give StatTrak™ 10% of the time; souvenir packages always give the Souvenir version when it exists.
 */
function officialTable(contents: { skins: string[]; rare: string[] }, souvenir: boolean): DropTable<Skin> {
  const groups = new Map<Rarity, string[]>();
  // A souvenir package only drops skins that exist as Souvenir (when it has any).
  const hasSouvenir = (id: string) => getVariants(id).some((v) => v.souvenir);
  const onlySouvenirs = souvenir && contents.skins.some(hasSouvenir);
  for (const id of contents.skins) {
    if (onlySouvenirs && !hasSouvenir(id)) continue;
    const rarity = getSkin(id)?.rarity;
    if (rarity) groups.set(rarity, [...(groups.get(rarity) ?? []), id]);
  }
  const grades = GRADES.filter((g) => groups.has(g));
  const present: [Rarity, number][] = grades.map((g, i) => [g, LADDER[Math.min(i, LADDER.length - 1)]]);
  const rare = contents.rare.filter((id) => getSkin(id));
  if (rare.length > 0) {
    groups.set('rare', rare);
    present.push(['rare', RARE_ODDS]);
  }
  const oddsTotal = present.reduce((sum, [, w]) => sum + w, 0);

  const entries: DropEntry<Skin>[] = [];
  for (const [rarity, weight] of present) {
    const bases = groups.get(rarity)!;
    for (const baseId of bases) {
      const [min, max] = getFloatRange(baseId);
      const all = getVariants(baseId);
      const souvenirs = all.filter((v) => v.souvenir);
      const variants = souvenir && souvenirs.length > 0 ? souvenirs : all.filter((v) => !v.souvenir && (!souvenir || !v.statTrak));
      const hasStatTrak = !souvenir && variants.some((v) => v.statTrak);
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
const OFFICIAL: CaseDef[] = OFFICIAL_CASES.map(([id, name, image, released, skins, rare, kind]) => {
  const table = officialTable({ skins, rare }, kind === 'souvenir');
  tables.set(id, table);
  return {
    id,
    name,
    kind: kind === 'souvenir' ? ('souvenir' as const) : ('official' as const),
    price: Math.max(0.05, Math.round((table.expectedValue / RETURN_RATE) * 100) / 100),
    image: `${STEAM_CDN}${image}`,
    minLevel: 1,
    returnRate: RETURN_RATE,
    contents: { skins, rare },
    released,
  };
})
  .filter((def) => (tables.get(def.id)?.entries.length ?? 0) > 0)
  .sort((a, b) => (b.released ?? '').localeCompare(a.released ?? ''));

/** Seasonal cases: themed skins that fit the event, available only while it runs. */
const EVENT_CASES: CaseDef[] = [
  { id: 'event-autumn', name: 'Harvest Case', kind: 'event', season: 'autumn', price: 30, minLevel: 1, minPrice: 0.1, maxPrice: 5000, returnRate: RETURN_RATE, image: officialImage('cs-operation-wildfire-case') },
  { id: 'event-halloween', name: 'Spooky Case', kind: 'event', season: 'halloween', price: 66.6, minLevel: 1, minPrice: 0.1, maxPrice: 6666, returnRate: RETURN_RATE, image: officialImage('cs-dreams-nightmares-case') },
  { id: 'event-winter', name: 'Frost Case', kind: 'event', season: 'winter', price: 50, minLevel: 1, minPrice: 0.1, maxPrice: 5000, returnRate: RETURN_RATE, image: officialImage('cs-snakebite-case') },
];

export const CASES: CaseDef[] = [...PREMIUM_CASES, ...EVENT_CASES, ...OFFICIAL];

export function isCaseAvailable(def: CaseDef, now = new Date()): boolean {
  const season = def.season ? SEASONAL_EVENTS.find((e) => e.id === def.season) : undefined;
  return !season || isSeasonActive(season, now);
}

export function getCaseTable(def: CaseDef): DropTable<Skin> {
  let table = tables.get(def.id);
  if (!table) {
    const theme = def.season ? SEASONAL_EVENTS.find((e) => e.id === def.season)?.theme : undefined;
    const pool = OBTAINABLE_SKINS.filter(
      (s) =>
        s.price >= (def.minPrice ?? 0) &&
        s.price <= (def.maxPrice ?? Infinity) &&
        (!def.categories || def.categories.includes(s.category)) &&
        (!theme || (theme.test(s.finish) && !s.souvenir && s.rarity !== 'legendary' && s.rarity !== 'mythic')),
    );
    table = buildDropTable(pool, def.price * def.returnRate);
    tables.set(def.id, table);
  }
  return table;
}

export function getCase(id: string): CaseDef | undefined {
  return CASES.find((c) => c.id === id);
}
