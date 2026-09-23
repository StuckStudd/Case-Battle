import { SearchX, ShoppingCart, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, PageHeader } from '../components/common';
import { ItemFilters } from '../components/ItemFilters';
import { LegendsShowcase } from '../components/LegendsShowcase';
import { Pagination, usePagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { SkinCard } from '../components/SkinCard';
import { SkinImage } from '../components/SkinImage';
import { useToast } from '../components/Toast';
import { RARITIES } from '../data/rarities';
import { BASE_SKINS, getVariants } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem, Skin } from '../types/types';
import { exteriorShort } from '../utils/exterior';
import { DEFAULT_FILTERS, filterAndSort } from '../utils/filters';
import type { SkinFilterState } from '../utils/filters';
import { formatMoney } from '../utils/format';
import { cx, rarityStyle } from '../utils/ui';

interface ShopPageProps {
  onFirstPurchase: (item: InventoryItem) => void;
  onUseForUpgrade: (uid: string) => void;
}

function ShopSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="rounded-2xl border border-line p-3">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton my-3 h-24 rounded-xl" />
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton mt-2 h-4 w-28 rounded" />
          <div className="skeleton mt-3 h-9 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

const cheapest = (baseId: string) => Math.min(...getVariants(baseId).map((v) => v.price));

