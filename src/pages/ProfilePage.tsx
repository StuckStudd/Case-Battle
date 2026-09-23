import {
  Award,
  Backpack,
  Coins,
  Crown,
  LineChart,
  Lock,
  Pencil,
  Percent,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader, StatCard } from '../components/common';
import { LevelBadge } from '../components/LevelBadge';
import { Modal } from '../components/Modal';
import { NetWorthChart } from '../components/NetWorthChart';
import { SkinCard } from '../components/SkinCard';
import { ACHIEVEMENTS } from '../data/achievements';
import { FRAMES, FRAME_STYLES } from '../data/season';
import type { FrameId } from '../data/season';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { Skin } from '../types/types';
import { NICKNAME_MAX_LENGTH } from '../utils/config';
import { formatMoney, formatPercent, formatSignedMoney } from '../utils/format';
import { getNetWorth, levelFromXp } from '../utils/progression';
import { getInventoryValue, getWinRate } from '../utils/stats';
import { cx } from '../utils/ui';

const RANKS: [number, TKey][] = [
  [30, 'rank.globalElite'],
  [20, 'rank.supreme'],
  [12, 'rank.legendaryEagle'],
  [6, 'rank.goldNova'],
  [3, 'rank.silverElite'],
  [1, 'rank.silver'],
];

