import { Backpack, Crosshair, History } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../components/common';
import { SourcePicker } from '../components/SourcePicker';
import { TargetPicker } from '../components/TargetPicker';
import { useToast } from '../components/Toast';
import { UpgradeAnimation } from '../components/UpgradeAnimation';
import { UpgradeHistory } from '../components/UpgradeHistory';
import { UpgradePanel } from '../components/UpgradePanel';
import type { StakedItem } from '../components/UpgradePanel';
import type { WheelStatus } from '../components/UpgradeRoulette';
import { SKINS, getSkin } from '../data/skinData';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { HistoryEntry, Page, Skin, UpgradeOutcome } from '../types/types';
import { celebrate } from '../utils/effects';
import { useT } from '../i18n';
import { ROULETTE_DURATION_MS, ROULETTE_FAST_DURATION_MS } from '../utils/config';
import { formatSignedMoney, roundMoney } from '../utils/format';
import { itemValue } from '../utils/itemValue';
import { cx } from '../utils/ui';
import {
  findTargetForChance,
  findTargetForMultiplier,
  getLuckBonus,
  getStakeValue,
  validateUpgrade,
} from '../utils/upgradeEngine';

export interface UpgradeSelection {
  sourceUids: string[];
  targetId: string | null;
}

/** A partial update, or a function of the latest selection (safe for rapid consecutive clicks). */
export type SelectionChange = Partial<UpgradeSelection> | ((current: UpgradeSelection) => Partial<UpgradeSelection>);

interface UpgradeRun {
  outcome: UpgradeOutcome;
  stakeItems: StakedItem[];
  stakeBalance: number;
  target: Skin;
  phase: 'rolling' | 'result';
  entry: HistoryEntry | null;
}

interface UpgradePageProps {
  selection: UpgradeSelection;
  onSelectionChange: (change: SelectionChange) => void;
  onNavigate: (page: Page) => void;
  onOpenFreeCase: () => void;
}

