import { Activity, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HOUR_MS, MARKET_HOUR, currentHour, marketEvent } from '../data/market';
import { useT } from '../i18n';

/** Today's market event and when prices move next. Prices belong to the hour the page was loaded. */
export function MarketBanner() {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const event = marketEvent(Math.floor(MARKET_HOUR / 24));
  const stale = currentHour(now) !== MARKET_HOUR;
  const minutes = Math.max(1, Math.ceil(((MARKET_HOUR + 1) * HOUR_MS - now) / 60_000));
  const up = event.multiplier > 1;
  const percent = Math.round((event.multiplier - 1) * 100);

  return (
    <section className="panel mb-4 flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${event.id === 'calm' ? 'bg-white/[0.04] text-slate-300' : up ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
        {event.id === 'calm' ? <Activity size={18} /> : up ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-slate-500">{t('market.eventOfDay')}</div>
        <div className="font-semibold text-white">
          {t(`market.event.${event.id}`, { collection: event.collection ?? '' })}
          {event.id !== 'calm' && (
            <span className={up ? 'ml-2 text-emerald-400' : 'ml-2 text-rose-400'}>
              {up ? '+' : ''}
              {percent}%
            </span>
          )}
        </div>
      </div>
      {stale ? (
        <button type="button" className="btn btn-primary h-10 px-4 text-sm" onClick={() => window.location.reload()}>
          <RefreshCw size={15} /> {t('market.refresh')}
        </button>
      ) : (
        <div className="text-xs text-slate-400">{t('market.nextUpdate', { minutes })}</div>
      )}
    </section>
  );
}