/** Lets the player choose wear and StatTrak before buying. */
function BuyModal({ base, onClose, onBuy }: { base: Skin | null; onClose: () => void; onBuy: (skin: Skin) => void }) {
  const t = useT();
  const balance = useStore().state.balance;
  const variants = useMemo(() => (base ? getVariants(base.baseId) : []), [base]);
  const [exterior, setExterior] = useState(base?.exterior);
  const [statTrak, setStatTrak] = useState(false);

  useEffect(() => {
    setExterior(base?.exterior);
    setStatTrak(false);
  }, [base]);

  if (!base) return null;
  const exteriors = [...new Set(variants.map((v) => v.exterior))];
  const hasStatTrak = variants.some((v) => v.statTrak);
  const chosen = variants.find((v) => v.exterior === exterior && v.statTrak === statTrak) ?? base;
  const canAfford = balance >= chosen.price;

  return (
    <Modal open onClose={onClose} size="md">
      <div style={rarityStyle(chosen.rarity)}>
        <div className="rarity-card relative mb-4 h-44 p-4">
          <div className="rarity-glow absolute inset-10 blur-2xl" />
          <SkinImage skin={chosen} className="anim-float relative h-full w-full" />
        </div>
        <div className="text-sm text-slate-500">
          {chosen.statTrak && <span className="mr-1 font-semibold text-orange-400">StatTrak™</span>}
          {chosen.weapon}
        </div>
        <h2 className="font-display text-2xl font-bold text-white">{chosen.finish}</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="rarity-text font-bold uppercase tracking-wider">{RARITIES[chosen.rarity].label}</span>
          <span className="text-slate-500">{chosen.collection}</span>
        </div>

        <div className="mb-1.5 mt-4 text-xs text-slate-400">{t('shop.wear')}</div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {exteriors.map((ext) => {
            const v = variants.find((x) => x.exterior === ext && x.statTrak === statTrak) ?? variants.find((x) => x.exterior === ext);
            return (
              <button
                key={ext}
                type="button"
                onClick={() => setExterior(ext)}
                className={cx(
                  'rounded-lg border px-2 py-1.5 text-center transition',
                  exterior === ext ? 'border-amber-400 bg-amber-400/10' : 'border-line bg-white/[0.02] hover:border-white/20',
                )}
              >
                <div className="text-xs font-bold text-white">{exteriorShort(ext)}</div>
                <div className="text-[10px] tabular-nums text-slate-400">{v ? formatMoney(v.price) : '—'}</div>
              </button>
            );
          })}
        </div>

        {hasStatTrak && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={statTrak} onChange={(e) => setStatTrak(e.target.checked)} className="size-4 accent-orange-500" />
            <span className="font-semibold text-orange-400">StatTrak™</span>
            <span className="text-xs text-slate-500">{t('shop.statTrakHint')}</span>
          </label>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-500">{t('shop.float', { float: chosen.float.toFixed(4) })}</div>
            {chosen.priceChange !== 0 && (
              <div className={cx('mt-0.5 flex items-center gap-1 text-xs', chosen.priceChange > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {chosen.priceChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {t('shop.todayChange', { change: `${chosen.priceChange > 0 ? '+' : ''}${(chosen.priceChange * 100).toFixed(1)}%` })}
              </div>
            )}
          </div>
          <div className="font-display text-3xl font-bold tabular-nums text-amber-300">{formatMoney(chosen.price)}</div>
        </div>

        <button type="button" onClick={() => onBuy(chosen)} className={cx('btn mt-4 h-12 w-full text-base', canAfford ? 'btn-primary' : 'btn-ghost')}>
          <ShoppingCart size={18} />
          {canAfford ? t('shop.buyFor', { price: formatMoney(chosen.price) }) : t('error.insufficientBalance')}
        </button>
      </div>
    </Modal>
  );
}

const SHOP_PAGE_SIZE = 60;

export function ShopPage({ onFirstPurchase, onUseForUpgrade }: ShopPageProps) {
  const t = useT();
  const { state, buy, toggleFavorite } = useStore();
  const toast = useToast();
  const sound = useSound();
  const [filters, setFilters] = useState<SkinFilterState>(DEFAULT_FILTERS);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [ready, setReady] = useState(false);
  const [buying, setBuying] = useState<Skin | null>(null);
  const favorites = useMemo(() => new Set(state.favorites), [state.favorites]);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const visible = useMemo(() => {
    const pool = affordableOnly ? BASE_SKINS.filter((s) => cheapest(s.baseId) <= state.balance) : BASE_SKINS;
    return filterAndSort(pool, (s) => s, filters, { favorites });
  }, [affordableOnly, state.balance, filters, favorites]);
  const { page, pageCount, pageItems, setPage } = usePagination(visible, SHOP_PAGE_SIZE);

  // New filters start from the first page.
  useEffect(() => setPage(0), [filters, affordableOnly, setPage]);

  const handleBuy = (skin: Skin) => {
    const isFirst = !state.onboardingComplete;
    const result = buy(skin.id);
    if (!result.ok) {
      sound.play('lose');
      toast({
        type: 'error',
        title: t(`error.${result.error}`),
        message: result.error === 'insufficientBalance' ? t('shop.needMore', { amount: formatMoney(skin.price - state.balance) }) : undefined,
      });
      return;
    }
    sound.play('buy');
    setBuying(null);
    if (isFirst) {
      onFirstPurchase(result.value);
      return;
    }
    toast({
      type: 'success',
      title: t('shop.added', { name: skin.name }),
      message: `-${formatMoney(skin.price)}`,
      action: { label: t('common.upgradeIt'), onClick: () => onUseForUpgrade(result.value.uid) },
    });
  };

  return (
    <div>
      <PageHeader
        title={t('shop.title')}
        subtitle={t('shop.subtitle')}
        actions={
          <button type="button" className="chip h-10" data-active={affordableOnly} onClick={() => setAffordableOnly((v) => !v)}>
            <Wallet size={14} /> {t('shop.affordable')}
          </button>
        }
      />

      {!state.onboardingComplete && (
        <div className="anim-fade-up mb-5 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/10 to-transparent p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Sparkles size={20} />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white">{t('shop.stepTitle')}</div>
            <div className="text-slate-400">{t('shop.stepText', { balance: formatMoney(state.balance) })}</div>
          </div>
        </div>
      )}

      <LegendsShowcase onSelect={setBuying} />

      <div className="mb-5">
        <ItemFilters value={filters} onChange={setFilters} showFavorites />
      </div>

      {!ready ? (
        <ShopSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState icon={SearchX} title={t('shop.empty')} description={t('common.tryOtherFilters')} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {pageItems.map((skin) => {
            const affordable = cheapest(skin.baseId) <= state.balance;
            return (
              <SkinCard
                key={skin.id}
                skin={skin}
                showTrend
                className="anim-fade-up"
                favorite={favorites.has(skin.id)}
                onToggleFavorite={() => toggleFavorite(skin.id)}
                footer={
                  <button
                    type="button"
                    onClick={() => setBuying(skin)}
                    className={cx('btn h-9 w-full text-sm', affordable ? 'btn-primary' : 'btn-ghost text-slate-500')}
                  >
                    <ShoppingCart size={15} />
                    {affordable ? t('shop.buy') : t('shop.notEnough')}
                  </button>
                }
              />
            );
          })}
        </div>
      )}
      {ready && pageCount > 1 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      <BuyModal base={buying} onClose={() => setBuying(null)} onBuy={handleBuy} />
    </div>
  );
}
