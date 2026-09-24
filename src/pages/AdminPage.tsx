import { Coins, Download, History, KeyRound, LayoutDashboard, Lock, LogOut, RotateCcw, Save, Search, ShieldCheck, Trash2, Undo2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common';
import { ConfirmModal } from '../components/Modal';
import { Pagination, usePagination } from '../components/Pagination';
import { SkinImage } from '../components/SkinImage';
import { useToast } from '../components/Toast';
import { verifyAdminPassword } from '../data/admin';
import { CAPSULES } from '../data/capsules';
import { CASES } from '../data/cases';
import { BASE_SKINS, getSkin, getVariants } from '../data/skinData';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { deleteSnapshot, ledgerCsv, listSnapshots, saveSnapshot } from '../store/admin';
import type { Snapshot } from '../store/admin';
import { useStore } from '../store/inventoryStore';
import { summarizeLedger } from '../store/ledger';
import type { InventoryItem, LedgerEntry } from '../types/types';
import { formatDateTime, formatMoney, formatSignedMoney } from '../utils/format';
import { itemValue } from '../utils/itemValue';
import { getNetWorth } from '../utils/progression';
import { cx, rarityStyle } from '../utils/ui';

// ---------------------------------------------------------------- access

/** Unlocked for the rest of this page load only; a reload asks for the password again. */
let unlocked = false;

const LOCK_KEY = 'cs2-upgrader:admin-lock';
const MAX_FAILS = 5;
const LOCK_MS = 60_000;

function readLock(): { fails: number; until: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCK_KEY) ?? '{}');
    return { fails: Number(raw.fails) || 0, until: Number(raw.until) || 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

function writeLock(lock: { fails: number; until: number }): void {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  } catch {
    // Without storage the lock only lasts for this page load.
  }
}

function Login({ onUnlock }: { onUnlock: () => void }) {
  const t = useT();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const lock = readLock();
    if (Date.now() < lock.until) {
      setError(t('admin.locked', { seconds: Math.ceil((lock.until - Date.now()) / 1000) }));
      return;
    }
    setBusy(true);
    const ok = await verifyAdminPassword(password).catch(() => false);
    setBusy(false);
    setPassword('');
    if (ok) {
      writeLock({ fails: 0, until: 0 });
      unlocked = true;
      onUnlock();
      return;
    }
    const fails = lock.fails + 1;
    const locked = fails >= MAX_FAILS;
    writeLock({ fails: locked ? 0 : fails, until: locked ? Date.now() + LOCK_MS : 0 });
    setError(locked ? t('admin.locked', { seconds: LOCK_MS / 1000 }) : t('admin.wrong', { left: MAX_FAILS - fails }));
  };

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <form
        className="panel space-y-4 p-6 text-center"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
          <Lock size={26} />
        </div>
        <h1 className="font-display text-2xl font-bold text-white">{t('admin.title')}</h1>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('admin.password')}
          aria-label={t('admin.password')}
          className="input h-12 text-center"
          autoFocus
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button type="submit" disabled={!password || busy} className="btn btn-primary h-12 w-full">
          <ShieldCheck size={18} /> {busy ? t('admin.checking') : t('admin.enter')}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- helpers

