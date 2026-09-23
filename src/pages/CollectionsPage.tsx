import { Check, Library } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/common';
import { Pagination, usePagination } from '../components/Pagination';
import { SkinImage } from '../components/SkinImage';
import { useToast } from '../components/Toast';
import { COLLECTIONS, ownedBases } from '../data/collections';
import { useSound } from '../hooks/useSound';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import { launchConfetti } from '../utils/confetti';
import { formatMoney } from '../utils/format';
import { cx, rarityStyle } from '../utils/ui';

type Filter = 'all' | 'progress' | 'done';

export function CollectionsPage() {
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const { state, claimCollection } = useStore();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(
    () =>
      COLLECTIONS.map((def) => {
        const owned = ownedBases(def, state.inventory);
        return { def, owned, claimed: state.collectionsClaimed.includes(def.id), complete: owned.size === def.skins.length };
      })
        // Collections you can claim or have started come first.
        .sort((a, b) => Number(b.complete && !b.claimed) - Number(a.complete && !a.claimed) || b.owned.size / b.def.skins.length - a.owned.size / a.def.skins.length),
    [state.inventory, state.collectionsClaimed],
  );
  const visible = rows.filter((r) => (filter === 'done' ? r.claimed : filter === 'progress' ? !r.claimed && r.owned.size > 0 : true));
  const doneCount = rows.filter((r) => r.claimed).length;
  const { page, pageCount, pageItems, setPage } = usePagination(visible, 10);
  useEffect(() => setPage(0), [filter, setPage]);

  return (
    <div className="space-y-5">
      <PageHeader title={t('collections.title')} subtitle={t('collections.subtitle', { done: doneCount, total: COLLECTIONS.length })} />
      <div className="flex gap-2">
        {(['all', 'progress', 'done'] as const).map((f) => (
          <button key={f} type="button" className="chip px-4 py-2 text-sm" data-active={filter === f} onClick={() => setFilter(f)}>
            {t(`collections.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {pageItems.map(({ def, owned, claimed, complete }) => (
          <section key={def.id} className={cx('panel anim-fade-up p-4', claimed && 'border-emerald-500/40')}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                  <Library size={17} className="text-amber-300" /> {def.name}
                </h2>
                <div className="mt-1 text-xs text-slate-400">
                  {t('collections.progress', { owned: owned.size, total: def.skins.length })} · {t('collections.reward', { amount: formatMoney(def.reward), xp: def.xp })}
                </div>
              </div>
              <button
                type="button"
                disabled={!complete || claimed}
                onClick={() => {
                  const result = claimCollection(def.id);
                  if (!result.ok) {
                    toast({ type: 'error', title: t(`error.${result.error}`) });
                    return;
                  }
                  sound.play('rare');
                  launchConfetti(2600, 'gold');
                  toast({ type: 'win', title: t('collections.claimed', { name: def.name }), message: `+${formatMoney(result.value)}` });
                }}
                className={cx('btn h-9 shrink-0 px-3 text-sm', claimed ? 'btn-success' : 'btn-primary')}
              >
                {claimed ? (
                  <>
                    <Check size={14} /> {t('quests.done')}
                  </>
                ) : (
                  t('quests.claim')
                )}
              </button>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${(owned.size / def.skins.length) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {def.skins.map((skin) => {
                const have = owned.has(skin.baseId);
                return (
                  <div
                    key={skin.id}
                    style={rarityStyle(skin.rarity)}
                    title={skin.name}
                    className={cx('rarity-card relative p-1.5 text-center', !have && 'opacity-40 grayscale')}
                  >
                    {have && (
                      <span className="absolute right-1 top-1 z-10 grid size-4 place-items-center rounded-full bg-emerald-500 text-black">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                    <SkinImage skin={skin} className="h-12 w-full" />
                    <div className="truncate text-[10px] text-slate-300">{skin.finish}</div>
                    <div className="text-[10px] tabular-nums text-slate-500">{formatMoney(skin.price)}</div>
                    <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {pageCount > 1 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
      <p className="text-center text-xs text-slate-500">{t('collections.note')}</p>
    </div>
  );
}
