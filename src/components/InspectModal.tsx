import { Tag, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { RARITIES } from '../data/rarities';
import { getSticker } from '../data/stickers';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem, Skin } from '../types/types';
import { NAME_TAG_MAX_LENGTH, NAME_TAG_PRICE, STICKER_SCRAPE_STEP } from '../utils/config';
import { formatMoney } from '../utils/format';
import { itemFloat, itemPattern, itemValue } from '../utils/itemValue';
import { cx, rarityStyle } from '../utils/ui';
import { Modal } from './Modal';
import { SkinImage } from './SkinImage';
import { useToast } from './Toast';

const WEARS: [string, number, number, string][] = [
  ['FN', 0, 0.07, '#34d399'],
  ['MW', 0.07, 0.15, '#a3e635'],
  ['FT', 0.15, 0.38, '#facc15'],
  ['WW', 0.38, 0.45, '#fb923c'],
  ['BS', 0.45, 1, '#f87171'],
];
/** Where stickers sit on the weapon artwork, left to right. */
const SLOTS = ['36%', '46%', '56%', '66%'];

/** Close look at one copy: tilt and zoom, exact float, pattern, StatTrak™ kills, name tag and sticker scraping. */
export function InspectModal({ item, skin, onClose }: { item: InventoryItem | null; skin: Skin | undefined; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { setNameTag, scrapeSticker } = useStore();
  const [zoom, setZoom] = useState(1);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [tag, setTag] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTag(item?.nameTag ?? '');
    setZoom(1);
  }, [item?.uid, item?.nameTag]);

  if (!item || !skin) return null;
  const float = itemFloat(item, skin);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTilt({ x: ((e.clientX - rect.left) / rect.width - 0.5) * 18, y: ((e.clientY - rect.top) / rect.height - 0.5) * -12 });
  };

  const saveTag = (name: string) => {
    const result = setNameTag(item.uid, name);
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      return;
    }
    sound.play('pop');
    toast({ type: 'success', title: name.trim() ? t('inspect.tagSaved') : t('inspect.tagRemoved') });
  };

  const scrape = (slot: number) => {
    const result = scrapeSticker(item.uid, slot);
    if (!result.ok) return;
    sound.play(result.value.removed ? 'lose' : 'tick');
    if (result.value.removed) toast({ type: 'loss', title: t('inspect.stickerGone') });
  };

  return (
    <Modal open onClose={onClose} size="lg">
      <div style={rarityStyle(skin.rarity)}>
        <div
          ref={stageRef}
          onPointerMove={onMove}
          onPointerLeave={() => setTilt({ x: 0, y: 0 })}
          className="rarity-card relative h-72 overflow-hidden p-4 [perspective:900px]"
        >
          <div className="rarity-glow absolute inset-16 blur-3xl" />
          <div
            className="relative h-full w-full transition-transform duration-150 ease-out"
            style={{ transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${zoom})` }}
          >
            <SkinImage skin={skin} className="h-full w-full" />
            {item.stickers?.map((id, i) => {
              const def = getSticker(id);
              const wear = item.stickerWear?.[i] ?? 0;
              return def ? (
                <img
                  key={i}
                  src={def.image}
                  alt={def.name}
                  title={`${def.name} · ${Math.round(wear * 100)}%`}
                  className="absolute bottom-[36%] size-9 -translate-x-1/2 object-contain drop-shadow"
                  style={{ left: SLOTS[i], opacity: 1 - wear * 0.8 }}
                />
              ) : null;
            })}
          </div>
          <label className="absolute bottom-2 right-3 flex items-center gap-2 text-xs text-slate-400">
            <ZoomIn size={14} />
            <input type="range" min={1} max={2.5} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label={t('inspect.zoom')} className="w-28 accent-amber-400" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">
              {skin.statTrak && <span className="mr-1 font-semibold text-orange-400">StatTrak™</span>}
              {skin.souvenir && <span className="mr-1 font-semibold text-yellow-300">Souvenir</span>}
              {skin.weapon} | {skin.finish}
            </div>
            <h2 className="font-display text-2xl font-bold text-white">{item.nameTag ? `«${item.nameTag}»` : skin.finish}</h2>
            <div className="rarity-text text-xs font-bold uppercase tracking-wider">{RARITIES[skin.rarity].label}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold tabular-nums text-amber-300">{formatMoney(itemValue(item))}</div>
            <div className="text-xs text-slate-500">{t('inspect.pattern', { seed: itemPattern(item) })}</div>
          </div>
        </div>

        {skin.statTrak && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-300">{t('inspect.kills')}</span>
            <span className="font-mono text-xl font-bold tabular-nums text-orange-200">{String(item.kills ?? 0).padStart(6, '0')}</span>
          </div>
        )}

        {!skin.wearless && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>{t('inspect.float')}</span>
              <span className="font-mono tabular-nums text-white">{float.toFixed(6)}</span>
            </div>
            <div className="relative flex h-2.5 overflow-hidden rounded-full">
              {WEARS.map(([label, lo, hi, color]) => (
                <div key={label} title={label} style={{ width: `${(hi - lo) * 100}%`, background: color, opacity: 0.55 }} />
              ))}
            </div>
            <div className="relative h-3">
              <div className="absolute top-0 size-0 -translate-x-1/2 border-x-[6px] border-b-[8px] border-x-transparent border-b-white" style={{ left: `${float * 100}%` }} />
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Tag size={13} /> {t('inspect.nameTag')}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveTag(tag);
              }}
            >
              <input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={NAME_TAG_MAX_LENGTH} placeholder={t('inspect.tagPlaceholder')} aria-label={t('inspect.nameTag')} className="input h-10 flex-1" />
              <button type="submit" disabled={!tag.trim() || tag.trim() === item.nameTag} className="btn btn-primary h-10 px-3 text-sm">
                {t('inspect.tagApply', { price: formatMoney(NAME_TAG_PRICE) })}
              </button>
            </form>
            {item.nameTag && (
              <button type="button" className="mt-1 text-xs text-slate-500 underline hover:text-white" onClick={() => saveTag('')}>
                {t('inspect.tagRemove')}
              </button>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-xs text-slate-400">{t('inspect.stickers')}</div>
            {!item.stickers?.length ? (
              <p className="text-xs text-slate-500">{t('inspect.noStickers')}</p>
            ) : (
              <div className="space-y-1.5">
                {item.stickers.map((id, i) => {
                  const def = getSticker(id);
                  const wear = item.stickerWear?.[i] ?? 0;
                  const last = wear + STICKER_SCRAPE_STEP >= 1;
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1">
                      {def && <img src={def.image} alt="" className="size-8 object-contain" style={{ opacity: 1 - wear * 0.8 }} />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs text-white">{def?.name ?? id}</div>
                        <div className="text-[10px] text-slate-500">{t('inspect.wear', { percent: Math.round(wear * 100) })}</div>
                      </div>
                      <button type="button" className={cx('btn h-8 px-2 text-xs', last ? 'btn-danger' : 'btn-ghost')} onClick={() => scrape(i)} title={last ? t('inspect.scrapeLast') : undefined}>
                        {last ? t('inspect.scrapeRemove') : t('inspect.scrape')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