/** Readable names for ledger actions (store action names). */
const ACTION_LABELS: Record<string, [en: string, ru: string]> = {
  buy: ['Shop purchase', 'Покупка в магазине'],
  sell: ['Item sold', 'Продажа скина'],
  startUpgrade: ['Upgrade stake', 'Ставка на апгрейд'],
  resolveUpgrade: ['Upgrade result', 'Итог апгрейда'],
  openCase: ['Free case', 'Бесплатный кейс'],
  openShopCase: ['Case opened', 'Открытие кейса'],
  openCapsule: ['Capsule opened', 'Открытие капсулы'],
  applySticker: ['Sticker applied', 'Наклейка на скин'],
  sellSticker: ['Sticker sold', 'Продажа наклейки'],
  battle: ['Case battle', 'Баттл кейсов'],
  finishBattle: ['Battle winnings', 'Выигрыш баттла'],
  tradeUp: ['Trade-up contract', 'Контракт'],
  coinflip: ['Coinflip', 'Монетка'],
  roulette: ['Roulette', 'Рулетка'],
  plinko: ['Plinko', 'Плинко'],
  startMines: ['Mines bet', 'Ставка в минах'],
  revealMine: ['Mines tile', 'Мины: ход'],
  cashOutMines: ['Mines cash-out', 'Мины: вывод'],
  startCrash: ['Crash bet', 'Ставка в Crash'],
  cashOut: ['Crash cash-out', 'Crash: вывод'],
  endCrash: ['Crash result', 'Итог Crash'],
  startTowers: ['Towers bet', 'Ставка в Towers'],
  climbTowers: ['Towers floor', 'Towers: этаж'],
  cashOutTowers: ['Towers cash-out', 'Towers: вывод'],
  startHilo: ['Hi-Lo bet', 'Ставка в Hi-Lo'],
  guessHilo: ['Hi-Lo guess', 'Hi-Lo: ход'],
  cashOutHilo: ['Hi-Lo cash-out', 'Hi-Lo: вывод'],
  jackpot: ['Jackpot deposit', 'Ставка в джекпот'],
  finishJackpot: ['Jackpot winnings', 'Выигрыш джекпота'],
  acceptTrade: ['Bot trade', 'Трейд с ботом'],
  claimQuest: ['Quest reward', 'Награда за задание'],
  claimTier: ['Battle pass reward', 'Награда пропуска'],
  claimDailyReward: ['Daily reward', 'Ежедневная награда'],
  claimCollection: ['Collection reward', 'Награда коллекции'],
  spinWheel: ['Wheel of fortune', 'Колесо удачи'],
  redeemPromo: ['Promo code', 'Промокод'],
  prestige: ['Prestige reset', 'Сброс престижа'],
  progress: ['Levels & achievements', 'Уровни и достижения'],
  resetAccount: ['Account reset', 'Сброс аккаунта'],
  importSave: ['Save imported', 'Импорт сохранения'],
  adminGrantMoney: ['Admin: money', 'Админ: деньги'],
  adminSetBalance: ['Admin: set balance', 'Админ: баланс'],
  adminGiveItems: ['Admin: items given', 'Админ: выдача скинов'],
  adminRemoveItem: ['Admin: item removed', 'Админ: удаление скина'],
  adminGiveKeys: ['Admin: keys', 'Админ: ключи'],
  adminResetCooldowns: ['Admin: cooldowns', 'Админ: сброс таймеров'],
  adminRevert: ['Admin: rollback', 'Админ: откат'],
  adminRevertSince: ['Admin: rollback', 'Админ: откат'],
  adminRestoreSnapshot: ['Admin: restore point', 'Админ: точка восстановления'],
};

function useActionLabel() {
  const ru = useStore().state.settings.language === 'ru';
  return (action: string) => ACTION_LABELS[action]?.[ru ? 1 : 0] ?? action;
}

function itemName(skinId: string): string {
  return getSkin(skinId)?.name ?? skinId;
}

