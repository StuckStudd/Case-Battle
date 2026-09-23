import { ArrowUpCircle, Gift } from 'lucide-react';
import { useState } from 'react';
import { RARITIES } from '../data/rarities';
import { getSkin } from '../data/skinData';
import { useT } from '../i18n';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/inventoryStore';
import type { InventoryItem } from '../types/types';
import { CASE_ODDS, FREE_CASE_ITEMS, randomCaseFiller } from '../utils/caseEngine';
import { CASE_ROULETTE_DURATION_MS, ROULETTE_FAST_DURATION_MS } from '../utils/config';
import { celebrate } from '../utils/effects';
import { rarityStyle } from '../utils/ui';
import { CaseRoulette } from './CaseRoulette';
import { DropReveal } from './DropReveal';
import { Modal } from './Modal';
import { SkinImage } from './SkinImage';
import { useToast } from './Toast';

const CASE_IMAGE =
  'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnAVvfb6aqduc_TFVjTCxbx05OU4S3jilE9w4DzRnImtIy2Sa1JzDJEhRPlK7EcO4U8gfA';

// One entry per skin: wear and StatTrak variants would otherwise repeat the same artwork.
const PREVIEW = [...FREE_CASE_ITEMS]
  .sort((a, b) => b.price - a.price)
  .filter((skin, i, list) => list.findIndex((s) => s.baseId === skin.baseId) === i)
  .slice(0, 6);

interface FreeCaseModalProps {
  open: boolean;
  onClose: () => void;
  onUpgradeItem: (uid: string) => void;
}

type Phase = { name: 'intro' } | { name: 'rolling'; item: InventoryItem } | { name: 'result'; item: InventoryItem };

export function FreeCaseModal({ open, onClose, onUpgradeItem }: FreeCaseModalProps) {
  const t = useT();
  const { state, openCase } = useStore();
  const sound = useSound();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });

  const close = () => {
    if (phase.name === 'rolling') return;
    setPhase({ name: 'intro' });
    onClose();
  };

  const handleOpen = () => {
    const result = openCase();
    if (!result.ok) {
      toast({ type: 'error', title: t(`error.${result.error}`) });
      close();
      return;
    }
    sound.play('click');
    setPhase({ name: 'rolling', item: result.value });
  };

  const handleFinish = () => {
    if (phase.name !== 'rolling') return;
    const skin = getSkin(phase.item.skinId);
    if (skin) celebrate(skin, state.settings.soundEnabled);
    setPhase({ name: 'result', item: phase.item });
  };

  const wonSkin = phase.name !== 'intro' ? getSkin(phase.item.skinId) : undefined;

  return (
    <Modal open={open} onClose={close} dismissible={phase.name !== 'rolling'} size="lg">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
          <Gift size={14} /> {t('freeCase.button')}
        </div>
        <h2 className="font-display text-3xl font-bold text-white">
          {phase.name === 'result' ? t('freeCase.gotSkin') : t('freeCase.title')}
        </h2>

        {phase.name === 'intro' && (
          <>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{t('freeCase.text')}</p>
            <img
              src={CASE_IMAGE}
              alt=""
              className="anim-float mx-auto my-5 h-36 object-contain drop-shadow-[0_18px_30px_rgb(var(--accent-rgb)/0.25)]"
            />
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('freeCase.topDrops')}</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PREVIEW.map((skin) => (
                <div key={skin.id} style={rarityStyle(skin.rarity)} className="rarity-card p-1.5">
                  <SkinImage skin={skin} className="h-12 w-full" />
                  <div className="truncate text-[10px] text-slate-400">{skin.finish}</div>
                  <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              {CASE_ODDS.map(({ rarity, weight }) => (
                <span key={rarity} style={rarityStyle(rarity)}>
                  <span className="rarity-text font-semibold">{RARITIES[rarity].short}</span> {weight}%
                </span>
              ))}
            </div>
            <button type="button" onClick={handleOpen} className="btn btn-primary mt-6 h-12 w-full text-base tracking-widest">
              {t('freeCase.open')}
            </button>
          </>
        )}

        {phase.name === 'rolling' && wonSkin && (
          <div className="my-6">
            <CaseRoulette
              winner={wonSkin}
              filler={randomCaseFiller}
              durationMs={state.settings.fastRoulette ? ROULETTE_FAST_DURATION_MS : CASE_ROULETTE_DURATION_MS}
              onTick={() => sound.play('tick')}
              onFinish={handleFinish}
            />
            <p className="mt-4 text-sm text-slate-500">{t('cases.opening')}</p>
          </div>
        )}

        {phase.name === 'result' && wonSkin && (
          <DropReveal skin={wonSkin}>
            <button
              type="button"
              className="btn btn-primary h-12"
              onClick={() => {
                const uid = phase.item.uid;
                close();
                onUpgradeItem(uid);
              }}
            >
              <ArrowUpCircle size={18} /> {t('common.upgradeIt')}
            </button>
            <button type="button" className="btn btn-ghost h-12" onClick={close}>
              {t('common.close')}
            </button>
          </DropReveal>
        )}
      </div>
    </Modal>
  );
}
