import { Check, Crown } from 'lucide-react';
import { useMemo } from 'react';
import { BASE_SKINS } from '../data/skinData';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { Skin } from '../types/types';
import { formatMoney } from '../utils/format';
import { cx, rarityStyle } from '../utils/ui';
import { SkinImage } from './SkinImage';

const LEGENDARY = BASE_SKINS.filter((s) => s.rarity === 'legendary').sort((a, b) => a.price - b.price);

/** Endgame goals: every legendary item, what it costs and whether you own it. */
export function LegendsShowcase({ onSelect }: { onSelect: (skin: Skin) => void }) {
  const t = useT();
  const { state } = useStore();
  const owned = useMemo(() => new Set(state.inventory.map((i) => i.skinId)), [state.inventory]);
  const ownedCount = LEGENDARY.filter((s) => owned.has(s.id)).length;

  return (
    <section className="panel mb-5 overflow-hidden border-fuchsia-400/30 p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Crown size={18} className="text-fuchsia-300" /> {t('legends.title')}
            <span className="text-sm font-semibold text-slate-400">
              {ownedCount}/{LEGENDARY.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">{t('legends.hint')}</p>
        </div>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {LEGENDARY.map((skin) => {
          const have = owned.has(skin.id);
          return (
            <button
              key={skin.id}
              type="button"
              title={skin.name}
              style={rarityStyle(skin.rarity)}
              onClick={() => onSelect(skin)}
              className={cx('rarity-card relative w-40 shrink-0 p-2 text-left transition hover:-translate-y-0.5', have && 'ring-2 ring-emerald-400/60')}
            >
              {have && (
                <span className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                  <Check size={10} strokeWidth={3} /> {t('legends.owned')}
                </span>
              )}
              <SkinImage skin={skin} className="h-16 w-full" />
              <div className="truncate text-[10px] text-slate-400">{skin.weapon}</div>
              <div className="line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-white">{skin.finish}</div>
              <div className="mt-1 font-display text-sm font-bold tabular-nums text-fuchsia-200">{formatMoney(skin.price)}</div>
              <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
