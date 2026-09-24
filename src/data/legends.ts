/**
 * One-of-a-kind endgame items. The first group is modelled on famous real CS items
 * (blue gems, Katowice 2014 crafts, record floats); prices are rough market estimates.
 * The second group are simulator-only prototypes priced far beyond any normal bankroll.
 */
export interface LegendDef {
  id: string;
  /** Catalog skin that provides the weapon, finish and artwork. */
  base: string;
  /** Shown after the finish, e.g. «Blue Gem #387». */
  tag: string;
  price: number;
  float: number;
  statTrak?: boolean;
  prototype?: boolean;
}

export const LEGENDS_COLLECTION = 'Legendary Items';
export const PROTOTYPES_COLLECTION = 'Simulator Prototypes';

export const LEGENDS: LegendDef[] = [
  { id: 'legend-glock-full-fade', base: 'glock-fade', tag: '100% Fade 0.0001', price: 120_000, float: 0.0001 },
  { id: 'legend-knight-fn', base: 'm4a1-s-knight', tag: 'FN 0.0004', price: 150_000, float: 0.0004 },
  { id: 'legend-medusa-0003', base: 'awp-medusa', tag: 'FN 0.0003', price: 200_000, float: 0.0003 },
  { id: 'legend-vice-fn', base: 'sport-gloves-vice', tag: 'FN 0.06', price: 300_000, float: 0.06 },
  { id: 'legend-kimono-fn', base: 'specialist-crimson-kimono', tag: 'FN 0.065', price: 350_000, float: 0.065 },
  { id: 'legend-karambit-sapphire-fn', base: 'karambit-doppler-sapphire', tag: 'Max Blue 0.008', price: 400_000, float: 0.008 },
  { id: 'legend-karambit-emerald-0001', base: 'karambit-gamma-doppler-emerald', tag: '0.0001', price: 450_000, float: 0.0001 },
  { id: 'legend-fire-serpent-st-fn', base: 'ak-47-fire-serpent', tag: 'FN 0.01', price: 500_000, float: 0.01, statTrak: true },
  { id: 'legend-butterfly-black-pearl', base: 'butterfly-doppler-black-pearl', tag: '0.0001', price: 600_000, float: 0.0001 },
  { id: 'legend-skeleton-blue-gem', base: 'skeleton-knife-case-hardened', tag: 'Blue Gem #670', price: 700_000, float: 0.04 },
  { id: 'legend-m9-blue-gem-601', base: 'm9-bayonet-case-hardened', tag: 'Blue Gem #601', price: 900_000, float: 0.02 },
  { id: 'legend-howl-titan-holo', base: 'm4a4-howl', tag: 'FN 4× Titan Holo Kato 14', price: 4_000_000, float: 0.015 },
  { id: 'legend-gungnir-0006', base: 'awp-gungnir', tag: '0.0006 FN', price: 250_000, float: 0.0006 },
  { id: 'legend-karambit-100-fade', base: 'karambit-fade', tag: '100% Fade 0.0001', price: 300_000, float: 0.0001 },
  { id: 'legend-fiveseven-blue-gem-278', base: 'five-seven-case-hardened', tag: 'Blue Gem #278', price: 350_000, float: 0.004 },
  { id: 'legend-m9-perfect-webs', base: 'm9-bayonet-crimson-web', tag: 'FN 0.06 Perfect Webs', price: 400_000, float: 0.06 },
  { id: 'legend-pandoras-box-fn', base: 'sport-pandoras-box', tag: 'FN 0.061', price: 450_000, float: 0.061 },
  { id: 'legend-wild-lotus-kato', base: 'ak-47-wild-lotus', tag: 'FN 4× Katowice 2014 Holo', price: 650_000, float: 0.012 },
  { id: 'legend-butterfly-blue-gem', base: 'butterfly-knife-case-hardened', tag: 'Blue Gem #1', price: 800_000, float: 0.03 },
  { id: 'legend-ak-blue-gem-661', base: 'ak-47-case-hardened', tag: 'Blue Gem #661', price: 1_000_000, float: 0.008 },
  { id: 'legend-karambit-blue-gem-387', base: 'karambit-case-hardened', tag: 'Blue Gem #387', price: 1_500_000, float: 0.02 },
  { id: 'legend-souvenir-dlore-0007', base: 'awp-dragon-lore', tag: 'Souvenir FN 0.0007', price: 2_000_000, float: 0.0007 },
  { id: 'legend-howl-ibp-holo', base: 'm4a4-howl', tag: 'FN 4× iBUYPOWER Holo Kato 14', price: 3_000_000, float: 0.02, statTrak: true },

  { id: 'proto-butterfly-emerald-001', base: 'butterfly-knife-gamma-doppler', tag: 'Emerald Prototype #001', price: 7_500_000, float: 0.0001, prototype: true },
  { id: 'proto-dlore-kato-set', base: 'awp-dragon-lore', tag: 'Full Katowice 2014 Holo Set', price: 15_000_000, float: 0.0001, prototype: true },
  { id: 'proto-karambit-golden-lore', base: 'karambit-lore', tag: 'Golden Prototype', price: 30_000_000, float: 0.0001, prototype: true },
  { id: 'proto-fire-serpent-one-of-one', base: 'ak-47-fire-serpent', tag: 'One of One', price: 50_000_000, float: 0.0001, statTrak: true, prototype: true },
  { id: 'proto-karambit-genesis', base: 'karambit-fade', tag: 'Genesis #000', price: 100_000_000, float: 0, prototype: true },
  { id: 'proto-butterfly-genesis', base: 'butterfly-knife-fade', tag: 'Genesis #000', price: 250_000_000, float: 0, prototype: true },
  { id: 'proto-gungnir-golden', base: 'awp-gungnir', tag: 'Golden Genesis', price: 500_000_000, float: 0, prototype: true },
  { id: 'proto-karambit-infinity', base: 'karambit-crimson-web', tag: 'Infinity', price: 1_000_000_000, float: 0, prototype: true },
];
