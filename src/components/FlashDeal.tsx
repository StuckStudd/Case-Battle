import { Percent } from 'lucide-react';
import { useMemo } from 'react';
import { FLASH_DEAL_DISCOUNT, flashDealSkin, localDay } from '../data/events';
import { BASE_SKINS } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import { formatMoney, roundMoney } from '../utils/format';
import { rarityStyle } from '../utils/ui';
import { SkinImage } from './SkinImage';
import { useToast } from './Toast';

/** Today's discounted skin, one purchase per day. */
export function FlashDeal() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, buyFlashDeal } = useStore();
  const skin = useMemo(() => flashDealSkin(BASE_SKINS), []);
  if (!skin) return null;
  const price = roundMoney(skin.price * (1 - FLASH_DEAL_DISCOUNT));
  const bought = state.flashDealDay === localDay();

  const buy = () => {
    const result = buyFlashDeal();
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('buy');
    toast({ type: 'success', title: t('shop.added', { name: skin.name }), message: `-${formatMoney(price)}` });
  };

  return (
    <section className="panel mb-4 flex flex-wrap items-center gap-4 p-3 sm:p-4" style={rarityStyle(skin.rarity)}>
      <div className="rarity-card relative h-16 w-24 shrink-0 p-1">
        <SkinImage skin={skin} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-300">
          <Percent size={13} /> {t('events.flashTitle', { percent: Math.round(FLASH_DEAL_DISCOUNT * 100) })}
        </div>
        <div className="truncate font-semibold text-white">{skin.name}</div>
        <div className="text-sm">
          <span className="mr-2 text-slate-500 line-through">{formatMoney(skin.price)}</span>
          <span className="font-display font-bold text-emerald-400">{formatMoney(price)}</span>
        </div>
      </div>
      <button type="button" className="btn btn-primary h-11 px-5" disabled={bought || state.balance < price} onClick={buy}>
        {bought ? t('events.flashBought') : t('shop.buyFor', { price: formatMoney(price) })}
      </button>
    </section>
  );
}
