// Regenerates src/data/catalog.ts: every CS2 weapon skin, knife and glove finish, vanilla knives,
// agents, charms and music kits (github.com/ByMykel/CSGO-API), priced per wear, StatTrak and Souvenir
// from the public Skinport price list. Also writes official cases, souvenir packages and Katowice 2014 stickers.
//
//   node scripts/build-catalog.mjs
//
// Ids of skins that already existed are kept, so saved inventories stay valid.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const SKINS_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const CRATES_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json';
const STICKERS_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json';
const AGENTS_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json';
const CHARMS_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keychains.json';
const MUSIC_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/music_kits.json';
const PRICES_URL = 'https://api.skinport.com/v1/items?app_id=730&currency=USD&tradable=0';
const STEAM_CDN = 'https://community.akamai.steamstatic.com/economy/image/';

const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const WEAR_RANGES = [
  [0, 0.07],
  [0.07, 0.15],
  [0.15, 0.38],
  [0.38, 0.45],
  [0.45, 1],
];
/** Relative wear prices, only used to fill a wear nobody is selling right now. */
const WEAR_MULTIPLIER = [1.45, 1.15, 1, 0.9, 0.82];
const STATTRAK_FALLBACK = 1.7;
/** Doppler gems are rolled separately in the game (utils/itemValue.ts), so the base price uses normal phases. */
const GEM_PHASES = new Set(['Ruby', 'Sapphire', 'Black Pearl', 'Emerald']);

const RARITY = {
  'Consumer Grade': 'consumer',
  'Industrial Grade': 'industrial',
  'Mil-Spec Grade': 'milspec',
  Restricted: 'restricted',
  Classified: 'classified',
  Covert: 'covert',
  Contraband: 'contraband',
  Extraordinary: 'rare',
};
const SNIPERS = new Set(['AWP', 'SSG 08', 'SCAR-20', 'G3SG1']);
const MACHINE_GUNS = new Set(['Negev', 'M249']);

function categoryOf(skin) {
  const weapon = skin.weapon.name;
  switch (skin.category?.name) {
    case 'Knives':
      return 'knife';
    case 'Gloves':
      return 'gloves';
    case 'Pistols':
      return 'pistol';
    case 'SMGs':
      return 'smg';
    case 'Heavy':
      return MACHINE_GUNS.has(weapon) ? 'machinegun' : 'shotgun';
    case 'Rifles':
      return SNIPERS.has(weapon) ? 'sniper' : 'rifle';
    default:
      return null;
  }
}

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[™★]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

