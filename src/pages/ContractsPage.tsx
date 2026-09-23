import { ArrowRight, ArrowUpCircle, Check, Repeat2, ShoppingBag, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CaseRoulette } from '../components/CaseRoulette';
import { EmptyState, PageHeader } from '../components/common';
import { DropReveal } from '../components/DropReveal';
import { Modal } from '../components/Modal';
import { Pagination, usePagination } from '../components/Pagination';
import { SkinCard } from '../components/SkinCard';
import { SkinImage } from '../components/SkinImage';
import { useToast } from '../components/Toast';
import { RARITIES } from '../data/rarities';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem, Page, Rarity, Skin } from '../types/types';
import { CASE_ROULETTE_DURATION_MS, ROULETTE_FAST_DURATION_MS } from '../utils/config';
import { CONTRACT_RETURN, CONTRACT_STEPS, checkContract } from '../utils/contractEngine';
import { rollDrop } from '../utils/dropTable';
import type { DropTable } from '../utils/dropTable';
import { celebrate } from '../utils/effects';
import { hasExtras } from '../utils/itemValue';
import { formatMoney } from '../utils/format';
import { cx, rarityStyle } from '../utils/ui';

interface Resolved {
  item: InventoryItem;
  skin: Skin;
}

type Run = { phase: 'rolling' | 'result'; item: InventoryItem; table: DropTable<Skin> };

