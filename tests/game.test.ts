import { describe, expect, it } from 'vitest';
import { CASES, getCaseTable } from '../src/data/cases';
import { SKINS, BASE_SKINS, getVariants } from '../src/data/skinData';
import { marketFactor } from '../src/data/market';
import { diffLedger, appendLedger, revertEntry } from '../src/store/ledger';
import { sanitizeState } from '../src/store/storage';
import * as T from '../src/store/transitions';
import type { AppState } from '../src/types/types';
import { bestOf } from '../src/utils/adminLuck';
import { buildDropTable } from '../src/utils/dropTable';
import { hiloStep, towersMultiplier } from '../src/utils/gamesEngine';
import { matchesForSlot, pickemTeams, pickemPair, validPicks } from '../src/utils/matchEngine';
import { calculateChance, getLuckBonus, prestigeBonus } from '../src/utils/upgradeEngine';
import { levelUpReward } from '../src/utils/progression';
import { localDay } from '../src/data/events';

const rich = (patch: Partial<AppState> = {}): AppState => ({ ...T.createInitialState(), balance: 1_000_000, ...patch });

describe('catalog', () => {
  it('has unique ids and positive prices', () => {
    const ids = new Set(SKINS.map((s) => s.id));
    expect(ids.size).toBe(SKINS.length);
    expect(SKINS.every((s) => Number.isFinite(s.price) && s.price > 0)).toBe(true);
  });

  it('every base skin has at least one variant', () => {
    expect(BASE_SKINS.every((s) => getVariants(s.baseId).length > 0)).toBe(true);
  });

  it('keeps market prices within sane bounds', () => {
    for (const s of BASE_SKINS.slice(0, 300)) {
      for (const hour of [0, 1000, 500_000]) {
        const f = marketFactor(s, hour);
        expect(f).toBeGreaterThan(0.6);
        expect(f).toBeLessThan(1.7);
      }
    }
  });
});

describe('cases', () => {
  it('drop tables are valid and return about 90% of the price', () => {
    for (const def of CASES) {
      const table = getCaseTable(def);
      const total = table.entries.reduce((sum, e) => sum + e.chance, 0);
      expect(total).toBeCloseTo(1, 6);
      expect(table.expectedValue / def.price).toBeGreaterThan(0.85);
      expect(table.expectedValue / def.price).toBeLessThan(0.95);
    }
  });

  it('buildDropTable hits the target expected value', () => {
    const pool = [{ price: 1 }, { price: 10 }, { price: 100 }, { price: 1000 }];
    expect(buildDropTable(pool, 20).expectedValue).toBeCloseTo(20, 4);
  });
});

describe('upgrade odds', () => {
  it('caps chance at 95% and applies luck multiplicatively', () => {
    const fair = calculateChance(35, 100, 0);
    const doubled = calculateChance(35, 100, getLuckBonus({ lossStreak: 0, lostValue: 0 }, 35, 0, 2));
    expect(doubled).toBeCloseTo(fair * 2, 1);
    expect(calculateChance(90, 100, getLuckBonus({ lossStreak: 0, lostValue: 0 }, 90, 0, 10))).toBe(95);
  });

  it('keeps the prestige bonus below break-even', () => {
    expect(prestigeBonus(100)).toBe(0.04);
    expect(0.95 * (1 + prestigeBonus(100))).toBeLessThan(1);
  });

  it('caps level-up rewards so wagering never pays for itself', () => {
    expect(levelUpReward(5)).toBe(5);
    expect(levelUpReward(5000)).toBe(20);
  });
});

describe('admin luck', () => {
  it('bestOf with luck 1 is a single fair roll, with luck 2 wins more often', () => {
    let fair = 0;
    let lucky = 0;
    for (let i = 0; i < 4000; i++) {
      if (bestOf(1, () => Math.random() < 0.5, (w) => (w ? 1 : 0))) fair++;
      if (bestOf(2, () => Math.random() < 0.5, (w) => (w ? 1 : 0))) lucky++;
    }
    expect(fair / 4000).toBeGreaterThan(0.45);
    expect(fair / 4000).toBeLessThan(0.55);
    expect(lucky / 4000).toBeGreaterThan(0.7);
  });
});

