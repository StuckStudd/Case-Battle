import { ArrowUpDown, Bomb, Building2, CircleDot, Coins, Crown, Gem, Rocket, Swords, Triangle } from 'lucide-react';
import { useState } from 'react';
import { Coinflip } from '../components/Coinflip';
import { PageHeader } from '../components/common';
import { Crash } from '../components/Crash';
import { Hilo } from '../components/Hilo';
import { Jackpot } from '../components/Jackpot';
import { Mines } from '../components/Mines';
import { Plinko } from '../components/Plinko';
import { Roulette } from '../components/Roulette';
import { Towers } from '../components/Towers';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useStore } from '../store/inventoryStore';

type Game = 'crash' | 'jackpot' | 'duel' | 'mega' | 'roulette' | 'mines' | 'towers' | 'hilo' | 'plinko' | 'coinflip';

const GAMES: [Game, TKey, typeof Rocket][] = [
  ['crash', 'games.crash', Rocket],
  ['jackpot', 'games.jackpot', Gem],
  ['duel', 'games.duel', Swords],
  ['mega', 'games.mega', Crown],
  ['roulette', 'games.roulette', CircleDot],
  ['mines', 'games.mines', Bomb],
  ['towers', 'games.towers', Building2],
  ['hilo', 'games.hilo', ArrowUpDown],
  ['plinko', 'games.plinko', Triangle],
  ['coinflip', 'games.coinflip', Coins],
];

export function GamesPage() {
  const t = useT();
  const { state } = useStore();
  // An unfinished mines game reopens its own tab.
  const [game, setGame] = useState<Game>(state.pendingMines ? 'mines' : state.pendingTowers ? 'towers' : state.pendingHilo ? 'hilo' : 'crash');

  return (
    <div>
      <PageHeader title={t('games.title')} subtitle={t('games.subtitle')} />
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1" role="tablist">
        {GAMES.map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={game === id} className="chip shrink-0 px-4 py-2.5 text-sm" data-active={game === id} onClick={() => setGame(id)}>
            <Icon size={15} /> {t(label)}
          </button>
        ))}
      </div>
      {game === 'crash' && <Crash />}
      {game === 'jackpot' && <Jackpot key="classic" />}
      {game === 'duel' && <Jackpot key="duel" mode="duel" />}
      {game === 'mega' && <Jackpot key="mega" mode="mega" />}
      {game === 'roulette' && <Roulette />}
      {game === 'mines' && <Mines />}
      {game === 'towers' && <Towers />}
      {game === 'hilo' && <Hilo />}
      {game === 'plinko' && <Plinko />}
      {game === 'coinflip' && <Coinflip />}
    </div>
  );
}