export function UpgradePage({ selection, onSelectionChange, onNavigate, onOpenFreeCase }: UpgradePageProps) {
  const { state, startUpgrade, resolveUpgrade, updateSettings, freeCaseAvailable } = useStore();
  const t = useT();
  const toast = useToast();
  const sound = useSound();
  const [run, setRun] = useState<UpgradeRun | null>(null);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [pickerTab, setPickerTab] = useState<'source' | 'target'>('source');
  const runRef = useRef<UpgradeRun | null>(null);

  const selectedItems = useMemo<StakedItem[]>(
    () =>
      selection.sourceUids.flatMap((uid) => {
        const item = state.inventory.find((i) => i.uid === uid);
        const skin = getSkin(item?.skinId);
        return item && skin ? [{ uid, skin, value: itemValue(item) }] : [];
      }),
    [selection.sourceUids, state.inventory],
  );
  const selectedTarget = getSkin(selection.targetId) ?? null;
  const usableBalance = Math.min(balanceAmount, state.balance);

  const stakeItems = run?.stakeItems ?? selectedItems;
  const stakeBalance = run?.stakeBalance ?? usableBalance;
  const stakeTotal = getStakeValue({ values: stakeItems.map((s) => s.value), balance: stakeBalance });
  const target = run?.target ?? selectedTarget;
  // The shown chance must match the roll, so it uses the same luck bonus the store will apply.
  const luckBonus = run ? run.outcome.luckBonus : getLuckBonus(state.luck, stakeTotal);
  const validation = validateUpgrade(stakeTotal, target, luckBonus);
  const busy = run !== null;

  // Drop selected items that no longer exist (sold, reset, etc.).
  useEffect(() => {
    if (!run && selectedItems.length !== selection.sourceUids.length) {
      onSelectionChange({ sourceUids: selectedItems.map((s) => s.uid) });
    }
  }, [run, selectedItems, selection.sourceUids.length, onSelectionChange]);

  // Leaving the page mid-spin still settles the already-decided result.
  useEffect(
    () => () => {
      if (runRef.current?.phase !== 'rolling') return;
      const settled = resolveUpgrade();
      if (settled.ok) {
        const { entry } = settled.value;
        toast({
          type: entry.result === 'win' ? 'win' : 'loss',
          title: entry.result === 'win' ? t('upgrade.wonItem', { name: entry.toName }) : t('result.failed'),
          message: formatSignedMoney(entry.profit),
        });
      }
    },
    [resolveUpgrade, toast, t],
  );

  const handleUpgrade = () => {
    if (runRef.current || !selectedTarget) return;
    const check = validateUpgrade(stakeTotal, selectedTarget, luckBonus);
    if (!check.ok) {
      toast({ type: 'error', title: t(`error.${check.reason}`) });
      return;
    }
    const started = startUpgrade({
      sourceUids: selectedItems.map((s) => s.uid),
      balanceAmount: roundMoney(usableBalance),
      targetSkinId: selectedTarget.id,
    });
    if (!started.ok) {
      toast({ type: 'error', title: t(`error.${started.error}`) });
      return;
    }
    sound.play('click');
    const next: UpgradeRun = {
      outcome: started.value,
      stakeItems: selectedItems,
      stakeBalance: roundMoney(usableBalance),
      target: selectedTarget,
      phase: 'rolling',
      entry: null,
    };
    runRef.current = next;
    setRun(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const soundEnabled = state.settings.soundEnabled;
  const handleSpinEnd = useCallback(() => {
    const current = runRef.current;
    if (!current || current.phase !== 'rolling') return;
    const settled = resolveUpgrade();
    if (!settled.ok) {
      toast({ type: 'error', title: t(`error.${settled.error}`) });
      runRef.current = null;
      setRun(null);
      return;
    }
    const { entry, wonItem } = settled.value;
    const next: UpgradeRun = { ...current, phase: 'result', entry };
    runRef.current = next;
    setRun(next);
    setBalanceAmount(0);

    if (entry.result === 'win') {
      celebrate(current.target, soundEnabled);
      onSelectionChange({ sourceUids: wonItem ? [wonItem.uid] : [], targetId: null });
    } else {
      sound.play('lose');
      onSelectionChange({ sourceUids: [] });
      setPickerTab('source');
    }
  }, [resolveUpgrade, toast, sound, onSelectionChange, soundEnabled, t]);

  const handleContinue = useCallback(() => {
    runRef.current = null;
    setRun(null);
    if (freeCaseAvailable) onOpenFreeCase();
  }, [freeCaseAvailable, onOpenFreeCase]);

  const pickTarget = (found: Skin | undefined, label: string) => {
    if (!found) {
      toast({ type: 'warning', title: t('upgrade.noSkinFor', { label }) });
      return;
    }
    sound.play('click');
    onSelectionChange({ targetId: found.id });
    setPickerTab('target');
  };

  const toggleSource = (uid: string) => {
    if (busy) return;
    sound.play('click');
    onSelectionChange(({ sourceUids }) => ({
      sourceUids: sourceUids.includes(uid) ? sourceUids.filter((u) => u !== uid) : [...sourceUids, uid],
    }));
  };

  const status: WheelStatus = !run ? 'idle' : run.phase === 'rolling' ? 'rolling' : run.outcome.result === 'win' ? 'win' : 'loss';

  return (
    <div className="space-y-5">
      <UpgradePanel
        stakeItems={stakeItems}
        stakeBalance={stakeBalance}
        stakeTotal={stakeTotal}
        maxBalance={state.balance}
        onBalanceChange={(amount) => setBalanceAmount(roundMoney(amount))}
        onRemoveItem={(uid) => onSelectionChange(({ sourceUids }) => ({ sourceUids: sourceUids.filter((u) => u !== uid) }))}
        target={target}
        onClearTarget={() => onSelectionChange({ targetId: null })}
        validation={validation}
        status={status}
        outcome={run?.outcome ?? null}
        durationMs={state.settings.fastRoulette ? ROULETTE_FAST_DURATION_MS : ROULETTE_DURATION_MS}
        busy={busy}
        onUpgrade={handleUpgrade}
        onMultiplier={(m) => pickTarget(findTargetForMultiplier(SKINS, stakeTotal, m), `x${m}`)}
        onChancePreset={(c) => pickTarget(findTargetForChance(SKINS, stakeTotal, c, luckBonus), `${c}%`)}
        luckBonus={luckBonus}
        lossStreak={state.luck.lossStreak}
        soundEnabled={state.settings.soundEnabled}
        fastMode={state.settings.fastRoulette}
        onToggleSound={() => updateSettings({ soundEnabled: !state.settings.soundEnabled })}
        onToggleFast={() => updateSettings({ fastRoulette: !state.settings.fastRoulette })}
        onTick={() => sound.play('tick')}
        onSpinEnd={handleSpinEnd}
      />

      {run?.phase === 'result' && run.entry && (
        <UpgradeAnimation
          entry={run.entry}
          stakeSkin={run.stakeItems[0]?.skin ?? null}
          target={run.target}
          onContinue={handleContinue}
        />
      )}

      <div className="flex gap-2 lg:hidden" role="tablist">
        {(
          [
            ['source', t('upgrade.mySkins'), Backpack],
            ['target', t('upgrade.chooseSkin'), Crosshair],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pickerTab === id}
            className="chip flex-1 justify-center py-2.5 text-sm"
            data-active={pickerTab === id}
            onClick={() => setPickerTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cx(pickerTab !== 'source' && 'hidden lg:block')}>
          <SourcePicker
            selectedUids={selection.sourceUids}
            disabled={busy}
            onToggle={toggleSource}
            onClear={() => onSelectionChange({ sourceUids: [] })}
            onGoToShop={() => onNavigate('shop')}
            onOpenFreeCase={onOpenFreeCase}
          />
        </div>
        <div className={cx(pickerTab !== 'target' && 'hidden lg:block')}>
          <TargetPicker
            stakeValue={stakeTotal}
            luckBonus={luckBonus}
            selectedId={selection.targetId}
            disabled={busy}
            onSelect={(skin) => {
              sound.play('click');
              onSelectionChange({ targetId: skin.id === selection.targetId ? null : skin.id });
            }}
          />
        </div>
      </div>

      <section className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-white">
            <History size={18} className="text-amber-300" /> {t('upgrade.recent')}
          </h2>
          {state.history.length > 0 && (
            <button type="button" className="text-sm font-semibold text-amber-300 hover:text-amber-200" onClick={() => onNavigate('history')}>
              {t('common.viewAll')} →
            </button>
          )}
        </div>
        {state.history.length > 0 ? (
          <UpgradeHistory entries={state.history.slice(0, 5)} />
        ) : (
          <EmptyState icon={History} title={t('history.emptyTitle')} description={t('upgrade.recentEmpty')} className="py-8" />
        )}
      </section>
    </div>
  );
}
