import { CalendarCheck, Gift, Settings, UserRound } from 'lucide-react';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { Page } from '../types/types';
import { getDailyStatus } from '../utils/progression';
import { cx } from '../utils/ui';
import { Balance } from './Balance';
import { FortuneWheel } from './FortuneWheel';
import { Logo } from './Logo';

interface HeaderProps {
  page: Page;
  onNavigate: (page: Page) => void;
  onOpenFreeCase: () => void;
  onOpenDaily: () => void;
}

export function Header({ page, onNavigate, onOpenFreeCase, onOpenDaily }: HeaderProps) {
  const t = useT();
  const { state, freeCaseAvailable, updateSettings } = useStore();
  const dailyAvailable = getDailyStatus(state).available;
  const language = state.settings.language;

  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <Logo onClick={() => onNavigate('upgrade')} />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {freeCaseAvailable && (
            <button type="button" onClick={onOpenFreeCase} className="btn btn-primary anim-pulse-glow h-11 px-3 text-sm">
              <Gift size={16} />
              <span className="hidden sm:inline">{t('freeCase.button')}</span>
            </button>
          )}
          <FortuneWheel />
          <button
            type="button"
            onClick={onOpenDaily}
            aria-label={t('daily.title')}
            className={cx('btn btn-ghost relative size-11', dailyAvailable && 'border-amber-400/50 text-amber-300')}
          >
            <CalendarCheck size={18} />
            {dailyAvailable && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgb(var(--accent-rgb)/0.9)]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ language: language === 'ru' ? 'en' : 'ru' })}
            aria-label={t('settings.language')}
            className="btn btn-ghost hidden h-11 px-3 text-xs font-bold sm:inline-flex"
          >
            {language === 'ru' ? 'RU' : 'EN'}
          </button>
          <Balance />
          <button
            type="button"
            aria-label={t('nav.profile')}
            onClick={() => onNavigate('profile')}
            className={cx('btn btn-ghost hidden size-11 md:inline-flex', page === 'profile' && 'border-amber-400/40 text-white')}
          >
            <UserRound size={18} />
          </button>
          <button
            type="button"
            aria-label={t('nav.settings')}
            onClick={() => onNavigate('settings')}
            className={cx('btn btn-ghost hidden size-11 sm:inline-flex', page === 'settings' && 'border-amber-400/40 text-white')}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
