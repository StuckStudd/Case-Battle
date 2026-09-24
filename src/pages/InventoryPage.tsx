import { ArrowLeftRight, ArrowUpCircle, Backpack, Check, Coins, Eye, RefreshCw, ShoppingBag, Sticker, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, PageHeader } from '../components/common';
import { InspectModal } from '../components/InspectModal';
import { Inventory } from '../components/Inventory';
import { ConfirmModal, Modal } from '../components/Modal';
import { SkinImage } from '../components/SkinImage';
import { useToast } from '../components/Toast';
import { RARITIES } from '../data/rarities';
import { getSkin } from '../data/skinData';
import { getSticker } from '../data/stickers';
import { useSound } from '../hooks/useSound';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem, Page } from '../types/types';
import { offerValues } from '../utils/botEngine';
import { MAX_STICKERS_PER_ITEM, SELL_RATE } from '../utils/config';
import { formatDateTime, formatMoney, roundMoney } from '../utils/format';
import { SPECIAL_MULTIPLIER, itemFloat, itemValue } from '../utils/itemValue';
import { getInventoryValue } from '../utils/stats';
import { cx, rarityStyle } from '../utils/ui';

interface InventoryPageProps {
  onUseForUpgrade: (uid: string) => void;
  onNavigate: (page: Page) => void;
}

type Tab = 'skins' | 'stickers' | 'trades';

