import { buildDropTable } from '../utils/dropTable';
import type { DropTable } from '../utils/dropTable';
import { STICKERS } from './stickers';
import type { StickerDef } from './stickers';

const CDN = 'https://community.akamai.steamstatic.com/economy/image/';

export interface CapsuleDef {
  id: string;
  name: string;
  price: number;
  image: string;
  minPrice: number;
  maxPrice: number;
  returnRate: number;
  /** Only stickers of this set drop; capsules without a set never drop set stickers. */
  set?: string;
}

export const CAPSULES: CapsuleDef[] = [
  {
    id: 'chicken',
    name: 'Chicken Capsule',
    price: 0.5,
    minPrice: 0.1,
    maxPrice: 10,
    returnRate: 0.9,
    image: `${CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk7Pqna69oLs-QD3eD1OJz_rc5Sy3qzRskt2_QntuvdHOTaAAnXJdzR7IK5EKxxNzvYbjn4lTfio1bjXKptyRlJg0`,
  },
  {
    id: 'community',
    name: 'Community Sticker Capsule 1',
    price: 3,
    minPrice: 0.2,
    maxPrice: 400,
    returnRate: 0.9,
    image: `${CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk7P2jZbFjKeSKXjbembgi5rJqG3Gyw0R3sGSBnN-hdHiSbwZxX8B5E-MJsBe9wIW2Nb7m7hue1dzqPCVrsQ`,
  },
  {
    id: 'legends',
    name: 'Stockholm 2021 Legends',
    price: 20,
    minPrice: 3,
    maxPrice: 2000,
    returnRate: 0.9,
    image: `${CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk_Oaha69lcqDBX1icxOlzvuV6AS_izRhx526Hw9j8dHKVP1QjWcB0E-QC5BW7k9fmY-PqtAzaioMRm3jgznQexd7Cao8`,
  },
  {
    id: 'katowice2014',
    name: 'EMS Katowice 2014 Legends',
    price: 5000,
    minPrice: 100,
    maxPrice: 1_000_000,
    returnRate: 0.9,
    set: 'katowice2014',
    image: `${CDN}i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk5PO6OvQ8dM_DXCnHkOgktbhoHyqxxRh0tWiDnIr4dnKSOAUoC5J1TbJZ4Bi8k9HlY-Li-UWA3NcCqy5X`,
  },
];

const tables = new Map<string, DropTable<StickerDef>>();

export function getCapsuleTable(def: CapsuleDef): DropTable<StickerDef> {
  let table = tables.get(def.id);
  if (!table) {
    table = buildDropTable(
      STICKERS.filter((s) => s.set === def.set && s.price >= def.minPrice && s.price <= def.maxPrice),
      def.price * def.returnRate,
    );
    tables.set(def.id, table);
  }
  return table;
}

export function getCapsule(id: string): CapsuleDef | undefined {
  return CAPSULES.find((c) => c.id === id);
}
