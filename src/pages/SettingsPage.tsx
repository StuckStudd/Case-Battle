import { Database, Download, Gauge, Smartphone, Info, Languages, Music, Palette, RotateCcw, Upload, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PageHeader, Toggle } from '../components/common';
import { ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { Language, SoundPack, Theme } from '../types/types';
import {
  COINFLIP_PAYOUT,
  CRASH_RETURN,
  HOUSE_EDGE,
  LUCK_MAX_BONUS,
  LUCK_START_STREAK,
  LUCK_STEP,
  MAX_CHANCE,
  MIN_CHANCE,
  SELL_RATE,
  STARTING_BALANCE,
  STORAGE_VERSION,
} from '../utils/config';
import { formatMoney } from '../utils/format';
import { isStandalone, onInstallAvailability, promptInstall } from '../utils/pwa';
import { playSound, setSoundPack } from '../utils/sound';
import { cx } from '../utils/ui';

function SettingRow({ icon, title, description, control }: { icon: ReactNode; title: string; description: ReactNode; control: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-amber-300">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm text-slate-500">{description}</div>
      </div>
      {control}
    </div>
  );
}

const THEMES: { id: Theme; color: string }[] = [
  { id: 'yellow', color: '#ffc800' },
  { id: 'purple', color: '#a855f7' },
  { id: 'red', color: '#f43f5e' },
];
const PACKS: SoundPack[] = ['classic', 'retro', 'soft'];

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
];