describe('games', () => {
  it('towers and hi-lo multipliers keep a house edge', () => {
    expect(towersMultiplier('hard', 1)).toBeLessThan(2);
    expect(hiloStep(7, 'higher') * (7 / 13)).toBeLessThan(1);
  });

  it('match odds include the bookmaker margin', () => {
    for (const m of matchesForSlot(12345)) {
      expect(1 / m.oddsA + 1 / m.oddsB).toBeGreaterThan(1);
      expect(m.a).not.toBe(m.b);
    }
  });

  it('pick\'em validates brackets and pays by correct picks', () => {
    const day = localDay();
    const teams = pickemTeams(day);
    const picks: string[] = [];
    for (let slot = 0; slot < 7; slot++) picks.push(pickemPair(teams, picks, slot)[0]!);
    expect(validPicks(teams, picks)).toBe(true);
    expect(validPicks(teams, [...picks.slice(0, 6), 'nope'])).toBe(false);
    const result = T.lockPickem(rich(), picks);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.results).toHaveLength(7);
      expect(T.lockPickem(result.state, picks).ok).toBe(false);
    }
  });

  it('a match bet takes the stake and pays only after settling', () => {
    const match = matchesForSlot(Math.floor(Date.now() / (15 * 60_000)))[0];
    const result = T.placeMatchBet(rich(), match.id, 'a', 100);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.balance).toBe(1_000_000 - 100);
    const settled = T.settleMatch(result.state);
    expect(settled.balance).toBeCloseTo(1_000_000 - 100 + result.value.payout, 2);
    expect(result.value.rounds.filter((r) => r === result.value.winner)).toHaveLength(13);
  });
});

describe('economy actions', () => {
  it('promo codes work once', () => {
    const first = T.redeemPromo(rich(), 'welcome');
    expect(first.ok).toBe(true);
    if (first.ok) expect(T.redeemPromo(first.state, 'WELCOME').ok).toBe(false);
  });

  it('prestige needs $1M and resets items', () => {
    expect(T.doPrestige(rich({ balance: 10 })).ok).toBe(false);
    const done = T.doPrestige(rich({ balance: 1_000_000 }));
    expect(done.ok && done.state.prestige === 1 && done.state.inventory.length === 0).toBe(true);
  });

  it('name tags cost money and stickers wear off after four scrapes', () => {
    const buy = T.buySkin(rich(), BASE_SKINS[0].id);
    expect(buy.ok).toBe(true);
    if (!buy.ok) return;
    const uid = buy.value.uid;
    const tagged = T.setNameTag(buy.state, uid, 'Best skin');
    expect(tagged.ok && tagged.state.inventory[0].nameTag).toBe('Best skin');
    let state: AppState = tagged.ok ? tagged.state : buy.state;
    state = { ...state, inventory: state.inventory.map((i) => (i.uid === uid ? { ...i, stickers: ['welcome-to-the-clutch'], stickerWear: [0] } : i)) };
    for (let i = 0; i < 3; i++) {
      const r = T.scrapeSticker(state, uid, 0);
      expect(r.ok && !r.value.removed).toBe(true);
      if (r.ok) state = r.state;
    }
    const last = T.scrapeSticker(state, uid, 0);
    expect(last.ok && last.value.removed).toBe(true);
  });
});

describe('ledger and saves', () => {
  it('rolls back a purchase', () => {
    const before = rich();
    const buy = T.buySkin(before, BASE_SKINS[5].id);
    expect(buy.ok).toBe(true);
    if (!buy.ok) return;
    const logged = appendLedger(buy.state, diffLedger(before, buy.state, 'buy'));
    const reverted = revertEntry(logged, logged.ledger[0].id);
    expect(reverted?.state.balance).toBe(before.balance);
    expect(reverted?.state.inventory).toHaveLength(0);
  });

  it('sanitizes garbage into a playable state', () => {
    const { state } = sanitizeState({ balance: 'lots', inventory: [{ skinId: 'nope' }, 'ak47-redline'], adminLuck: { multiplier: 9999 } });
    expect(state.balance).toBeGreaterThan(0);
    expect(state.inventory.map((i) => i.skinId)).toEqual(['ak47-redline']);
    expect(state.adminLuck.multiplier).toBe(100);
  });
});