export function ContractsPage({ onNavigate, onUpgradeItem }: { onNavigate: (page: Page) => void; onUpgradeItem: (uid: string) => void }) {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, tradeUp } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [run, setRun] = useState<Run | null>(null);

  const eligible = useMemo<Resolved[]>(
    () =>
      state.inventory
        .flatMap((item) => {
          const skin = getSkin(item.skinId);
          // Stickered or rare-pattern items are kept out: a contract would destroy their extra value.
          return skin && CONTRACT_STEPS[skin.rarity] && !hasExtras(item) ? [{ item, skin }] : [];
        })
        .sort((a, b) => a.skin.price - b.skin.price),
    [state.inventory],
  );

  const chosen = selected.flatMap((uid) => eligible.filter((r) => r.item.uid === uid));
  const rarity: Rarity | null = chosen[0]?.skin.rarity ?? null;
  const step = rarity ? CONTRACT_STEPS[rarity] : undefined;
  const needed = step?.inputs ?? 10;
  const visible = rarity ? eligible.filter((r) => r.skin.rarity === rarity) : eligible;
  const { page, pageCount, pageItems, setPage } = usePagination(visible, 16);
  const check = chosen.length === needed ? checkContract(chosen.map((c) => c.skin)) : null;
  const inputValue = chosen.reduce((sum, c) => sum + c.skin.price, 0);

  const toggle = (uid: string, skin: Skin) => {
    if (run) return;
    setSelected((list) => {
      if (list.includes(uid)) return list.filter((u) => u !== uid);
      const first = eligible.find((r) => r.item.uid === list[0]);
      if (first && first.skin.rarity !== skin.rarity) return list;
      const limit = CONTRACT_STEPS[skin.rarity]?.inputs ?? 10;
      return list.length >= limit ? list : [...list, uid];
    });
    sound.play('click');
  };

  const autoFill = () => {
    const target = rarity ?? eligible[0]?.skin.rarity;
    if (!target) return;
    const limit = CONTRACT_STEPS[target]?.inputs ?? 10;
    const pool = eligible.filter((r) => r.skin.rarity === target && !selected.includes(r.item.uid));
    setSelected((list) => [...list, ...pool.slice(0, limit - list.length).map((r) => r.item.uid)]);
  };

  const sign = () => {
    if (!check?.ok) return;
    const table = check.table;
    const result = tradeUp(selected);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('click');
    setSelected([]);
    setRun({ phase: 'rolling', item: result.value, table });
  };

  const wonSkin = run ? getSkin(run.item.skinId) : undefined;
  const outcomes = check?.ok ? check.table.entries : [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('contracts.title')} subtitle={t('contracts.subtitle', { percent: Math.round(CONTRACT_RETURN * 100) })} />

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-slate-400">
            {rarity && step ? (
              <span className="inline-flex items-center gap-2">
                <span style={rarityStyle(rarity)} className="rarity-text font-bold">{RARITIES[rarity].short}</span>
                <ArrowRight size={14} />
                <span style={rarityStyle(step.next)} className="rarity-text font-bold">{RARITIES[step.next].short}</span>
              </span>
            ) : (
              t('contracts.pickHint')
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={autoFill} disabled={eligible.length === 0}>
              <Wand2 size={15} /> {t('contracts.autoFill')}
            </button>
            {selected.length > 0 && (
              <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={() => setSelected([])}>
                <X size={15} /> {t('common.clear')}
              </button>
            )}
          </div>
        </div>

        <div className={cx('mt-4 grid gap-2', needed === 5 ? 'grid-cols-5' : 'grid-cols-5 sm:grid-cols-10')}>
          {Array.from({ length: needed }, (_, i) => {
            const c = chosen[i];
            return c ? (
              <button
                key={c.item.uid}
                type="button"
                onClick={() => toggle(c.item.uid, c.skin)}
                style={rarityStyle(c.skin.rarity)}
                className="rarity-card anim-pop aspect-square p-1"
                title={c.skin.name}
              >
                <SkinImage skin={c.skin} className="h-full w-full" />
                <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
              </button>
            ) : (
              <div key={`empty-${i}`} className="aspect-square rounded-xl border border-dashed border-white/10 bg-white/[0.015]" />
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Info label={t('contracts.selected')} value={`${chosen.length} / ${needed}`} />
          <Info label={t('contracts.inputValue')} value={formatMoney(inputValue)} />
          <Info label={t('contracts.expected')} value={check?.ok ? formatMoney(check.table.expectedValue) : '—'} />
          <Info
            label={t('contracts.range')}
            value={outcomes.length ? `${formatMoney(outcomes[outcomes.length - 1].skin.price)} – ${formatMoney(outcomes[0].skin.price)}` : '—'}
          />
        </div>

        <button type="button" onClick={sign} disabled={!check?.ok} className="btn btn-primary mt-4 h-12 w-full text-base tracking-wider">
          <Repeat2 size={18} /> {t('contracts.sign')}
        </button>
        {check && !check.ok && <p className="mt-2 text-center text-xs text-rose-400">{t(`error.${check.reason}`)}</p>}
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wide text-white">{t('contracts.yourItems')}</h2>
        {eligible.length === 0 ? (
          <EmptyState
            icon={Repeat2}
            title={t('contracts.emptyTitle')}
            description={t('contracts.emptyText')}
            action={
              <button type="button" className="btn btn-primary h-11 px-5" onClick={() => onNavigate('shop')}>
                <ShoppingBag size={16} /> {t('nav.shop')}
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {pageItems.map(({ item, skin }) => {
                const isSelected = selected.includes(item.uid);
                return (
                  <SkinCard
                    key={item.uid}
                    skin={skin}
                    item={item}
                    compact
                    selected={isSelected}
                    disabled={!!run || (!isSelected && chosen.length >= needed)}
                    onClick={() => toggle(item.uid, skin)}
                    badge={
                      isSelected ? (
                        <span className="grid size-4 place-items-center rounded-full bg-amber-400 text-black">
                          <Check size={11} strokeWidth={3} />
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </>
        )}
      </section>

      <Modal open={!!run} onClose={() => run?.phase === 'result' && setRun(null)} dismissible={run?.phase === 'result'} size="lg" title={t('contracts.title')}>
        {run && wonSkin && run.phase === 'rolling' && (
          <div className="py-4">
            <CaseRoulette
              winner={wonSkin}
              filler={() => rollDrop(run.table)}
              durationMs={state.settings.fastRoulette ? ROULETTE_FAST_DURATION_MS : CASE_ROULETTE_DURATION_MS}
              onTick={() => sound.play('tick')}
              onFinish={() => {
                celebrate(wonSkin, state.settings.soundEnabled);
                setRun({ ...run, phase: 'result' });
              }}
            />
          </div>
        )}
        {run && wonSkin && run.phase === 'result' && (
          <DropReveal skin={wonSkin}>
            <button
              type="button"
              className="btn btn-primary h-12"
              onClick={() => {
                const uid = run.item.uid;
                setRun(null);
                onUpgradeItem(uid);
              }}
            >
              <ArrowUpCircle size={16} /> {t('common.upgradeIt')}
            </button>
            <button type="button" className="btn btn-ghost h-12" onClick={() => setRun(null)}>
              {t('common.close')}
            </button>
          </DropReveal>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}
