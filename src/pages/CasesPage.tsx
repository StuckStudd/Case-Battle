import { Box, KeyRound, Lock, Search, Sticker, Swords } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BattleArena } from '../components/BattleArena';
import { CapsuleModal } from '../components/CapsuleModal';
import { CaseOpenModal } from '../components/CaseOpenModal';
import { PageHeader } from '../components/common';
import { Pagination, usePagination } from '../components/Pagination';
import { CAPSULES } from '../data/capsules';
import type { CapsuleDef } from '../data/capsules';
import { CASES, isCaseAvailable } from '../data/cases';
import type { CaseDef } from '../data/cases';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';
import { formatMoney } from '../utils/format';
import { levelFromXp } from '../utils/progression';
import { cx } from '../utils/ui';

type Tab = 'cases' | 'capsules' | 'battles';

interface BoxCardProps {
  name: string;
  image: string;
  price: number;
  keys: number;
  lockedLevel: number | null;
  /** Extra glow for the most expensive cases. */
  highRoller?: boolean;
  onClick: () => void;
}

function BoxCard({ name, image, price, keys, lockedLevel, highRoller, onClick }: BoxCardProps) {
  const t = useT();
  const locked = lockedLevel !== null && keys === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'panel anim-fade-up group relative flex flex-col items-center p-4 text-center transition hover:-translate-y-1 hover:border-amber-400/40',
        locked && 'opacity-60',
        highRoller && 'border-fuchsia-400/40 shadow-[0_0_28px_-6px_rgba(255,79,216,0.45)]',
      )}
    >
      {keys > 0 && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
          <KeyRound size={11} /> {keys}
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-6 top-6 h-24 rounded-full bg-amber-400/10 blur-2xl transition group-hover:bg-amber-400/20" />
      <img src={image} alt={name} loading="lazy" className={cx('relative h-28 object-contain transition-transform duration-300 group-hover:scale-110', locked && 'grayscale')} />
      <div className="relative mt-3 text-sm font-semibold text-white">{name}</div>
      <div className="relative mt-2 flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 font-display text-lg font-bold text-black">
        {locked && <Lock size={14} />}
        {formatMoney(price)}
      </div>
      {locked && lockedLevel !== null && <div className="relative mt-2 text-[11px] text-slate-400">{t('cases.requiresLevel', { level: lockedLevel })}</div>}
    </button>
  );
}

const SECTION_PAGE_SIZE: Record<CaseDef['kind'], number> = { premium: 100, event: 100, official: 100, souvenir: 20 };

/** One group of cases; the long souvenir package list gets search and pages. */
function CaseSection({ kind, level, keys, onSelect }: { kind: CaseDef['kind']; level: number; keys: Record<string, number>; onSelect: (def: CaseDef) => void }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const all = useMemo(() => CASES.filter((def) => def.kind === kind && isCaseAvailable(def)), [kind]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((def) => def.name.toLowerCase().includes(q)) : all;
  }, [all, query]);
  const { page, pageCount, pageItems, setPage } = usePagination(visible, SECTION_PAGE_SIZE[kind]);
  const searchable = all.length > SECTION_PAGE_SIZE[kind];
  if (all.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            {t(`cases.${kind}`)} <span className="text-sm font-semibold text-slate-500">{all.length}</span>
          </h2>
          <p className="text-sm text-slate-400">{t(`cases.${kind}Hint`)}</p>
        </div>
        {searchable && (
          <label className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={t('cases.searchSouvenir')}
              aria-label={t('cases.searchSouvenir')}
              className="input h-10 pl-9"
            />
          </label>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {pageItems.map((def) => (
          <BoxCard
            key={def.id}
            name={def.name}
            image={def.image}
            price={def.price}
            keys={keys[def.id] ?? 0}
            lockedLevel={level < def.minLevel ? def.minLevel : null}
            highRoller={def.price >= 10_000}
            onClick={() => onSelect(def)}
          />
        ))}
      </div>
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
    </section>
  );
}

export function CasesPage({ onUpgradeItem }: { onUpgradeItem: (uid: string) => void }) {
  const t = useT();
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<CaseDef | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<CapsuleDef | null>(null);
  const level = levelFromXp(state.xp);

  const tabs: [Tab, TKey, typeof Box][] = [
    ['cases', 'cases.tabCases', Box],
    ['capsules', 'cases.tabCapsules', Sticker],
    ['battles', 'cases.tabBattles', Swords],
  ];

  return (
    <div>
      <PageHeader title={t('cases.title')} subtitle={t('cases.subtitle')} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="chip px-4 py-2.5 text-sm" data-active={tab === id} onClick={() => setTab(id)}>
            <Icon size={15} /> {t(label)}
          </button>
        ))}
      </div>

      {tab === 'cases' && (
        <div className="space-y-8">
          {(['event', 'premium', 'official', 'souvenir'] as const).map((kind) => (
            <CaseSection key={kind} kind={kind} level={level} keys={state.keys} onSelect={setSelectedCase} />
          ))}
        </div>
      )}

      {tab === 'capsules' && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
          {CAPSULES.map((def) => (
            <BoxCard
              key={def.id}
              name={def.name}
              image={def.image}
              price={def.price}
              keys={state.keys[def.id] ?? 0}
              lockedLevel={null}
              onClick={() => setSelectedCapsule(def)}
            />
          ))}
        </div>
      )}

      {tab === 'battles' && <BattleArena />}

      {tab !== 'battles' && <p className="mt-6 text-center text-xs text-slate-500">{t('cases.fairness')}</p>}
      <CaseOpenModal def={selectedCase} onClose={() => setSelectedCase(null)} onUpgradeItem={onUpgradeItem} />
      <CapsuleModal def={selectedCapsule} onClose={() => setSelectedCapsule(null)} />
    </div>
  );
}
