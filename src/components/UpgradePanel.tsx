import { Clover, Volume2, VolumeX, X, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { RARITIES } from '../data/rarities';
import { useT } from '../i18n';
import type { Skin, UpgradeOutcome } from '../types/types';
import { CHANCE_PRESETS, LUCK_START_STREAK, UPGRADE_MULTIPLIERS } from '../utils/config';
import { formatMoney, formatMultiplier, formatSignedMoney } from '../utils/format';
import type { UpgradeValidation } from '../utils/upgradeEngine';
import { cx, rarityStyle } from '../utils/ui';
import { ChevronMark } from './Logo';
import { SkinImage } from './SkinImage';
import { UpgradeRoulette } from './UpgradeRoulette';
import type { WheelStatus } from './UpgradeRoulette';

export interface StakedItem {
  uid: string;
  skin: Skin;
  /** Item value including stickers and rare patterns. */
  value: number;
}

function SlotFrame({ children, highlight }: { children: ReactNode; highlight?: 'win' | 'loss' | null }) {
  return (
    <div
      className={cx(
        'relative flex h-full min-h-44 flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-[#1b1c20] to-[#141518] p-3 transition-all sm:min-h-64 sm:p-4',
        highlight === 'win' ? 'border-emerald-400 shadow-[0_0_40px_-8px_rgba(34,197,94,0.8)]' : 'border-line',
        highlight === 'loss' && 'opacity-50 grayscale',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(60%_60%_at_50%_100%,rgb(var(--accent-rgb)/0.1),transparent)]" />
      {children}
    </div>
  );
}

function EmptySlot({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-center">
      <div className="text-xs font-bold text-white sm:text-sm">{title}</div>
      {hint && <div className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{hint}</div>}
      <ChevronMark className="anim-float mt-4 size-16 opacity-90 drop-shadow-[0_0_24px_rgb(var(--accent-rgb)/0.45)] sm:size-24" />
    </div>
  );
}

interface StakeSlotProps {
  items: StakedItem[];
  balance: number;
  total: number;
  busy: boolean;
  lost: boolean;
  onRemove: (uid: string) => void;
}

function StakeSlot({ items, balance, total, busy, lost, onRemove }: StakeSlotProps) {
  const t = useT();
  if (items.length === 0 && balance <= 0) {
    return (
      <SlotFrame>
        <EmptySlot title={t('upgrade.stakeEmpty')} hint={t('upgrade.stakeHint')} />
      </SlotFrame>
    );
  }
  const shown = items.slice(0, 4);
  return (
    <SlotFrame highlight={lost ? 'loss' : null}>
      <div className="relative mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <span>{t('upgrade.yourStake')}</span>
        <span className="text-amber-300">{t('upgrade.skinsCount', { count: items.length })}</span>
      </div>
      <div className={cx('relative grid flex-1 gap-1.5', shown.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
        {shown.map(({ uid, skin }) => (
          <div
            key={uid}
            style={rarityStyle(skin.rarity)}
            className="rarity-card anim-pop flex min-h-0 flex-col items-center justify-center p-1.5"
          >
            {!busy && (
              <button
                type="button"
                aria-label={`Remove ${skin.name}`}
                onClick={() => onRemove(uid)}
                className="absolute right-1 top-1 z-10 rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
            <SkinImage skin={skin} className={cx('w-full', shown.length > 1 ? 'h-10 sm:h-14' : 'h-20 sm:h-28')} />
            <div className="w-full truncate text-center text-[10px] text-slate-400">{skin.finish}</div>
            <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
          </div>
        ))}
        {items.length === 0 && (
          <div className="grid place-items-center">
            <ChevronMark className="size-16 opacity-80" />
          </div>
        )}
      </div>
      <div className="relative mt-2 space-y-0.5 text-center">
        {items.length > 4 && <div className="text-[10px] text-slate-500">{t('upgrade.moreSkins', { count: items.length - 4 })}</div>}
        {balance > 0 && <div className="text-[11px] text-amber-300">{t('upgrade.plusBalance', { amount: formatMoney(balance) })}</div>}
        <div className="font-display text-lg font-bold tabular-nums text-white sm:text-2xl">{formatMoney(total)}</div>
      </div>
    </SlotFrame>
  );
}

interface TargetSlotProps {
  skin: Skin | null;
  busy: boolean;
  won: boolean;
  onClear: () => void;
}

function TargetSlot({ skin, busy, won, onClear }: TargetSlotProps) {
  const t = useT();
  if (!skin) {
    return (
      <SlotFrame>
        <EmptySlot title={t('upgrade.targetEmpty')} />
      </SlotFrame>
    );
  }
  return (
    <SlotFrame highlight={won ? 'win' : null}>
      <div style={rarityStyle(skin.rarity)} className="relative flex flex-1 flex-col items-center justify-center">
        {!busy && (
          <button
            type="button"
            aria-label={t('upgrade.clearTarget')}
            onClick={onClear}
            className="absolute -right-1 -top-1 z-10 rounded-lg p-1 text-slate-500 hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
        <div className="rarity-glow absolute inset-6 opacity-70 blur-2xl" />
        <SkinImage skin={skin} className="anim-float relative h-20 w-full sm:h-32" />
        <div className="relative mt-2 w-full min-w-0 text-center">
          <div className="truncate text-[10px] text-slate-500 sm:text-xs">{skin.weapon}</div>
          <div className="truncate text-xs font-semibold text-white sm:text-base" title={skin.name}>
            {skin.finish}
          </div>
          <div className="rarity-text text-[10px] font-bold uppercase tracking-wider">{RARITIES[skin.rarity].short}</div>
          <div className="font-display text-lg font-bold tabular-nums text-amber-300 sm:text-2xl">{formatMoney(skin.price)}</div>
        </div>
      </div>
    </SlotFrame>
  );
}

const PRESET_TONES = ['border-rose-500/70 text-rose-300', 'border-amber-400/80 text-amber-300', 'border-emerald-500/70 text-emerald-300'];

interface UpgradePanelProps {
  stakeItems: StakedItem[];
  stakeBalance: number;
  stakeTotal: number;
  maxBalance: number;
  onBalanceChange: (amount: number) => void;
  onRemoveItem: (uid: string) => void;
  target: Skin | null;
  onClearTarget: () => void;
  validation: UpgradeValidation;
  status: WheelStatus;
  outcome: UpgradeOutcome | null;
  durationMs: number;
  busy: boolean;
  onUpgrade: () => void;
  onMultiplier: (multiplier: number) => void;
  onChancePreset: (chance: number) => void;
  soundEnabled: boolean;
  fastMode: boolean;
  onToggleSound: () => void;
  onToggleFast: () => void;
  onTick: () => void;
  onSpinEnd: () => void;
  luckBonus: number;
  lossStreak: number;
}

export function UpgradePanel(props: UpgradePanelProps) {
  const t = useT();
  const { validation, busy, status, stakeTotal } = props;
  const ok = validation.ok ? validation : null;
  const canQuickPick = stakeTotal > 0 && !busy;

  return (
    <section className="panel relative p-3 sm:p-5" aria-label={t('nav.upgrade')}>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          aria-label={props.soundEnabled ? t('upgrade.mute') : t('upgrade.unmute')}
          onClick={props.onToggleSound}
          className={cx('rounded-lg p-2 transition hover:bg-white/5', props.soundEnabled ? 'text-amber-300' : 'text-slate-600')}
        >
          {props.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          type="button"
          aria-label={t('upgrade.fastMode')}
          aria-pressed={props.fastMode}
          onClick={props.onToggleFast}
          className={cx('rounded-lg p-2 transition hover:bg-white/5', props.fastMode ? 'text-amber-300' : 'text-slate-600')}
        >
          <Zap size={18} fill={props.fastMode ? 'currentColor' : 'none'} />
        </button>
        {props.lossStreak >= LUCK_START_STREAK && (
          <span
            className={cx(
              'anim-fade-in ml-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              props.luckBonus > 0
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/[0.03] text-slate-500',
            )}
            title={t('luck.tooltip', { count: props.lossStreak })}
          >
            <Clover size={13} />
            {t('luck.badge', { percent: (props.luckBonus * 100).toFixed(1) })}
          </span>
        )}
        {ok && (
          <div className="ml-auto flex items-center gap-3 text-xs tabular-nums">
            <span className="text-slate-400">{formatMultiplier(ok.multiplier)}</span>
            <span className="text-emerald-400">{formatSignedMoney(ok.potentialProfit)}</span>
            <span className="text-rose-400">{formatSignedMoney(-ok.potentialLoss)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-[1fr_minmax(260px,320px)_1fr] lg:gap-5">
        <div className="col-span-2 flex items-center justify-center lg:order-2 lg:col-span-1">
          <UpgradeRoulette
            chance={ok?.chance ?? null}
            status={status}
            outcome={props.outcome}
            durationMs={props.durationMs}
            onTick={props.onTick}
            onFinish={props.onSpinEnd}
          />
        </div>
        <div className="lg:order-1">
          <StakeSlot
            items={props.stakeItems}
            balance={props.stakeBalance}
            total={stakeTotal}
            busy={busy}
            lost={status === 'loss'}
            onRemove={props.onRemoveItem}
          />
        </div>
        <div className="lg:order-3">
          <TargetSlot skin={props.target} busy={busy} won={status === 'win'} onClear={props.onClearTarget} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_minmax(260px,320px)_1fr] lg:gap-5">
        <div className="rounded-2xl border border-line bg-white/[0.02] px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{t('upgrade.balanceAmount')}</span>
            <span className="font-semibold tabular-nums text-amber-300">{formatMoney(props.stakeBalance)}</span>
          </div>
          <input
            type="range"
            className="range mt-2 w-full"
            min={0}
            max={Math.max(0, props.maxBalance)}
            step={0.01}
            value={props.stakeBalance}
            disabled={busy || props.maxBalance <= 0}
            onChange={(e) => props.onBalanceChange(Number(e.target.value))}
            aria-label={t('upgrade.balanceAmount')}
          />
        </div>

        <button
          type="button"
          onClick={props.onUpgrade}
          disabled={!ok || busy}
          className="btn btn-primary h-14 w-full text-lg lg:h-full"
        >
          <ChevronMark className="size-5" />
          {busy ? t('upgrade.rolling') : t('upgrade.button')}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-line bg-white/[0.02] p-2">
          {UPGRADE_MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              className="chip justify-center rounded-lg px-2.5"
              disabled={!canQuickPick}
              data-active={!!ok && Math.abs(ok.multiplier - m) / m < 0.1}
              onClick={() => props.onMultiplier(m)}
            >
              x{m}
            </button>
          ))}
          <span className="mx-0.5 h-6 w-px bg-white/10" />
          {CHANCE_PRESETS.map((c, i) => (
            <button
              key={c}
              type="button"
              className={cx('chip justify-center rounded-lg px-2.5', PRESET_TONES[i])}
              disabled={!canQuickPick}
              data-active={!!ok && Math.abs(ok.chance - c) < 3}
              onClick={() => props.onChancePreset(c)}
            >
              {c}%
            </button>
          ))}
        </div>
      </div>

      {!ok && !busy && (
        <p className="mt-3 text-center text-xs text-slate-500" role="status">
          {validation.ok ? null : t(`error.${validation.reason}`)}
        </p>
      )}
    </section>
  );
}
