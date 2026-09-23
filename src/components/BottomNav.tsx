import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useT } from '../i18n';
import type { Page } from '../types/types';
import { cx } from '../utils/ui';
import { LevelBadge } from './LevelBadge';
import { Modal } from './Modal';
import { MOBILE_PRIMARY, NAV_ITEMS } from './navigation';

interface BottomNavProps {
  page: Page;
  onNavigate: (page: Page) => void;
}

const PRIMARY = NAV_ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.page));

export function BottomNav({ page, onNavigate }: BottomNavProps) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const inMenu = !MOBILE_PRIMARY.includes(page);

  const tab = (active: boolean) =>
    cx(
      'relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition active:scale-95',
      active ? 'text-white' : 'text-slate-500',
    );
  const indicator = (
    <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_12px_rgb(var(--accent-rgb)/0.9)]" />
  );

  return (
    <>
      <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 lg:hidden" aria-label={t('nav.main')}>
        <div className="grid grid-cols-5">
          {PRIMARY.map(({ page: target, label, icon: Icon }) => (
            <button
              key={target}
              type="button"
              onClick={() => onNavigate(target)}
              aria-current={page === target ? 'page' : undefined}
              className={tab(page === target)}
            >
              {page === target && indicator}
              <Icon size={20} className={page === target ? 'text-amber-300' : undefined} />
              {t(label)}
            </button>
          ))}
          <button type="button" onClick={() => setMenuOpen(true)} className={tab(inMenu)} aria-haspopup="dialog">
            {inMenu && indicator}
            <Menu size={20} className={inMenu ? 'text-amber-300' : undefined} />
            {t('nav.more')}
          </button>
        </div>
      </nav>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={t('nav.menu')} size="sm">
        <div className="mb-4">
          <LevelBadge />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NAV_ITEMS.map(({ page: target, label, icon: Icon }) => (
            <button
              key={target}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onNavigate(target);
              }}
              className={cx(
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition',
                page === target ? 'border-amber-400/60 bg-amber-400/10 text-amber-200' : 'border-line bg-white/[0.02] text-slate-300',
              )}
            >
              <Icon size={20} />
              {t(label)}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