export function ProfilePage() {
  const t = useT();
  const { state, toggleFavorite, setShowcase, setNickname, setFrame } = useStore();
  const { stats } = state;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.nickname);
  const [pickingShowcase, setPickingShowcase] = useState(false);
  const level = levelFromXp(state.xp);
  const rank = RANKS.find(([min]) => level >= min)?.[1] ?? 'rank.silver';

  const showcaseSkins = state.showcase.flatMap((uid) => {
    const item = state.inventory.find((i) => i.uid === uid);
    const skin = getSkin(item?.skinId);
    return item && skin ? [{ uid, skin, item }] : [];
  });
  const favoriteSkins = useMemo(() => state.favorites.map((id) => getSkin(id)).filter((s): s is Skin => !!s), [state.favorites]);
  const bestUpgrades = useMemo(
    () => state.history.filter((h) => h.result === 'win').sort((a, b) => b.profit - a.profit).slice(0, 5),
    [state.history],
  );
  const unlockedCount = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.profile')} />

      <section className="panel relative flex flex-col items-center gap-5 overflow-hidden p-6 md:flex-row">
        <div className="pointer-events-none absolute -left-10 -top-20 h-48 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div
          className={cx(
            'relative grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 font-display text-3xl font-bold text-black shadow-lg shadow-amber-600/30',
            state.frame && FRAME_STYLES[state.frame as FrameId],
          )}
        >
          {(state.nickname || 'P').slice(0, 1).toUpperCase()}
        </div>
        <div className="relative w-full max-w-xs text-center md:text-left">
          {editingName ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setNickname(nameDraft);
                setEditingName(false);
              }}
            >
              <input
                autoFocus
                value={nameDraft}
                maxLength={NICKNAME_MAX_LENGTH}
                onChange={(e) => setNameDraft(e.target.value)}
                className="input h-10"
                aria-label={t('profile.nickname')}
              />
              <button type="submit" className="btn btn-primary h-10 px-4 text-sm">
                {t('common.save')}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(state.nickname);
                setEditingName(true);
              }}
              className="group inline-flex items-center gap-2 font-display text-2xl font-bold text-white"
            >
              {state.nickname || t('profile.defaultName')}
              <Pencil size={15} className="text-slate-500 group-hover:text-amber-300" />
            </button>
          )}
          <div className="mt-1 text-sm font-semibold text-amber-300">{t(rank)}</div>
          <div className="mt-3">
            <LevelBadge />
          </div>
        </div>
        <div className="relative grid w-full grid-cols-2 gap-3 md:ml-auto md:w-auto">
          <div className="rounded-xl border border-line bg-white/[0.02] px-4 py-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{t('profile.netWorth')}</div>
            <div className="font-display text-xl font-bold text-white">{formatMoney(getNetWorth(state))}</div>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] px-4 py-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{t('profile.achievements')}</div>
            <div className="font-display text-xl font-bold text-gradient">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </div>
          </div>
        </div>
      </section>

      {state.frames.length > 0 && (
        <section className="panel p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-white">{t('profile.frames')}</h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="chip" data-active={state.frame === null} onClick={() => setFrame(null)}>
              {t('profile.noFrame')}
            </button>
            {FRAMES.filter((f) => state.frames.includes(f)).map((f) => (
              <button key={f} type="button" onClick={() => setFrame(f)} className={cx('flex items-center gap-2 rounded-xl border px-3 py-2 text-sm', state.frame === f ? 'border-amber-400 bg-amber-400/10 text-white' : 'border-line text-slate-300')}>
                <span className={cx('size-6 rounded-lg bg-white/10', FRAME_STYLES[f])} />
                {t(`frame.${f}` as TKey)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Crown size={18} className="text-amber-300" /> {t('profile.showcase')}
          </h2>
          <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={() => setPickingShowcase(true)} disabled={state.inventory.length === 0}>
            <Pencil size={14} /> {t('profile.editShowcase')}
          </button>
        </div>
        {showcaseSkins.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {showcaseSkins.map(({ uid, skin, item }) => (
              <SkinCard key={uid} skin={skin} item={item} className="anim-pop" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('profile.showcaseEmpty')}</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label={t('common.balance')} value={formatMoney(state.balance)} icon={Wallet} />
        <StatCard label={t('sidebar.inventoryValue')} value={formatMoney(getInventoryValue(state.inventory))} icon={Backpack} hint={t('profile.itemsCount', { count: state.inventory.length })} />
        <StatCard label={t('stats.totalUpgrades')} value={stats.totalUpgrades} icon={Zap} />
        <StatCard label={t('sidebar.winRate')} value={formatPercent(getWinRate(stats), 1)} icon={Percent} tone="accent" />
        <StatCard label={t('stats.wins')} value={stats.wins} icon={TrendingUp} tone="win" />
        <StatCard label={t('stats.losses')} value={stats.losses} icon={TrendingDown} tone="loss" />
        <StatCard label={t('stats.totalProfit')} value={formatSignedMoney(stats.totalProfit)} icon={Coins} tone={stats.totalProfit >= 0 ? 'win' : 'loss'} />
        <StatCard label={t('stats.biggestWin')} value={formatSignedMoney(stats.biggestWin)} icon={Trophy} tone={stats.biggestWin > 0 ? 'win' : 'default'} />
        <StatCard label={t('stats.bestStreak')} value={stats.bestWinStreak} icon={Award} />
        <StatCard label={t('stats.wagered')} value={formatMoney(stats.totalWagered)} icon={Coins} />
      </div>

      <section className="panel p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-white">
          <LineChart size={18} className="text-amber-300" /> {t('profile.netWorthChart')}
        </h2>
        <p className="mb-3 text-xs text-slate-500">{t('profile.netWorthHint')}</p>
        <NetWorthChart points={state.netWorthHistory} />
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Award size={18} className="text-amber-300" /> {t('profile.achievements')}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ACHIEVEMENTS.map((def) => {
            const unlocked = !!state.achievements[def.id];
            const progress = Math.min(1, def.progress(state) / def.goal);
            return (
              <div
                key={def.id}
                className={cx(
                  'flex items-start gap-3 rounded-xl border p-3',
                  unlocked ? 'border-amber-400/40 bg-amber-400/[0.06]' : 'border-line bg-white/[0.02]',
                )}
              >
                <div className={cx('grid size-10 shrink-0 place-items-center rounded-xl', unlocked ? 'bg-amber-400 text-black' : 'bg-white/5 text-slate-600')}>
                  {unlocked ? <Trophy size={18} /> : <Lock size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cx('text-sm font-semibold', unlocked ? 'text-white' : 'text-slate-300')}>
                      {t(`ach.${def.id}.title` as TKey)}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-emerald-400">+{formatMoney(def.reward)}</span>
                  </div>
                  <div className="text-xs text-slate-500">{t(`ach.${def.id}.desc` as TKey)}</div>
                  {!unlocked && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <Trophy size={18} className="text-amber-300" /> {t('profile.bestUpgrades')}
          </h2>
          {bestUpgrades.length > 0 ? (
            <ul className="space-y-2">
              {bestUpgrades.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-300">{h.toName}</span>
                  <span className="shrink-0 text-xs text-slate-500">{formatPercent(h.chance)}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-emerald-400">{formatSignedMoney(h.profit)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{t('profile.noWins')}</p>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <Star size={18} className="text-amber-300" /> {t('profile.favorites')}
          </h2>
          {favoriteSkins.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {favoriteSkins.map((skin) => (
                <SkinCard key={skin.id} skin={skin} compact favorite onToggleFavorite={() => toggleFavorite(skin.id)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t('profile.favoritesEmpty')}</p>
          )}
        </section>
      </div>

      <Modal open={pickingShowcase} onClose={() => setPickingShowcase(false)} title={t('profile.editShowcase')} size="lg">
        <p className="mb-3 text-sm text-slate-400">{t('profile.showcasePick')}</p>
        <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {state.inventory.flatMap((item) => {
            const skin = getSkin(item.skinId);
            if (!skin) return [];
            const selected = state.showcase.includes(item.uid);
            return [
              <SkinCard
                key={item.uid}
                skin={skin}
                item={item}
                compact
                selected={selected}
                disabled={!selected && state.showcase.length >= 3}
                onClick={() =>
                  setShowcase(selected ? state.showcase.filter((u) => u !== item.uid) : [...state.showcase, item.uid])
                }
              />,
            ];
          })}
        </div>
      </Modal>
    </div>
  );
}
