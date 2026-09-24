import { CalendarHeart, Percent, Sparkles } from 'lucide-react';
import { activeSeasons, isWeekend, seasonEnd, WEEKEND_XP_MULTIPLIER } from '../data/events';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import type { Page } from '../types/types';

/** Slim strip with the events running right now; each chip leads to where the event is used. */
export function EventBar({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const t = useT();
  const locale = useStore().state.settings.language === 'ru' ? 'ru-RU' : 'en-US';
  const now = new Date();
  const seasons = activeSeasons(now);
  const chips: { key: string; icon: typeof Sparkles; text: string; page: Page }[] = [
    ...(isWeekend(now) ? [{ key: 'xp', icon: Sparkles, text: t('events.weekendXp', { m: WEEKEND_XP_MULTIPLIER }), page: 'games' as Page }] : []),
    ...seasons.map((s) => ({
      key: s.id,
      icon: CalendarHeart,
      text: t('events.season', { name: t(`events.name.${s.id}`), date: seasonEnd(s, now).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) }),
      page: 'cases' as Page,
    })),
    { key: 'flash', icon: Percent, text: t('events.flashDeal'), page: 'shop' },
  ];

  return (
    <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
      {chips.map(({ key, icon: Icon, text, page }) => (
        <button
          key={key}
          type="button"
          onClick={() => onNavigate(page)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
        >
          <Icon size={13} /> {text}
        </button>
      ))}
    </div>
  );
}