export function SettingsPage({ onReset }: { onReset: () => void }) {
  const t = useT();
  const { state, updateSettings, resetAccount, persistenceAvailable, importSave } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<unknown>(null);
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => onInstallAvailability(setCanInstall), []);

  const exportSave = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cs2-upgrader-save-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ type: 'success', title: t('settings.exported') });
  };

  const readImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPendingImport(JSON.parse(await file.text()));
    } catch {
      toast({ type: 'error', title: t('error.importInvalid') });
    }
    if (fileInput.current) fileInput.current.value = '';
  };
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const { settings } = state;

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.settings')} />

      <section className="panel divide-y divide-white/5 px-5">
        <SettingRow
          icon={<Languages size={18} />}
          title={t('settings.language')}
          description={t('settings.languageHint')}
          control={
            <div className="flex gap-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => updateSettings({ language: lang.id })}
                  className={cx('chip', settings.language === lang.id && 'text-white')}
                  data-active={settings.language === lang.id}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          icon={settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          title={t('settings.sound')}
          description={t('settings.soundHint')}
          control={
            <Toggle
              label={t('settings.sound')}
              checked={settings.soundEnabled}
              onChange={(value) => {
                updateSettings({ soundEnabled: value });
                if (value) playSound('click');
              }}
            />
          }
        />
        <SettingRow
          icon={<Palette size={18} />}
          title={t('settings.theme')}
          description={t('settings.themeHint')}
          control={
            <div className="flex gap-1.5">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  aria-label={t(`theme.${theme.id}` as TKey)}
                  title={t(`theme.${theme.id}` as TKey)}
                  onClick={() => updateSettings({ theme: theme.id })}
                  className={cx('size-9 rounded-full ring-2 ring-offset-2 ring-offset-[#16171a] transition', settings.theme === theme.id ? 'ring-white' : 'ring-transparent')}
                  style={{ background: theme.color }}
                />
              ))}
            </div>
          }
        />
        <SettingRow
          icon={<Music size={18} />}
          title={t('settings.soundPack')}
          description={t('settings.soundPackHint')}
          control={
            <div className="flex gap-1">
              {PACKS.map((pack) => (
                <button
                  key={pack}
                  type="button"
                  className="chip"
                  data-active={settings.soundPack === pack}
                  onClick={() => {
                    updateSettings({ soundPack: pack });
                    setSoundPack(pack);
                    playSound('win');
                  }}
                >
                  {t(`soundPack.${pack}` as TKey)}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          icon={<Gauge size={18} />}
          title={t('settings.fast')}
          description={t('settings.fastHint')}
          control={<Toggle label={t('settings.fast')} checked={settings.fastRoulette} onChange={(value) => updateSettings({ fastRoulette: value })} />}
        />
      </section>

      <section className="panel flex flex-wrap items-center gap-4 p-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-amber-300">
          <Smartphone size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white">{t('pwa.title')}</div>
          <div className="text-sm text-slate-500">{isStandalone() ? t('pwa.installed') : canInstall ? t('pwa.hint') : t('pwa.manual')}</div>
        </div>
        {canInstall && (
          <button type="button" className="btn btn-primary h-11 px-5" onClick={() => void promptInstall()}>
            <Download size={16} /> {t('pwa.install')}
          </button>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Info size={18} className="text-amber-300" /> {t('settings.howChances')}
        </h2>
        <div className="rounded-xl border border-line bg-black/30 p-4 font-mono text-sm text-slate-300">
          {t('settings.formula', { factor: (1 - HOUSE_EDGE).toFixed(2) })}
        </div>
        <ul className="mt-3 space-y-1 text-sm text-slate-400">
          <li>• {t('settings.ruleEdge', { edge: (HOUSE_EDGE * 100).toFixed(0) })}</li>
          <li>• {t('settings.ruleLimits', { min: MIN_CHANCE, max: MAX_CHANCE })}</li>
          <li>• {t('settings.ruleRandom')}</li>
          <li>• {t('settings.ruleLuck', { start: LUCK_START_STREAK, step: LUCK_STEP * 100, max: LUCK_MAX_BONUS * 100 })}</li>
          <li>• {t('settings.ruleCases')}</li>
          <li>• {t('settings.ruleGames', { payout: COINFLIP_PAYOUT, edge: Math.round((1 - CRASH_RETURN) * 100) })}</li>
          <li>• {t('settings.ruleSell', { percent: Math.round(SELL_RATE * 100) })}</li>
          <li>• {t('settings.rulePrices')}</li>
        </ul>
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Database size={18} className="text-amber-300" /> {t('settings.data')}
        </h2>
        <p className="text-sm text-slate-400">
          {t('settings.dataText', { version: STORAGE_VERSION })}{' '}
          {persistenceAvailable ? (
            <span className="text-emerald-400">{t('settings.saving')}</span>
          ) : (
            <span className="text-amber-300">{t('settings.notSaving')}</span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost h-11 px-4" onClick={exportSave}>
            <Download size={16} /> {t('settings.export')}
          </button>
          <button type="button" className="btn btn-ghost h-11 px-4" onClick={() => fileInput.current?.click()}>
            <Upload size={16} /> {t('settings.import')}
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void readImport(e.target.files?.[0])} />
        </div>

        <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/[0.05] p-4">
          <div className="font-semibold text-rose-300">{t('settings.reset')}</div>
          <p className="mt-1 text-sm text-slate-400">{t('settings.resetText', { amount: formatMoney(STARTING_BALANCE) })}</p>
          <button type="button" className="btn btn-danger mt-4 h-11 px-5" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={16} /> {t('settings.reset')}
          </button>
        </div>
      </section>

      <p className="pb-2 text-center text-xs text-slate-600">{t('settings.footer')}</p>

      <ConfirmModal
        open={pendingImport !== null}
        title={t('settings.importTitle')}
        message={t('settings.importConfirm')}
        confirmLabel={t('settings.import')}
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          const result = importSave(pendingImport);
          setPendingImport(null);
          if (!result.ok) {
            toast({ type: 'error', title: t(`error.${result.error}`) });
            return;
          }
          toast({ type: 'success', title: t('settings.imported') });
        }}
      />

      <ConfirmModal
        open={confirmReset}
        tone="danger"
        title={t('settings.resetTitle')}
        message={t('settings.resetConfirm')}
        confirmLabel={t('settings.resetButton')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetAccount();
          onReset();
          toast({ type: 'info', title: t('settings.resetDone'), message: t('settings.resetDoneText', { amount: formatMoney(STARTING_BALANCE) }) });
        }}
      />
    </div>
  );
}