async function download(url) {
  const res = await fetch(url, { headers: { 'Accept-Encoding': 'br, gzip' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** Skins already in the catalog: name -> { id, float, prices, souvenir }. Their ids must never change or disappear. */
function previousIds() {
  const map = new Map();
  let source = '';
  try {
    source = readFileSync(new URL('src/data/catalog.ts', ROOT), 'utf8');
  } catch {
    return map;
  }
  const text = "'((?:[^'\\\\]|\\\\.)*)'";
  const row = new RegExp(`^\\s*\\[${text},${text},${text},'\\w+','\\w+',${text},([\\d.]+),`, 'gm');
  for (const m of source.matchAll(row)) {
    const unescape = (s) => s.replace(/\\(.)/g, '$1');
    const line = source.slice(m.index, source.indexOf('\n', m.index));
    const [prices = [], souvenir = []] = [...line.matchAll(/\[([\d.,]*)\]/g)].map((a) => a[1].split(',').filter(Boolean).map(Number));
    map.set(`${unescape(m[2])} | ${unescape(m[3])}`, { id: m[1], float: Number(m[5]), prices, souvenir });
  }
  return map;
}

/** Default wear shown in the shop: Field-Tested when possible, otherwise the closest available wear. */
function defaultFloat(min, max) {
  for (const i of [2, 1, 0, 3, 4]) {
    const [lo, hi] = WEAR_RANGES[i];
    const from = Math.max(lo, min);
    const to = Math.min(hi, max);
    if (from < to) return Math.round((from + (to - from) * 0.35) * 1000) / 1000;
  }
  return min;
}

/** Fills wears without listings from the nearest priced wear. Returns 0 for wears outside the float range. */
function completeWears(prices, min, max) {
  const inRange = WEAR_RANGES.map(([lo, hi]) => Math.max(lo, min) < Math.min(hi, max));
  const known = prices.map((p, i) => (inRange[i] && p > 0 ? i : -1)).filter((i) => i >= 0);
  if (known.length === 0) return null;
  return prices.map((p, i) => {
    if (!inRange[i]) return 0;
    if (p > 0) return p;
    const nearest = known.reduce((best, k) => (Math.abs(k - i) < Math.abs(best - i) ? k : best));
    return (prices[nearest] * WEAR_MULTIPLIER[i]) / WEAR_MULTIPLIER[nearest];
  });
}

const round2 = (n) => (n === 0 ? 0 : Math.max(0.03, Math.round(n * 100) / 100));

const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const imageHash = (url) => (url?.startsWith(STEAM_CDN) ? url.slice(STEAM_CDN.length) : '');

/** Official weapon cases with their real contents, mapped to catalog ids. */
function writeCases(crates, rows) {
  const star = (r) => (r[3] === 'knife' || r[3] === 'gloves' ? '★ ' : '');
  // Vanilla knives are listed as just "★ Karambit" in case contents.
  const idByName = new Map(rows.map((r) => [r[2] === 'Vanilla' ? `${star(r)}${r[1]}` : `${star(r)}${r[1]} | ${r[2]}`, r[0]]));
  const lines = [];
  for (const crate of crates) {
    const kind = crate.type === 'Case' ? 'case' : crate.type === 'Souvenir' ? 'souvenir' : null;
    if (!kind) continue;
    const ids = (list) => [...new Set((list ?? []).map((item) => idByName.get(item.name)).filter(Boolean))];
    const skins = ids(crate.contains);
    const rare = ids(crate.contains_rare);
    if (skins.length < (kind === 'souvenir' ? 3 : 1)) continue;
    lines.push(`  [${quote(`cs-${slug(crate.name)}`)},${quote(crate.name)},${quote(imageHash(crate.image))},${quote(crate.first_sale_date ?? '')},[${skins.map(quote).join(',')}],[${rare.map(quote).join(',')}],'${kind}'],`);
  }
  writeFileSync(
    new URL('src/data/officialCases.ts', ROOT),
    `// Generated by scripts/build-catalog.mjs. Official CS2 weapon cases and souvenir packages with their contents (github.com/ByMykel/CSGO-API).
export type OfficialCaseRow = [id: string, name: string, image: string, released: string, skins: string[], rare: string[], kind: 'case' | 'souvenir'];

export const OFFICIAL_CASES: OfficialCaseRow[] = [
${lines.join('\n')}
];
`,
  );
  console.log(`${lines.length} official cases and souvenir packages written.`);
}

/** EMS Katowice 2014 stickers, the most expensive stickers in the game. */
function writeKatowice(stickers, priceOf) {
  const lines = [];
  for (const sticker of stickers) {
    if (!/\| Katowice 2014$/.test(sticker.name)) continue;
    const price = priceOf(sticker.name);
    if (!price) continue;
    const name = sticker.name.replace(/^Sticker \| /, '');
    const rarity = /\(Holo\)/.test(name) ? 'covert' : /\(Foil\)/.test(name) ? 'classified' : 'restricted';
    lines.push(`  { id: ${quote(`kato14-${slug(name.replace(/ \| Katowice 2014$/, ''))}`)}, name: ${quote(name)}, rarity: '${rarity}', price: ${round2(price)}, image: CDN + ${quote(imageHash(sticker.image))}, set: 'katowice2014' },`);
  }
  writeFileSync(
    new URL('src/data/katowice2014.ts', ROOT),
    `// Generated by scripts/build-catalog.mjs. EMS Katowice 2014 stickers with Skinport prices.
import type { StickerDef } from './stickers';

const CDN = 'https://community.akamai.steamstatic.com/economy/image/';

export const KATOWICE_2014: StickerDef[] = [
${lines.join('\n')}
];
`,
  );
  console.log(`${lines.length} Katowice 2014 stickers written.`);
}

async function main() {
  const [skins, market, crates, stickers, agents, charms, music] = await Promise.all(
    [SKINS_URL, PRICES_URL, CRATES_URL, STICKERS_URL, AGENTS_URL, CHARMS_URL, MUSIC_URL].map(download),
  );
  const priceLists = new Map();
  for (const item of market) {
    const price = item.suggested_price ?? item.median_price ?? item.min_price;
    if (!price || (item.version && GEM_PHASES.has(item.version))) continue;
    const list = priceLists.get(item.market_hash_name) ?? [];
    list.push(price);
    priceLists.set(item.market_hash_name, list);
  }
  const priceOf = (name) => {
    const list = priceLists.get(name);
    return list ? median(list) : 0;
  };

  const previous = previousIds();
  const usedIds = new Set([...previous.values()].map((p) => p.id));
  const seen = new Set();
  const rows = [];

  for (const skin of skins) {
    const category = categoryOf(skin);
    const rarity = category === 'knife' ? 'rare' : RARITY[skin.rarity?.name];
    if (!category || !rarity || seen.has(skin.name)) continue;
    seen.add(skin.name);
    const vanilla = !skin.pattern;
    if (vanilla && category !== 'knife') continue;

    const star = category === 'knife' || category === 'gloves' ? '★ ' : '';
    const plain = skin.name.replace(/^★ /, '');
    const [weapon, finish = 'Vanilla'] = plain.split(' | ');
    if (vanilla) {
      // Vanilla knives have no finish and no wear: one price, stored in the first slot.
      const price = priceOf(skin.name);
      if (!price) continue;
      const st = priceOf(`★ StatTrak™ ${weapon}`);
      const id = previous.get(`${weapon} | Vanilla`)?.id ?? slug(`${weapon} vanilla`);
      usedIds.add(id);
      rows.push([id, weapon, 'Vanilla', category, rarity, skin.crates?.[0]?.name ?? 'Other', 0, 0, 0, imageHash(skin.image), [price, 0, 0, 0, 0, ...(st ? [st, 0, 0, 0, 0] : [])].map(round2), []]);
      continue;
    }
    const min = skin.min_float ?? 0;
    const max = skin.max_float ?? 1;
    const old = previous.get(`${weapon} | ${finish}`);
    // Keep yesterday's prices for a known skin nobody is selling right now, so saved items stay valid.
    const kept = old?.prices.length >= 5 ? old.prices : null;
    const normal = completeWears(
      WEARS.map((w) => priceOf(`${star}${plain} (${w})`)),
      min,
      max,
    );
    if (!normal && !kept) continue;
    let statTrak = null;
    if (!normal) {
      rows.push([old.id, weapon, finish, category, rarity, skin.collections?.[0]?.name ?? skin.crates?.[0]?.name ?? 'Other', old.float, min, max, imageHash(skin.image), kept, old.souvenir ?? []]);
      usedIds.add(old.id);
      continue;
    }
    if (skin.stattrak) {
      const raw = WEARS.map((w) => priceOf(`${star}StatTrak™ ${plain} (${w})`));
      statTrak = completeWears(raw, min, max) ?? normal.map((p) => p * STATTRAK_FALLBACK);
    }
    // Souvenir versions only exist when someone sells them; they are priced separately.
    const souvenir = skin.souvenir ? completeWears(WEARS.map((w) => priceOf(`Souvenir ${plain} (${w})`)), min, max) : null;

    let id = old?.id;
    if (!id) {
      id = slug(`${weapon} ${finish}`);
      for (let n = 2; usedIds.has(id); n++) id = `${slug(`${weapon} ${finish}`)}-${n}`;
    }
    usedIds.add(id);
    const collection = skin.collections?.[0]?.name ?? skin.crates?.[0]?.name ?? 'Other';
    const image = skin.image?.startsWith(STEAM_CDN) ? skin.image.slice(STEAM_CDN.length) : '';
    rows.push([
      id,
      weapon,
      finish,
      category,
      rarity,
      collection,
      old?.float ?? defaultFloat(min, max),
      min,
      max,
      image,
      [...normal, ...(statTrak ?? [])].map(round2),
      (souvenir ?? []).map(round2),
    ]);
  }

  // Agents, charms and music kits: no wear, one price (plus StatTrak for music kits).
  const extra = (list, category, weapon, rarities, nameOf, hashOf, collectionOf) => {
    for (const item of list) {
      const hash = hashOf(item);
      if (!hash || hash.startsWith('StatTrak') || seen.has(hash)) continue;
      seen.add(hash);
      const price = priceOf(hash);
      const rarity = rarities[item.rarity?.name];
      if (!price || !rarity) continue;
      const st = category === 'music' ? priceOf(`StatTrak™ ${hash}`) : 0;
      const finish = nameOf(item);
      const previousId = previous.get(`${weapon} | ${finish}`)?.id;
      const id = previousId ?? slug(`${category} ${finish}`);
      // Skip only true duplicates written in this run; ids from the previous catalog are meant to be reused.
      if (rows.some((r) => r[0] === id)) continue;
      usedIds.add(id);
      rows.push([id, weapon, finish, category, rarity, collectionOf(item), 0, 0, 0, imageHash(item.image), [price, 0, 0, 0, 0, ...(st ? [st, 0, 0, 0, 0] : [])].map(round2), []]);
    }
  };
  const TIERS = ['milspec', 'restricted', 'classified', 'covert'];
  extra(
    agents,
    'agent',
    'Agent',
    { Distinguished: TIERS[0], Exceptional: TIERS[1], Superior: TIERS[2], Master: TIERS[3] },
    (a) => a.name.replace(' | ', ' — '),
    (a) => a.market_hash_name ?? a.name,
    (a) => a.collections?.[0]?.name ?? 'Agents',
  );
  extra(
    charms,
    'charm',
    'Charm',
    { 'High Grade': TIERS[0], Remarkable: TIERS[1], Exotic: TIERS[2], Extraordinary: TIERS[3] },
    (k) => k.name.replace(/^Charm \| /, ''),
    (k) => k.market_hash_name ?? k.name,
    (k) => k.collections?.[0]?.name ?? 'Charms',
  );
  extra(
    music,
    'music',
    'Music Kit',
    { 'High Grade': TIERS[0] },
    (m) => m.name.replace(/^Music Kit \| /, ''),
    (m) => m.market_hash_name,
    () => 'Music Kits',
  );

  rows.sort((a, b) => a[10][2] - b[10][2] || a[0].localeCompare(b[0]));
  const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const lines = rows.map(
    (r) => `  [${q(r[0])},${q(r[1])},${q(r[2])},${q(r[3])},${q(r[4])},${q(r[5])},${r[6]},${r[7]},${r[8]},${q(r[9])},[${r[10].join(',')}],[${(r[11] ?? []).join(',')}]],`,
  );
  const date = new Date().toISOString().slice(0, 10);
  const file = `// Generated by scripts/build-catalog.mjs on ${date}. Do not edit by hand.
// Skins: github.com/ByMykel/CSGO-API. Prices: Skinport, USD, per wear (FN, MW, FT, WW, BS),
// followed by StatTrak prices when the skin has StatTrak; then Souvenir prices (empty when none).
// 0 means the wear does not exist. maxFloat 0 marks items without wear (vanilla knives, agents, charms, music kits).
import type { Rarity, WeaponCategory } from '../types/types';

export type CatalogRow = [
  id: string,
  weapon: string,
  finish: string,
  category: WeaponCategory,
  rarity: Rarity,
  collection: string,
  defaultFloat: number,
  minFloat: number,
  maxFloat: number,
  image: string,
  prices: number[],
  souvenirPrices: number[],
];

export const STEAM_CDN = '${STEAM_CDN}';

export const CATALOG: CatalogRow[] = [
${lines.join('\n')}
];
`;
  writeFileSync(new URL('src/data/catalog.ts', ROOT), file);
  const missing = [...previous.keys()].filter((name) => !rows.some((r) => `${r[1]} | ${r[2]}` === name));
  writeCases(crates, rows);
  writeKatowice(stickers, priceOf);
  console.log(`${rows.length} skins written.${missing.length ? ` Previous skins not found: ${missing.join(', ')}` : ''}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
