import type { AppState, InventoryItem, LedgerEntry, StickerItem } from '../types/types';
import { roundMoney } from '../utils/format';
import { createId } from '../utils/random';

/** Entries kept in the save; the oldest fall off. */
export const LEDGER_LIMIT = 1500;

function byUid<T extends { uid: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.uid, x]));
}

function moved<T extends { uid: string }>(before: T[], after: T[]): { added: T[]; removed: T[] } {
  const a = byUid(before);
  const b = byUid(after);
  return { added: after.filter((x) => !a.has(x.uid)), removed: before.filter((x) => !b.has(x.uid)) };
}

/** What moved between two states: balance, items, stickers and keys. Null when nothing did. */
export function diffLedger(prev: AppState, next: AppState, action: string, now = Date.now()): LedgerEntry | null {
  const items = moved(prev.inventory, next.inventory);
  const stickers = moved(prev.stickers, next.stickers);
  const keys: Record<string, number> = {};
  for (const id of new Set([...Object.keys(prev.keys), ...Object.keys(next.keys)])) {
    const delta = (next.keys[id] ?? 0) - (prev.keys[id] ?? 0);
    if (delta !== 0) keys[id] = delta;
  }
  const balanceChanged = Math.abs(next.balance - prev.balance) >= 0.005;
  if (!balanceChanged && items.added.length + items.removed.length + stickers.added.length + stickers.removed.length === 0 && Object.keys(keys).length === 0) {
    return null;
  }
  return {
    id: createId('led'),
    t: now,
    action,
    balanceBefore: prev.balance,
    balanceAfter: next.balance,
    itemsIn: items.added,
    itemsOut: items.removed,
    stickersIn: stickers.added,
    stickersOut: stickers.removed,
    keys,
  };
}

export function appendLedger(state: AppState, entry: LedgerEntry | null): AppState {
  return entry ? { ...state, ledger: [entry, ...state.ledger].slice(0, LEDGER_LIMIT) } : state;
}

export interface RevertResult {
  state: AppState;
  reverted: number;
  /** Items that were already gone (sold, upgraded…) and could not be taken back. */
  missing: number;
}

/** Undoes one entry's movements: money back, received items removed, lost items returned. */
function undo(state: AppState, entry: LedgerEntry, now: number): { state: AppState; missing: number } {
  const received = new Set(entry.itemsIn.map((i) => i.uid));
  const receivedStickers = new Set(entry.stickersIn.map((s) => s.uid));
  const missing =
    entry.itemsIn.filter((i) => !state.inventory.some((x) => x.uid === i.uid)).length +
    entry.stickersIn.filter((s) => !state.stickers.some((x) => x.uid === s.uid)).length;
  const owned = new Set(state.inventory.map((i) => i.uid));
  const ownedStickers = new Set(state.stickers.map((s) => s.uid));
  const inventory: InventoryItem[] = [...entry.itemsOut.filter((i) => !owned.has(i.uid)), ...state.inventory.filter((i) => !received.has(i.uid))];
  const stickers: StickerItem[] = [...entry.stickersOut.filter((s) => !ownedStickers.has(s.uid)), ...state.stickers.filter((s) => !receivedStickers.has(s.uid))];
  const keys = { ...state.keys };
  for (const [id, delta] of Object.entries(entry.keys)) {
    const value = Math.max(0, (keys[id] ?? 0) - delta);
    if (value > 0) keys[id] = value;
    else delete keys[id];
  }
  const balance = roundMoney(Math.max(0, state.balance - (entry.balanceAfter - entry.balanceBefore)));
  const ledger = state.ledger.map((e) => (e.id === entry.id ? { ...e, revertedAt: now } : e));
  return { state: { ...state, balance, inventory, stickers, keys, ledger }, missing };
}

/** Rolls back a single entry. */
export function revertEntry(state: AppState, entryId: string, now = Date.now()): RevertResult | null {
  const entry = state.ledger.find((e) => e.id === entryId);
  if (!entry || entry.revertedAt) return null;
  const result = undo(state, entry, now);
  return { state: result.state, reverted: 1, missing: result.missing };
}

/** Rolls back this entry and everything after it, newest first. */
export function revertSince(state: AppState, entryId: string, now = Date.now()): RevertResult | null {
  const index = state.ledger.findIndex((e) => e.id === entryId);
  if (index < 0) return null;
  let current = state;
  let reverted = 0;
  let missing = 0;
  for (const entry of state.ledger.slice(0, index + 1)) {
    if (entry.revertedAt) continue;
    const result = undo(current, entry, now);
    current = result.state;
    missing += result.missing;
    reverted++;
  }
  return reverted > 0 ? { state: current, reverted, missing } : null;
}

export interface FlowRow {
  action: string;
  count: number;
  moneyIn: number;
  moneyOut: number;
  /** Value of items received / given away, at today's prices. */
  itemsIn: number;
  itemsOut: number;
}

/** Totals per action: where money and skins came from and where they went. */
export function summarizeLedger(ledger: LedgerEntry[], itemValue: (item: InventoryItem) => number): FlowRow[] {
  const rows = new Map<string, FlowRow>();
  for (const e of ledger) {
    if (e.revertedAt) continue;
    const row = rows.get(e.action) ?? { action: e.action, count: 0, moneyIn: 0, moneyOut: 0, itemsIn: 0, itemsOut: 0 };
    const delta = e.balanceAfter - e.balanceBefore;
    row.count++;
    if (delta > 0) row.moneyIn += delta;
    else row.moneyOut -= delta;
    row.itemsIn += e.itemsIn.reduce((sum, i) => sum + itemValue(i), 0);
    row.itemsOut += e.itemsOut.reduce((sum, i) => sum + itemValue(i), 0);
    rows.set(e.action, row);
  }
  return [...rows.values()].sort((a, b) => b.moneyIn + b.itemsIn + b.moneyOut + b.itemsOut - (a.moneyIn + a.itemsIn + a.moneyOut + a.itemsOut));
}
