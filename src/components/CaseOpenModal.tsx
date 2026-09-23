import { ArrowUpCircle, Coins, Lock, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getCaseTable } from '../data/cases';
import type { CaseDef } from '../data/cases';
import { RARITIES, RARITY_LIST } from '../data/rarities';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem } from '../types/types';
import { CASE_ROULETTE_DURATION_MS, ROULETTE_FAST_DURATION_MS, SELL_RATE } from '../utils/config';
import { rollDrop } from '../utils/dropTable';
import { celebrate } from '../utils/effects';
import { formatMoney, roundMoney } from '../utils/format';
import { levelFromXp } from '../utils/progression';
import { rarityStyle } from '../utils/ui';
import { CaseRoulette } from './CaseRoulette';
import { DropReveal } from './DropReveal';
import { Modal } from './Modal';
import { SkinImage } from './SkinImage';
import { useToast } from './Toast';

type Phase = { name: 'preview' } | { name: 'rolling'; item: InventoryItem } | { name: 'result'; item: InventoryItem };

interface CaseOpenModalProps {
  def: CaseDef | null;
  onClose: () => void;
  onUpgradeItem: (uid: string) => void;
}

const PREVIEW_COUNT = 18;

export function CaseOpenModal({ def, onClose, onUpgradeItem }: CaseOpenModalProps) {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, openShopCase, sell } = useStore();
  const [phase, setPhase] = useState<Phase>({ name: 'preview' });
  const table = useMemo(() => (def ? getCaseTable(def) : null), [def]);

  const rarityOdds = useMemo(() => {
    if (!table) return [];
    return RARITY_LIST.map((r) => ({
      rarity: r.id,
      chance: table.entries.filter((e) => e.skin.rarity === r.id).reduce((sum, e) => sum + e.chance, 0),
    })).filter((r) => r.chance > 0);
  }, [table]);

  if (!def || !table) return null;

  const level = levelFromXp(state.xp);
  const keys = state.keys[def.id] ?? 0;
  const locked = keys === 0 && level < def.minLevel;
  const wonSkin = phase.name !== 'preview' ? getSkin(phase.item.skinId) : undefined;
  const stillOwned = phase.name === 'result' && state.inventory.some((i) => i.uid === phase.item.uid);

  const close = () => {
    if (phase.name === 'rolling') return;
    setPhase({ name: 'preview' });
    onClose();
  };

  const open = () => {
    const result = openShopCase(def.id);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('click');
    setPhase({ name: 'rolling', item: result.value });
  };

  const finish = () => {
    if (phase.name !== 'rolling') return;
    const skin = getSkin(phase.item.skinId);
    if (skin) celebrate(skin, state.settings.soundEnabled);
    setPhase({ name: 'result', item: phase.item });
  };

  const sellDrop = () => {
    if (phase.name !== 'result') return;
    const result = sell(phase.item.uid);
    if (result.ok) {
      sound.play('buy');
      toast({ type: 'success', title: t('inventory.sold', { amount: formatMoney(result.value) }) });
    }
    setPhase({ name: 'preview' });
  };

  return (
    <Modal open onClose={close} dismissible={phase.name !== 'rolling'} size="lg" title={def.name}>
      {phase.name === 'preview' && (
        <div>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <img src={def.image} alt={def.name} className="anim-float h-32 object-contain drop-shadow-[0_18px_30px_rgb(var(--accent-rgb)/0.25)]" />
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">{t('cases.price')}</span>
                <span className="font-display text-lg font-bold text-amber-300">{formatMoney(def.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('cases.averageDrop')}</span>
                <span className="font-semibold text-white">{formatMoney(table.expectedValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('cases.items')}</span>
                <span className="font-semibold text-white">{table.entries.length}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px]">
                {rarityOdds.map(({ rarity, chance }) => (
                  <span key={rarity} style={rarityStyle(rarity)}>
                    <span className="rarity-text font-semibold">{RARITIES[rarity].short}</span>{' '}
                    <span className="text-slate-500">{(chance * 100).toFixed(chance < 0.01 ? 2 : 1)}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('cases.contents')}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {table.entries.slice(0, PREVIEW_COUNT).map(({ skin, chance }) => (
              <div key={skin.id} style={rarityStyle(skin.rarity)} className="rarity-card p-1.5" title={skin.name}>
                <SkinImage skin={skin} className="h-12 w-full" />
                <div className="truncate text-[10px] text-slate-300">
                  {skin.statTrak && <span className="text-orange-400">ST </span>}
                  {skin.finish}
                </div>
                <div className="flex justify-between text-[10px] tabular-nums">
                  <span className="text-white">{formatMoney(skin.price)}</span>
                  <span className="text-slate-500">{(chance * 100).toFixed(chance < 0.001 ? 3 : 2)}%</span>
                </div>
                <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
              </div>
            ))}
          </div>
          {table.entries.length > PREVIEW_COUNT && (
            <p className="mt-2 text-center text-xs text-slate-500">{t('cases.andMore', { count: table.entries.length - PREVIEW_COUNT })}</p>
          )}

          <button
            type="button"
            onClick={open}
            disabled={locked || (keys === 0 && state.balance < def.price)}
            className="btn btn-primary mt-5 h-12 w-full text-base tracking-wider"
          >
            {locked ? (
              <>
                <Lock size={16} /> {t('cases.requiresLevel', { level: def.minLevel })}
              </>
            ) : keys > 0 ? (
              t('cases.openWithKey', { count: keys })
            ) : (
              t('cases.openFor', { price: formatMoney(def.price) })
            )}
          </button>
          {!locked && keys === 0 && state.balance < def.price && (
            <p className="mt-2 text-center text-xs text-rose-400">{t('error.insufficientBalance')}</p>
          )}
        </div>
      )}

      {phase.name === 'rolling' && wonSkin && (
        <div className="py-4">
          <CaseRoulette
            winner={wonSkin}
            filler={() => rollDrop(table)}
            durationMs={state.settings.fastRoulette ? ROULETTE_FAST_DURATION_MS : CASE_ROULETTE_DURATION_MS}
            onTick={() => sound.play('tick')}
            onFinish={finish}
          />
          <p className="mt-4 text-center text-sm text-slate-500">{t('cases.opening')}</p>
        </div>
      )}

      {phase.name === 'result' && wonSkin && (
        <DropReveal skin={wonSkin}>
          {stillOwned && (
            <>
              <button type="button" className="btn btn-primary h-12" onClick={() => setPhase({ name: 'preview' })}>
                <RotateCcw size={16} /> {t('cases.openAnother')}
              </button>
              <button type="button" className="btn btn-ghost h-12" onClick={sellDrop}>
                <Coins size={16} /> {t('inventory.sellFor', { amount: formatMoney(roundMoney(wonSkin.price * SELL_RATE)) })}
              </button>
              <button
                type="button"
                className="btn btn-ghost h-12 sm:col-span-2"
                onClick={() => {
                  const uid = phase.item.uid;
                  setPhase({ name: 'preview' });
                  onClose();
                  onUpgradeItem(uid);
                }}
              >
                <ArrowUpCircle size={16} /> {t('common.upgradeIt')}
              </button>
            </>
          )}
        </DropReveal>
      )}
    </Modal>
  );
}
