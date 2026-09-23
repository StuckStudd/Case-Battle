import type { InventoryItem, Skin } from '../types/types';
import { roundMoney } from '../utils/format';
import { BASE_SKINS, getSkin } from './skinData';

export interface CollectionDef {
  id: string;
  name: string;
  skins: Skin[];
  reward: number;
  xp: number;
}

/** Only collections with at least this many skins in the catalog are collectable. */
const MIN_SKINS = 3;
const REWARD_SHARE = 0.1;
const MIN_REWARD = 5;
const MAX_REWARD = 250;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const COLLECTIONS: CollectionDef[] = [...new Set(BASE_SKINS.map((s) => s.collection))]
  .map((name) => {
    const skins = BASE_SKINS.filter((s) => s.collection === name).sort((a, b) => a.price - b.price);
    const value = skins.reduce((sum, s) => sum + s.price, 0);
    return {
      id: slug(name),
      name,
      skins,
      reward: roundMoney(Math.min(MAX_REWARD, Math.max(MIN_REWARD, value * REWARD_SHARE))),
      xp: 100 + skins.length * 20,
    };
  })
  .filter((c) => c.skins.length >= MIN_SKINS)
  .sort((a, b) => a.skins.reduce((s, x) => s + x.price, 0) - b.skins.reduce((s, x) => s + x.price, 0));

/** Base skins of the collection the player currently owns in any wear / StatTrak variant. */
export function ownedBases(def: CollectionDef, inventory: readonly InventoryItem[]): Set<string> {
  const wanted = new Set(def.skins.map((s) => s.baseId));
  const owned = new Set<string>();
  for (const item of inventory) {
    const base = getSkin(item.skinId)?.baseId;
    if (base && wanted.has(base)) owned.add(base);
  }
  return owned;
}
