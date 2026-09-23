import { Coins, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCapsuleTable } from '../data/capsules';
import type { CapsuleDef } from '../data/capsules';
import { getSticker } from '../data/stickers';
import type { StickerDef } from '../data/stickers';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { StickerItem } from '../types/types';
import { SELL_RATE } from '../utils/config';
import { launchConfetti } from '../utils/confetti';
import { rollDrop } from '../utils/dropTable';
import { formatMoney, roundMoney } from '../utils/format';
import { prefersReducedMotion, rarityStyle } from '../utils/ui';
import { Modal } from './Modal';
import { useToast } from './Toast';

type Phase = { name: 'preview' } | { name: 'rolling'; item: StickerItem } | { name: 'result'; item: StickerItem };

/** Flicks through random stickers, slowing down, then settles on the already-decided drop. */
function StickerSpinner({ pool, winner, onDone }: { pool: () => StickerDef; winner: StickerDef; onDone: () => void }) {
  const [shown, setShown] = useState(winner);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const steps = prefersReducedMotion() ? 4 : 22;
    let i = 0;
    let timer = 0;
    const next = () => {
      i++;
      if (i >= steps) {
        setShown(winner);
        timer = window.setTimeout(() => done.current(), 400);
        return;
      }
      setShown(pool());
      timer = window.setTimeout(next, 50 + i * i * 1.2);
    };
    next();
    return () => window.clearTimeout(timer);
  }, [pool, winner]);

  return (
    <div style={rarityStyle(shown.rarity)} className="rarity-card mx-auto grid size-48 place-items-center p-4">
      <img src={shown.image} alt="" className="max-h-full object-contain" />
      <div className="rarity-bar absolute inset-x-0 bottom-0 h-1" />
    </div>
  );
}

export function CapsuleModal({ def, onClose }: { def: CapsuleDef | null; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, openCapsule, sellSticker } = useStore();
  const [phase, setPhase] = useState<Phase>({ name: 'preview' });
  const table = useMemo(() => (def ? getCapsuleTable(def) : null), [def]);
  const pool = useMemo(() => (table ? () => rollDrop(table) : null), [table]);

  if (!def || !table || !pool) return null;
  const keys = state.keys[def.id] ?? 0;
  const won = phase.name !== 'preview' ? getSticker(phase.item.stickerId) : undefined;
  const stillOwned = phase.name === 'result' && state.stickers.some((s) => s.uid === phase.item.uid);

  const close = () => {
    if (phase.name === 'rolling') return;
    setPhase({ name: 'preview' });
    onClose();
  };

  const open = () => {
    const result = openCapsule(def.id);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('click');
    setPhase({ name: 'rolling', item: result.value });
  };

  return (
    <Modal open onClose={close} dismissible={phase.name !== 'rolling'} size="lg" title={def.name}>
      {phase.name === 'preview' && (
        <div>
          <div className="flex items-center gap-4">
            <img src={def.image} alt={def.name} className="anim-float h-28 object-contain" />
            <div className="flex-1 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">{t('cases.price')}</span>
                <span className="font-display text-lg font-bold text-amber-300">{formatMoney(def.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('cases.averageDrop')}</span>
                <span className="font-semibold text-white">{formatMoney(table.expectedValue)}</span>
              </div>
            </div>
          </div>
          <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('cases.contents')}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {table.entries.map(({ skin: sticker, chance }) => (
              <div key={sticker.id} style={rarityStyle(sticker.rarity)} className="rarity-card p-1.5 text-center" title={sticker.name}>
                <img src={sticker.image} alt={sticker.name} className="mx-auto h-12 object-contain" loading="lazy" />
                <div className="flex justify-between text-[10px] tabular-nums">
                  <span className="text-white">{formatMoney(sticker.price)}</span>
                  <span className="text-slate-500">{(chance * 100).toFixed(chance < 0.01 ? 2 : 1)}%</span>
                </div>
                <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
              </div>
            ))}
          </div>
          <button type="button" onClick={open} disabled={keys === 0 && state.balance < def.price} className="btn btn-primary mt-5 h-12 w-full text-base tracking-wider">
            {keys > 0 ? t('cases.openWithKey', { count: keys }) : t('cases.openFor', { price: formatMoney(def.price) })}
          </button>
        </div>
      )}

      {phase.name === 'rolling' && won && (
        <div className="py-6">
          <StickerSpinner
            pool={pool}
            winner={won}
            onDone={() => {
              sound.play(won.price >= 20 ? 'rare' : 'win');
              if (won.price >= 5) launchConfetti(2000, won.price >= 100 ? 'gold' : 'default');
              setPhase({ name: 'result', item: phase.item });
            }}
          />
        </div>
      )}

      {phase.name === 'result' && won && (
        <div style={rarityStyle(won.rarity)} className="text-center">
          <img src={won.image} alt={won.name} className="anim-pop mx-auto h-40 object-contain" />
          <div className="mt-2 text-lg font-semibold text-white">{won.name}</div>
          <div className="mt-1 font-display text-3xl font-bold text-amber-300">{formatMoney(won.price)}</div>
          <p className="mt-1 text-xs text-slate-500">{t('stickers.addedHint')}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn btn-primary h-12" onClick={() => setPhase({ name: 'preview' })}>
              <RotateCcw size={16} /> {t('cases.openAnother')}
            </button>
            {stillOwned && (
              <button
                type="button"
                className="btn btn-ghost h-12"
                onClick={() => {
                  const result = sellSticker(phase.item.uid);
                  if (result.ok) toast({ type: 'success', title: t('inventory.sold', { amount: formatMoney(result.value) }) });
                  setPhase({ name: 'preview' });
                }}
              >
                <Coins size={16} /> {t('inventory.sellFor', { amount: formatMoney(roundMoney(won.price * SELL_RATE)) })}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