function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function ItemChips({ items, tone }: { items: InventoryItem[]; tone: 'in' | 'out' }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 6).map((item) => {
        const skin = getSkin(item.skinId);
        return (
          <span
            key={item.uid}
            title={skin?.name}
            className={cx('inline-flex max-w-[220px] items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[11px]', tone === 'in' ? 'border-emerald-500/30 text-emerald-200' : 'border-rose-500/30 text-rose-200')}
          >
            {tone === 'in' ? '+' : '−'} {skin?.name ?? item.skinId} · {formatMoney(itemValue(item))}
          </span>
        );
      })}
      {items.length > 6 && <span className="text-[11px] text-slate-500">+{items.length - 6}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- overview

function Overview() {
  const t = useT();
  const label = useActionLabel();
  const { state } = useStore();
  const rows = useMemo(() => summarizeLedger(state.ledger, itemValue), [state.ledger]);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.moneyIn + r.itemsIn, r.moneyOut + r.itemsOut)));
  const totals = rows.reduce((acc, r) => ({ in: acc.in + r.moneyIn + r.itemsIn, out: acc.out + r.moneyOut + r.itemsOut }), { in: 0, out: 0 });

  const tiles: [TKey, string][] = [
    ['admin.balance', formatMoney(state.balance)],
    ['admin.netWorth', formatMoney(getNetWorth(state))],
    ['admin.items', String(state.inventory.length)],
    ['admin.entries', String(state.ledger.length)],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([key, value]) => (
          <div key={key} className="panel p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t(key)}</div>
            <div className="mt-1 font-display text-xl font-bold tabular-nums text-white">{value}</div>
          </div>
        ))}
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-bold text-white">{t('admin.flowTitle')}</h2>
        <p className="mb-4 text-xs text-slate-500">{t('admin.flowHint')}</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('admin.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2 font-semibold">{t('admin.action')}</th>
                  <th className="py-2 text-right font-semibold">{t('admin.count')}</th>
                  <th className="py-2 pl-4 font-semibold">{t('admin.cameIn')}</th>
                  <th className="py-2 pl-4 font-semibold">{t('admin.wentOut')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const inValue = r.moneyIn + r.itemsIn;
                  const outValue = r.moneyOut + r.itemsOut;
                  return (
                    <tr key={r.action} className="border-t border-line">
                      <td className="py-2 text-white">{label(r.action)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-400">{r.count}</td>
                      <td className="py-2 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded bg-emerald-500/70" style={{ width: `${(inValue / max) * 120}px` }} />
                          <span className="tabular-nums text-slate-300">{formatMoney(inValue)}</span>
                        </div>
                      </td>
                      <td className="py-2 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded bg-rose-500/70" style={{ width: `${(outValue / max) * 120}px` }} />
                          <span className="tabular-nums text-slate-300">{formatMoney(outValue)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-line font-semibold">
                  <td className="py-2 text-white" colSpan={2}>
                    {t('gameStats.total')}
                  </td>
                  <td className="py-2 pl-4 tabular-nums text-emerald-400">{formatMoney(totals.in)}</td>
                  <td className="py-2 pl-4 tabular-nums text-rose-400">{formatMoney(totals.out)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- ledger

function Ledger() {
  const t = useT();
  const label = useActionLabel();
  const toast = useToast();
  const { state, adminRevert, adminRevertSince } = useStore();
  const [action, setAction] = useState('all');
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<{ entry: LedgerEntry; mode: 'one' | 'since' } | null>(null);
  const actions = useMemo(() => [...new Set(state.ledger.map((e) => e.action))].sort((a, b) => label(a).localeCompare(label(b))), [state.ledger, label]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.ledger.filter(
      (e) =>
        (action === 'all' || e.action === action) &&
        (!q || [...e.itemsIn, ...e.itemsOut].some((i) => itemName(i.skinId).toLowerCase().includes(q)) || label(e.action).toLowerCase().includes(q)),
    );
  }, [state.ledger, action, query, label]);
  const { page, pageCount, pageItems, setPage } = usePagination(visible, 25);
  const sinceCount = confirm?.mode === 'since' ? state.ledger.findIndex((e) => e.id === confirm.entry.id) + 1 : 1;

  const doRevert = () => {
    if (!confirm) return;
    const result = confirm.mode === 'one' ? adminRevert(confirm.entry.id) : adminRevertSince(confirm.entry.id);
    setConfirm(null);
    if (!result) {
      toast({ type: 'error', title: t('admin.nothingToRevert') });
      return;
    }
    toast({
      type: 'success',
      title: t('admin.reverted', { count: result.reverted }),
      message: result.missing > 0 ? t('admin.revertMissing', { count: result.missing }) : undefined,
    });
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t('admin.searchLedger')}
            aria-label={t('admin.searchLedger')}
            className="input h-10 pl-9"
          />
        </label>
        <select
          className="input h-10 w-auto"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(0);
          }}
          aria-label={t('admin.action')}
        >
          <option value="all">{t('admin.allActions')}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {label(a)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-ghost h-10 px-3 text-sm"
          onClick={() => download(`ledger-${new Date().toISOString().slice(0, 10)}.csv`, ledgerCsv(state, itemName), 'text/csv')}
        >
          <Download size={15} /> CSV
        </button>
      </div>

      {pageItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">{t('admin.empty')}</p>
      ) : (
        <div className="space-y-2">
          {pageItems.map((e) => {
            const delta = e.balanceAfter - e.balanceBefore;
            return (
              <div key={e.id} className={cx('rounded-xl border border-line p-3', !!e.revertedAt && 'opacity-45')}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="text-xs tabular-nums text-slate-500">{formatDateTime(e.t)}</span>
                  <span className="font-semibold text-white">{label(e.action)}</span>
                  {Math.abs(delta) >= 0.005 && (
                    <span className={cx('font-semibold tabular-nums', delta > 0 ? 'text-emerald-400' : 'text-rose-400')}>{formatSignedMoney(delta)}</span>
                  )}
                  <span className="text-xs tabular-nums text-slate-500">→ {formatMoney(e.balanceAfter)}</span>
                  {Object.entries(e.keys).map(([id, n]) => (
                    <span key={id} className="inline-flex items-center gap-1 text-xs text-sky-300">
                      <KeyRound size={11} /> {n > 0 ? '+' : ''}
                      {n} {CASES.find((c) => c.id === id)?.name ?? CAPSULES.find((c) => c.id === id)?.name ?? id}
                    </span>
                  ))}
                  {e.revertedAt ? (
                    <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-300">{t('admin.revertedBadge')}</span>
                  ) : (
                    <span className="ml-auto flex gap-1.5">
                      <button type="button" className="btn btn-ghost h-8 px-2 text-xs" onClick={() => setConfirm({ entry: e, mode: 'one' })}>
                        <Undo2 size={13} /> {t('admin.revertOne')}
                      </button>
                      <button type="button" className="btn btn-ghost h-8 px-2 text-xs" onClick={() => setConfirm({ entry: e, mode: 'since' })}>
                        <RotateCcw size={13} /> {t('admin.revertSince')}
                      </button>
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  <ItemChips items={e.itemsIn} tone="in" />
                  <ItemChips items={e.itemsOut} tone="out" />
                  {e.stickersIn.length + e.stickersOut.length > 0 && (
                    <div className="text-[11px] text-slate-400">{t('admin.stickersMoved', { in: e.stickersIn.length, out: e.stickersOut.length })}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.mode === 'since' ? t('admin.revertSinceTitle', { count: sinceCount }) : t('admin.revertOneTitle')}
        message={t('admin.revertText')}
        confirmLabel={t('admin.revertConfirm')}
        tone="danger"
        onConfirm={doRevert}
        onCancel={() => setConfirm(null)}
      />
    </section>
  );
}

// ---------------------------------------------------------------- tools

function Tools() {
  const t = useT();
  const toast = useToast();
  const { state, adminGrantMoney, adminSetBalance, adminGiveItems, adminRemoveItem, adminGiveKeys, adminResetCooldowns } = useStore();
  const [amount, setAmount] = useState('1000');
  const [search, setSearch] = useState('');
  const [baseId, setBaseId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [count, setCount] = useState('1');
  const [keyId, setKeyId] = useState(CASES[0].id);
  const [keyCount, setKeyCount] = useState('1');
  const [invQuery, setInvQuery] = useState('');

  const money = Number(amount.replace(',', '.'));
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q.length < 2 ? [] : BASE_SKINS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [search]);
  const variants = baseId ? getVariants(baseId) : [];
  const inventory = useMemo(() => {
    const q = invQuery.trim().toLowerCase();
    return [...state.inventory].filter((i) => !q || itemName(i.skinId).toLowerCase().includes(q)).sort((a, b) => itemValue(b) - itemValue(a));
  }, [state.inventory, invQuery]);
  const { page, pageCount, pageItems, setPage } = usePagination(inventory, 12);

  const done = (title: string) => toast({ type: 'success', title });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <Coins size={18} className="text-amber-300" /> {t('admin.money')}
        </h2>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label={t('admin.amount')} className="input h-11" />
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="btn btn-success h-10 text-sm" disabled={!(money > 0)} onClick={() => (adminGrantMoney(money), done(t('admin.moneyAdded', { amount: formatMoney(money) })))}>
            + {t('admin.add')}
          </button>
          <button type="button" className="btn btn-danger h-10 text-sm" disabled={!(money > 0)} onClick={() => (adminGrantMoney(-money), done(t('admin.moneyTaken', { amount: formatMoney(money) })))}>
            − {t('admin.take')}
          </button>
          <button type="button" className="btn btn-ghost h-10 text-sm" disabled={!(money >= 0)} onClick={() => (adminSetBalance(money), done(t('admin.balanceSet', { amount: formatMoney(money) })))}>
            = {t('admin.set')}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[1000, 100_000, 1_000_000, 100_000_000].map((v) => (
            <button key={v} type="button" className="chip" onClick={() => setAmount(String(v))}>
              {formatMoney(v)}
            </button>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <KeyRound size={18} className="text-amber-300" /> {t('admin.keys')}
        </h2>
        <select className="input h-11" value={keyId} onChange={(e) => setKeyId(e.target.value)} aria-label={t('admin.keys')}>
          <optgroup label={t('cases.tabCases')}>
            {CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {formatMoney(c.price)}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('cases.tabCapsules')}>
            {CAPSULES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {formatMoney(c.price)}
              </option>
            ))}
          </optgroup>
        </select>
        <div className="flex gap-2">
          <input value={keyCount} onChange={(e) => setKeyCount(e.target.value)} inputMode="numeric" aria-label={t('admin.count')} className="input h-11 w-24" />
          <button type="button" className="btn btn-primary h-11 flex-1" onClick={() => (adminGiveKeys(keyId, Number(keyCount)), done(t('admin.keysGiven')))}>
            {t('admin.giveKeys')}
          </button>
        </div>
        <button type="button" className="btn btn-ghost h-10 w-full text-sm" onClick={() => (adminResetCooldowns(), done(t('admin.cooldownsReset')))}>
          <RotateCcw size={15} /> {t('admin.resetCooldowns')}
        </button>
      </section>

      <section className="panel space-y-3 p-5 lg:col-span-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <Wrench size={18} className="text-amber-300" /> {t('admin.giveItem')}
        </h2>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setBaseId(null);
            setVariantId(null);
          }}
          placeholder={t('admin.searchSkin')}
          aria-label={t('admin.searchSkin')}
          className="input h-11"
        />
        {matches.length > 0 && !baseId && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {matches.map((s) => (
              <button key={s.id} type="button" style={rarityStyle(s.rarity)} className="rarity-card p-2 text-left" onClick={() => (setBaseId(s.baseId), setVariantId(s.id))}>
                <SkinImage skin={s} className="h-14 w-full" />
                <div className="truncate text-xs text-white">{s.name}</div>
                <div className="text-[11px] tabular-nums text-slate-400">{formatMoney(s.price)}</div>
              </button>
            ))}
          </div>
        )}
        {baseId && (
          <div className="flex flex-wrap items-center gap-2">
            <select className="input h-11 w-auto flex-1" value={variantId ?? ''} onChange={(e) => setVariantId(e.target.value)} aria-label={t('shop.wear')}>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.wearless ? '' : `${v.exterior} · `}
                  {formatMoney(v.price)}
                </option>
              ))}
            </select>
            <input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" aria-label={t('admin.count')} className="input h-11 w-20" />
            <button
              type="button"
              className="btn btn-primary h-11 px-5"
              disabled={!variantId}
              onClick={() => (adminGiveItems(variantId!, Number(count) || 1), done(t('admin.itemsGiven', { count: Number(count) || 1, name: itemName(variantId!) })))}
            >
              {t('admin.give')}
            </button>
          </div>
        )}
      </section>

      <section className="panel space-y-3 p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-white">{t('admin.inventory', { count: state.inventory.length })}</h2>
          <input
            type="search"
            value={invQuery}
            onChange={(e) => {
              setInvQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t('admin.searchSkin')}
            aria-label={t('admin.searchSkin')}
            className="input h-10 w-full sm:w-64"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((item) => {
            const skin = getSkin(item.skinId);
            return (
              <div key={item.uid} className="flex items-center gap-2 rounded-xl border border-line p-2">
                {skin && <SkinImage skin={skin} className="h-10 w-14 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">{itemName(item.skinId)}</div>
                  <div className="text-xs tabular-nums text-slate-400">
                    {formatMoney(itemValue(item))} · {item.origin}
                  </div>
                </div>
                <button type="button" aria-label={t('admin.remove')} className="btn btn-ghost size-9 text-rose-300" onClick={() => (adminRemoveItem(item.uid), done(t('admin.itemRemoved')))}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
        {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- restore points

function RestorePoints() {
  const t = useT();
  const toast = useToast();
  const { state, adminRestoreSnapshot } = useStore();
  const [label, setLabel] = useState('');
  const [list, setList] = useState<Snapshot[]>(() => listSnapshots());
  const [restoring, setRestoring] = useState<Snapshot | null>(null);

  const create = () => {
    if (!saveSnapshot(state, label)) {
      toast({ type: 'error', title: t('admin.snapshotFailed') });
      return;
    }
    setLabel('');
    setList(listSnapshots());
    toast({ type: 'success', title: t('admin.snapshotSaved') });
  };

  return (
    <section className="panel space-y-4 p-5">
      <p className="text-sm text-slate-400">{t('admin.snapshotsHint')}</p>
      <div className="flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder={t('admin.snapshotName')} aria-label={t('admin.snapshotName')} className="input h-11 flex-1" />
        <button type="button" className="btn btn-primary h-11 px-5" onClick={create}>
          <Save size={16} /> {t('admin.snapshotCreate')}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t('admin.noSnapshots')}</p>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{s.label}</div>
                <div className="text-xs text-slate-500">
                  {formatDateTime(s.t)} · {formatMoney(s.balance)} · {t('admin.itemsCount', { count: s.items })}
                </div>
              </div>
              <button type="button" className="btn btn-primary h-9 px-3 text-sm" onClick={() => setRestoring(s)}>
                <RotateCcw size={14} /> {t('admin.restore')}
              </button>
              <button
                type="button"
                aria-label={t('admin.remove')}
                className="btn btn-ghost size-9 text-rose-300"
                onClick={() => {
                  deleteSnapshot(s.id);
                  setList(listSnapshots());
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!restoring}
        title={t('admin.restoreTitle', { name: restoring?.label ?? '' })}
        message={t('admin.restoreText')}
        confirmLabel={t('admin.restore')}
        tone="danger"
        onConfirm={() => {
          if (restoring) adminRestoreSnapshot(restoring.state);
          setRestoring(null);
          toast({ type: 'success', title: t('admin.restored') });
        }}
        onCancel={() => setRestoring(null)}
      />
    </section>
  );
}

// ---------------------------------------------------------------- page

type Tab = 'overview' | 'ledger' | 'tools' | 'snapshots';

export function AdminPage() {
  const t = useT();
  const [open, setOpen] = useState(unlocked);
  const [tab, setTab] = useState<Tab>('overview');

  if (!open) return <Login onUnlock={() => setOpen(true)} />;

  const tabs: [Tab, TKey, typeof History][] = [
    ['overview', 'admin.tabOverview', LayoutDashboard],
    ['ledger', 'admin.tabLedger', History],
    ['tools', 'admin.tabTools', Wrench],
    ['snapshots', 'admin.tabSnapshots', Save],
  ];

  return (
    <div>
      <PageHeader
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={
          <button
            type="button"
            className="btn btn-ghost h-10 px-3 text-sm"
            onClick={() => {
              unlocked = false;
              setOpen(false);
            }}
          >
            <LogOut size={15} /> {t('admin.logout')}
          </button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([id, key, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="chip px-4 py-2.5 text-sm" data-active={tab === id} onClick={() => setTab(id)}>
            <Icon size={15} /> {t(key)}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'ledger' && <Ledger />}
      {tab === 'tools' && <Tools />}
      {tab === 'snapshots' && <RestorePoints />}
    </div>
  );
}
