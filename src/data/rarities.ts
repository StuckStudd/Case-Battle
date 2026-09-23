import type { Rarity } from '../types/types';

export interface RarityMeta {
  id: Rarity;
  label: string;
  short: string;
  color: string;
  order: number;
}

export const RARITIES: Record<Rarity, RarityMeta> = {
  consumer: { id: 'consumer', label: 'Consumer Grade', short: 'Consumer', color: '#b0c3d9', order: 0 },
  industrial: { id: 'industrial', label: 'Industrial Grade', short: 'Industrial', color: '#5e98d9', order: 1 },
  milspec: { id: 'milspec', label: 'Mil-Spec', short: 'Mil-Spec', color: '#4b69ff', order: 2 },
  restricted: { id: 'restricted', label: 'Restricted', short: 'Restricted', color: '#8847ff', order: 3 },
  classified: { id: 'classified', label: 'Classified', short: 'Classified', color: '#d32ce6', order: 4 },
  covert: { id: 'covert', label: 'Covert', short: 'Covert', color: '#eb4b4b', order: 5 },
  contraband: { id: 'contraband', label: 'Contraband', short: 'Contraband', color: '#ff8a3d', order: 6 },
  rare: { id: 'rare', label: '★ Rare Special Item', short: '★ Rare', color: '#ffd24a', order: 7 },
  legendary: { id: 'legendary', label: '♛ Legendary', short: '♛ Legend', color: '#ff4fd8', order: 8 },
};

export const RARITY_LIST: RarityMeta[] = Object.values(RARITIES).sort((a, b) => a.order - b.order);
