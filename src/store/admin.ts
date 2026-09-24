import { getSkin } from '../data/skinData';
import type { AppState, InventoryItem, LuckScope } from '../types/types';
import { LUCK_SCOPES, MAX_ADMIN_LUCK } from '../utils/adminLuck';
import { roundMoney } from '../utils/format';
import { createId } from '../utils/random';

/** Admin tools. Every change still goes through the store, so it shows up in the ledger as "admin:…". */

export function grantMoney(state: AppState, amount: number): AppState {
  if (!Number.isFinite(amount)) return state;
  return { ...state, balance: roundMoney(Math.max(0, state.balance + amount)) };
}

export function setBalance(state: AppState, amount: number): AppState {
  if (!Number.isFinite(amount) || amount < 0) return state;
  return { ...state, balance: roundMoney(amount) };
}

export function giveItems(state: AppState, skinId: string, count: number, now = Date.now()): AppState {
  const skin = getSkin(skinId);
  if (!skin) return state;
  // The unique item exists at most once.
  if (skin.adminOnly && state.inventory.some((i) => i.skinId === skinId)) return state;
  const n = skin.adminOnly ? 1 : Math.max(1, Math.min(100, Math.floor(count)));
  const items: InventoryItem[] = Array.from({ length: n }, (_, i) => ({ uid: createId('itm'), skinId, acquiredAt: now + i, origin: 'admin' }));
  return { ...state, inventory: [...items, ...state.inventory] };
}

export function removeItem(state: AppState, uid: string): AppState {
  return { ...state, inventory: state.inventory.filter((i) => i.uid !== uid), showcase: state.showcase.filter((u) => u !== uid) };
}

export function giveKeys(state: AppState, id: string, count: number): AppState {
  const n = Math.floor(count);
  if (!id || !Number.isFinite(n) || n === 0) return state;
  const value = Math.max(0, (state.keys[id] ?? 0) + n);
  const keys = { ...state.keys };
  if (value > 0) keys[id] = value;
  else delete keys[id];
  return { ...state, keys };
}

/** Sets the luck multiplier (1 = fair) and the parts of the game it applies to. */
export function setLuck(state: AppState, multiplier: number, scopes: LuckScope[]): AppState {
  if (!Number.isFinite(multiplier)) return state;
  const value = Math.round(Math.min(MAX_ADMIN_LUCK, Math.max(1, multiplier)) * 100) / 100;
  return { ...state, adminLuck: { multiplier: value, scopes: LUCK_SCOPES.filter((s) => scopes.includes(s)) } };
}

/** Makes the daily reward and the fortune wheel available right away. */
export function resetCooldowns(state: AppState): AppState {
  return { ...state, wheelLastSpin: 0, daily: { ...state.daily, lastClaimDay: null } };
}

// ---------------------------------------------------------------- restore points

const SNAPSHOT_KEY = 'cs2-upgrader:snapshots';
const SNAPSHOT_LIMIT = 5;

export interface Snapshot {
  id: string;
  t: number;
  label: string;
  balance: number;
  items: number;
  state: AppState;
}

export function listSnapshots(): Snapshot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((s) => s && typeof s.id === 'string' && s.state) : [];
  } catch {
    return [];
  }
}

function writeSnapshots(list: Snapshot[]): boolean {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Saves the current state as a restore point (the ledger is left out to keep it small). */
export function saveSnapshot(state: AppState, label: string, now = Date.now()): boolean {
  const snapshot: Snapshot = {
    id: createId('snap'),
    t: now,
    label: label.trim().slice(0, 40) || new Date(now).toLocaleString(),
    balance: state.balance,
    items: state.inventory.length,
    state: { ...state, ledger: [] },
  };
  return writeSnapshots([snapshot, ...listSnapshots()].slice(0, SNAPSHOT_LIMIT));
}

export function deleteSnapshot(id: string): void {
  writeSnapshots(listSnapshots().filter((s) => s.id !== id));
}

/** A ledger as CSV, one row per entry. */
export function ledgerCsv(state: AppState, itemName: (skinId: string) => string): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['time', 'action', 'balance_before', 'balance_after', 'change', 'items_in', 'items_out', 'reverted'];
  const rows = state.ledger.map((e) =>
    [
      new Date(e.t).toISOString(),
      e.action,
      e.balanceBefore,
      e.balanceAfter,
      roundMoney(e.balanceAfter - e.balanceBefore),
      e.itemsIn.map((i) => itemName(i.skinId)).join('; '),
      e.itemsOut.map((i) => itemName(i.skinId)).join('; '),
      e.revertedAt ? new Date(e.revertedAt).toISOString() : '',
    ]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}
