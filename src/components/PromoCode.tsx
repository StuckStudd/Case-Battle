import { TicketPercent } from 'lucide-react';
import { useState } from 'react';
import { getCapsule } from '../data/capsules';
import { getCase } from '../data/cases';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { PrizeResult } from '../store/transitions';
import { formatMoney } from '../utils/format';
import { useToast } from './Toast';

export function describePrize(t: ReturnType<typeof useT>, { prize, item }: PrizeResult): string {
  if (prize.kind === 'money') return formatMoney(prize.amount);
  if (prize.kind === 'key') return t('promo.keys', { count: prize.count, name: getCase(prize.id)?.name ?? getCapsule(prize.id)?.name ?? prize.id });
  const skin = getSkin(item?.skinId);
  return skin ? `${skin.name} (${formatMoney(skin.price)})` : '';
}

/** Redeem a promo code once per save. */
export function PromoCode() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { redeemPromo } = useStore();
  const [code, setCode] = useState('');

  const redeem = () => {
    const result = redeemPromo(code);
    if (!result.ok) {
      sound.play('lose');
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('win');
    setCode('');
    toast({ type: 'win', title: t('promo.redeemed'), message: describePrize(t, result.value) });
  };

  return (
    <section className="panel p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
        <TicketPercent size={18} className="text-amber-300" /> {t('promo.title')}
      </h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          redeem();
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('promo.placeholder')}
          aria-label={t('promo.title')}
          maxLength={24}
          className="input h-11 flex-1 font-mono uppercase tracking-widest"
        />
        <button type="submit" disabled={!code.trim()} className="btn btn-primary h-11 px-5">
          {t('promo.redeem')}
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-500">{t('promo.hint')}</p>
    </section>
  );
}
