import { Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SKINS } from '../data/skinData';
import { useT } from '../i18n';
import type { Skin } from '../types/types';
import { formatMoney } from '../utils/format';
import { createId, pickRandom, secureRandom } from '../utils/random';
import { calculateChance } from '../utils/upgradeEngine';
import { cx, rarityStyle } from '../utils/ui';
import { SkinImage } from './SkinImage';

const NICKNAMES = [
  's1mple_fan', 'headshot_kid', 'AWPer228', 'zeus_zeus', 'dropkick', 'nOObMaster', 'karambit_lord', 'eco_round',
  'ruslan_07', 'Dimka', 'pro100vlad', 'mirage_only', 'flashbang', 'n1ghtwolf', 'clutch_or_kick', 'sasha_ak',
  'ghost', 'molotov_x', 'retake', 'b1t_better', 'Artyom', 'Vanya_CS', 'tapok', 'deagle_god',
];

interface FeedEntry {
  id: string;
  nick: string;
  skin: Skin;
  chance: number;
  won: boolean;
}

// Players mostly target mid-priced skins; the pool excludes extreme jackpots.
const FEED_POOL = SKINS.filter((s) => s.price >= 0.5 && s.price <= 3000);

function randomEntry(): FeedEntry {
  const skin = pickRandom(FEED_POOL);
  const stake = skin.price * (0.1 + secureRandom() * 0.7);
  const chance = calculateChance(stake, skin.price);
  return { id: createId('feed'), nick: pickRandom(NICKNAMES), skin, chance, won: secureRandom() * 100 < chance };
}

const VISIBLE = 14;

/** Simulated live activity strip. The players are fake; it only adds atmosphere. */
export function LiveFeed() {
  const t = useT();
  const [entries, setEntries] = useState<FeedEntry[]>(() => Array.from({ length: VISIBLE }, randomEntry));

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setEntries((list) => [randomEntry(), ...list].slice(0, VISIBLE));
        schedule();
      }, 1800 + secureRandom() * 2600);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="border-b border-line bg-black/20" aria-label={t('feed.label')}>
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-hidden px-3 py-1.5 sm:px-5">
        <div className="flex shrink-0 items-center gap-1.5 pr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
          <Radio size={13} className="anim-pulse-glow" />
          <span className="hidden sm:inline">{t('feed.live')}</span>
        </div>
        <div className="flex min-w-0 gap-1.5">
          {entries.map((e, i) => (
            <div
              key={e.id}
              style={rarityStyle(e.skin.rarity)}
              title={`${e.nick} · ${e.skin.name} · ${e.chance.toFixed(2)}%`}
              className={cx(
                'relative flex w-[92px] shrink-0 flex-col items-center overflow-hidden rounded-lg border bg-white/[0.02] px-1 pb-1 pt-0.5',
                e.won ? 'border-emerald-500/30' : 'border-white/5 opacity-60',
                i === 0 && 'anim-ticker',
              )}
            >
              <SkinImage skin={e.skin} className="h-8 w-full" />
              <div className="w-full truncate text-center text-[9px] text-slate-400">{e.nick}</div>
              <div className={cx('text-[10px] font-bold tabular-nums', e.won ? 'text-emerald-400' : 'text-slate-500')}>
                {e.won ? formatMoney(e.skin.price) : `${e.chance.toFixed(0)}%`}
              </div>
              <div className="rarity-bar absolute inset-x-0 bottom-0 h-0.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