export function InventoryPage({ onUseForUpgrade, onNavigate }: InventoryPageProps) {
  const t = useT();
  const { state, sell, applySticker, sellSticker, refreshTrades, acceptTrade, declineTrade } = useStore();
  const toast = useToast();
  const sound = useSound();
  const [tab, setTab] = useState<Tab>('skins');
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [confirmSell, setConfirmSell] = useState(false);
  const [inspecting, setInspecting] = useState(false);

  // Resolve from live state so a removed item closes the modal instead of showing stale data.
  const openItem: InventoryItem | undefined = state.inventory.find((i) => i.uid === openUid);
  const openSkin = getSkin(openItem?.skinId);
  const openValue = openItem ? itemValue(openItem) : 0;
  const closeDetails = () => {
    setOpenUid(null);
    setConfirmSell(false);
    setInspecting(false);
  };

  // Keep a fresh set of trade offers while the trades tab is open.
  useEffect(() => {
    if (tab === 'trades' && state.tradeOffers.length === 0 && state.inventory.length > 0) refreshTrades();
  }, [tab, state.tradeOffers.length, state.inventory.length, refreshTrades]);

  const handleSell = () => {
    if (!openItem) return;
    const result = sell(openItem.uid);
    closeDetails();
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('buy');
    toast({ type: 'success', title: t('inventory.sold', { amount: formatMoney(result.value) }), message: openSkin?.name });
  };

  const handleApply = (stickerUid: string) => {
    if (!openItem) return;
    const result = applySticker(openItem.uid, stickerUid);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('pop');
  };

  const tabs: [Tab, TKey, typeof Backpack, number][] = [
    ['skins', 'inventory.tabSkins', Backpack, state.inventory.length],
    ['stickers', 'inventory.tabStickers', Sticker, state.stickers.length],
    ['trades', 'inventory.tabTrades', ArrowLeftRight, state.tradeOffers.length],
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.inventory')}
        subtitle={
          <>
            {t('inventory.summary', { count: state.inventory.length })}{' '}
            <span className="font-semibold text-white">{formatMoney(getInventoryValue(state.inventory))}</span>
          </>
        }
        actions={
          <button type="button" className="btn btn-ghost h-10 px-4 text-sm" onClick={() => onNavigate('shop')}>
            <ShoppingBag size={16} /> {t('nav.shop')}
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([id, label, Icon, count]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="chip px-4 py-2 text-sm" data-active={tab === id} onClick={() => setTab(id)}>
            <Icon size={15} /> {t(label)}
            {count > 0 && <span className="rounded bg-white/10 px-1.5 text-[10px] tabular-nums">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'skins' && (
        <Inventory
          onItemClick={(item) => {
            sound.play('click');
            setOpenUid(item.uid);
          }}
          emptyAction={
            <button type="button" className="btn btn-primary h-11 px-5" onClick={() => onNavigate('shop')}>
              <ShoppingBag size={16} /> {t('common.goToShop')}
            </button>
          }
        />
      )}

      {tab === 'stickers' &&
        (state.stickers.length === 0 ? (
          <EmptyState
            icon={Sticker}
            title={t('stickers.emptyTitle')}
            description={t('stickers.emptyText')}
            action={
              <button type="button" className="btn btn-primary h-11 px-5" onClick={() => onNavigate('cases')}>
                {t('stickers.openCapsules')}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {state.stickers.map((s) => {
              const def = getSticker(s.stickerId);
              if (!def) return null;
              return (
                <div key={s.uid} style={rarityStyle(def.rarity)} className="rarity-card anim-fade-up flex flex-col items-center p-3 text-center">
                  <img src={def.image} alt={def.name} className="h-20 object-contain" loading="lazy" />
                  <div className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-300">{def.name}</div>
                  <div className="font-display font-bold text-white">{formatMoney(def.price)}</div>
                  <button
                    type="button"
                    className="btn btn-ghost mt-2 h-8 w-full text-xs"
                    onClick={() => {
                      const result = sellSticker(s.uid);
                      if (result.ok) {
                        sound.play('buy');
                        toast({ type: 'success', title: t('inventory.sold', { amount: formatMoney(result.value) }) });
                      }
                    }}
                  >
                    <Coins size={13} /> {formatMoney(roundMoney(def.price * SELL_RATE))}
                  </button>
                  <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
                </div>
              );
            })}
          </div>
        ))}

      {tab === 'trades' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{t('trades.hint')}</p>
            <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={refreshTrades} disabled={state.inventory.length === 0}>
              <RefreshCw size={14} /> {t('trades.refresh')}
            </button>
          </div>
          {state.tradeOffers.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title={t('trades.emptyTitle')} description={t('trades.emptyText')} />
          ) : (
            state.tradeOffers.map((offer) => {
              const values = offerValues(state, offer);
              const diff = roundMoney(values.get - values.give);
              return (
                <div key={offer.id} className="panel anim-fade-up flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                  <div className="text-sm font-semibold text-white lg:w-36">
                    {offer.bot}
                    <div className="text-xs font-normal text-slate-500">{t('trades.offers')}</div>
                  </div>
                  <TradeSide label={t('trades.youGive')} skinIds={offer.give.map((uid) => state.inventory.find((i) => i.uid === uid)?.skinId ?? '')} total={values.give} />
                  <ArrowLeftRight className="mx-auto shrink-0 text-slate-600" size={20} />
                  <TradeSide label={t('trades.youGet')} skinIds={offer.get} total={values.get} />
                  <div className="flex shrink-0 flex-col items-center gap-2 lg:w-40">
                    <span className={cx('text-sm font-bold tabular-nums', diff >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {diff >= 0 ? '+' : ''}
                      {formatMoney(diff)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-success h-9 px-3 text-sm"
                        onClick={() => {
                          const result = acceptTrade(offer.id);
                          if (!result.ok) {
                            toast({ type: 'error', title: t(`error.${result.error}`) });
                            return;
                          }
                          sound.play('buy');
                          toast({ type: 'success', title: t('trades.accepted') });
                        }}
                      >
                        <Check size={15} /> {t('trades.accept')}
                      </button>
                      <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={() => declineTrade(offer.id)} aria-label={t('trades.decline')}>
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Modal open={!!openItem && !!openSkin && !confirmSell && !inspecting} onClose={closeDetails} size="md">
        {openItem && openSkin && (
          <div style={rarityStyle(openSkin.rarity)}>
            <div className="rarity-card relative mb-5 h-44 p-4">
              <div className="rarity-glow absolute inset-10 blur-2xl" />
              <SkinImage skin={openSkin} className="anim-float relative h-full w-full" />
              {openItem.stickers && openItem.stickers.length > 0 && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {openItem.stickers.map((id, i) => {
                    const def = getSticker(id);
                    return def ? <img key={i} src={def.image} alt={def.name} title={def.name} className="size-9 object-contain" /> : null;
                  })}
                </div>
              )}
            </div>
            <div className="text-sm text-slate-500">
              {openSkin.statTrak && <span className="mr-1 font-semibold text-orange-400">StatTrak™</span>}
              {openSkin.weapon}
            </div>
            <h2 className="font-display text-2xl font-bold text-white">{openItem.nameTag ? `«${openItem.nameTag}»` : openSkin.finish}</h2>
            <div className="rarity-text text-xs font-bold uppercase tracking-wider">{RARITIES[openSkin.rarity].label}</div>
            {openItem.special && (
              <div className="mt-2 inline-flex rounded-lg bg-gradient-to-r from-fuchsia-500/20 to-sky-400/20 px-2.5 py-1 text-xs font-semibold text-fuchsia-200">
                {t(`special.${openItem.special}` as TKey)} · x{SPECIAL_MULTIPLIER[openItem.special]}
              </div>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {[
                [t('inventory.price'), formatMoney(openValue)],
                [t('inventory.exterior'), `${openSkin.wearless ? '—' : openSkin.exterior}${openSkin.statTrak ? ' · StatTrak™' : ''}${openSkin.souvenir ? ' · Souvenir' : ''}`],
                [t('inventory.float'), openSkin.wearless ? '—' : itemFloat(openItem, openSkin).toFixed(6)],
                ...(openSkin.statTrak ? [[t('inspect.kills'), String(openItem.kills ?? 0)]] : []),
                [t('inventory.weapon'), openSkin.weapon],
                [t('inventory.collection'), openSkin.collection],
                [t('inventory.acquired'), formatDateTime(openItem.acquiredAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="truncate font-medium text-white" title={value}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                <span>{t('stickers.apply')}</span>
                <span>
                  {openItem.stickers?.length ?? 0}/{MAX_STICKERS_PER_ITEM}
                </span>
              </div>
              {state.stickers.length === 0 ? (
                <p className="text-xs text-slate-500">{t('stickers.none')}</p>
              ) : (
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {state.stickers.map((s) => {
                    const def = getSticker(s.stickerId);
                    if (!def) return null;
                    return (
                      <button
                        key={s.uid}
                        type="button"
                        disabled={(openItem.stickers?.length ?? 0) >= MAX_STICKERS_PER_ITEM}
                        onClick={() => handleApply(s.uid)}
                        title={`${def.name} · +${formatMoney(def.price)}`}
                        className="rounded-lg border border-line bg-white/[0.03] p-1 transition hover:border-amber-400/60 disabled:opacity-40"
                      >
                        <img src={def.image} alt={def.name} className="size-10 object-contain" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="button" className="btn btn-ghost mt-4 h-11 w-full" onClick={() => setInspecting(true)}>
              <Eye size={17} /> {t('inspect.open')}
            </button>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="btn btn-primary h-12"
                onClick={() => {
                  closeDetails();
                  onUseForUpgrade(openItem.uid);
                }}
              >
                <ArrowUpCircle size={18} /> {t('inventory.useForUpgrade')}
              </button>
              <button type="button" className="btn btn-ghost h-12" onClick={() => setConfirmSell(true)}>
                <Coins size={18} /> {t('inventory.sellFor', { amount: formatMoney(roundMoney(openValue * SELL_RATE)) })}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {inspecting && <InspectModal item={openItem ?? null} skin={openSkin} onClose={() => setInspecting(false)} />}

      <ConfirmModal
        open={confirmSell && !!openSkin}
        title={t('inventory.sellTitle')}
        message={
          openSkin &&
          t('inventory.sellConfirm', {
            name: openSkin.name,
            amount: formatMoney(roundMoney(openValue * SELL_RATE)),
            percent: Math.round(SELL_RATE * 100),
          })
        }
        confirmLabel={t('inventory.sell')}
        onConfirm={handleSell}
        onCancel={() => setConfirmSell(false)}
      />
    </div>
  );
}

function TradeSide({ label, skinIds, total }: { label: string; skinIds: string[]; total: number }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-slate-300">{formatMoney(total)}</span>
      </div>
      <div className="flex gap-2">
        {skinIds.map((id, i) => {
          const skin = getSkin(id);
          if (!skin) return null;
          return (
            <div key={`${id}-${i}`} style={rarityStyle(skin.rarity)} className="rarity-card flex min-w-0 flex-1 items-center gap-2 p-2" title={skin.name}>
              <SkinImage skin={skin} className="h-10 w-16 shrink-0" />
              <div className="min-w-0 text-xs">
                <div className="truncate text-slate-400">{skin.weapon}</div>
                <div className="truncate font-semibold text-white">{skin.finish}</div>
                <div className="tabular-nums text-slate-300">{formatMoney(skin.price)}</div>
              </div>
              <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
