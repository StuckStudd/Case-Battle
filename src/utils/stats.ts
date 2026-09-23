import type { InventoryItem, UserStats } from '../types/types';
import { roundMoney } from './format';
import { itemValue } from './itemValue';

export function getInventoryValue(inventory: readonly InventoryItem[]): number {
  return roundMoney(inventory.reduce((sum, item) => sum + itemValue(item), 0));
}

export function getWinRate(stats: UserStats): number {
  return stats.totalUpgrades > 0 ? (stats.wins / stats.totalUpgrades) * 100 : 0;
}
