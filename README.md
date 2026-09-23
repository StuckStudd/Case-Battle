# Case Battle — CS2 Upgrader Simulator

A browser simulator of CS2 skin upgrades, cases, trade-up contracts and mini-games. All money is virtual. There are no deposits, withdrawals or Steam transactions. Progress is stored in your browser.

**▶ Play:** https://upgraader.netlify.app

![Upgrade](docs/screenshots/upgrade.png)

## Features

- **Upgrade:** stake several skins plus balance, with x2/x4/x8 and 35/55/75% presets. A small luck bonus kicks in after a losing streak.
- **1,895 skins:** every CS2 weapon, knife and glove finish, with Steam artwork. Prices come from real Skinport data, per wear (FN–BS) and StatTrak™, and range from $0.03 to $35,000. They drift a little every day.
- **Legendary items:** 16 one-of-a-kind items from $250K to $100M, such as Karambit «Blue Gem #387», StatTrak Howl with 4× iBUYPOWER Holo, and simulator prototypes.
- **53 cases:**
  - 42 official CS2 cases with their real contents and odds (Mil-Spec 79.92% … ★ 0.26%, StatTrak 10%);
  - 11 high-roller cases from $1 to $1,000,000.
- **Case battles** against bots, including on the most expensive cases.
- **Mini-games:**
  - Jackpot;
  - Duel 1v1;
  - Mega jackpot;
  - Crash with money or skins (up to x900);
  - Roulette;
  - Mines;
  - Plinko;
  - Coinflip.
- **Trade-up contracts, bot trades and stickers.** Stickers come from 4 capsules, including EMS Katowice 2014.
- **Rare patterns:** Ruby, Sapphire, Black Pearl, Blue Gem, Full Fade and ultra-low float.
- **Progression:**
  - levels;
  - 24 achievements;
  - daily bonus;
  - daily and weekly quests;
  - battle pass;
  - 114 collections;
  - a leaderboard with millionaire bots.
- **Interface:**
  - English and Russian;
  - 3 color themes;
  - sound packs;
  - save export and import;
  - installable as an app (PWA) with offline support.

| Shop & legends | Cases |
|---|---|
| ![Shop](docs/screenshots/shop.png) | ![Cases](docs/screenshots/cases.png) |
| **Mega jackpot** | **Leaderboard** |
| ![Mega jackpot](docs/screenshots/mega-jackpot.png) | ![Leaderboard](docs/screenshots/leaderboard.png) |

## Fairness

- **Decided before the animation.** Every outcome comes from `crypto.getRandomValues()` before the animation starts and is saved immediately, so reloading the page cannot change it.
- **Shown after the animation.** Winnings appear in your balance and inventory only once the animation finishes.
- **Return rates:**
  - cases and capsules return 90% of their price on average;
  - contracts return 95%;
  - jackpots, upgrades, crash and coinflip have about a 5% house edge;
  - roulette has about a 6.7% house edge (15 slots).
- **Where to tune them:** `src/utils/config.ts`, `src/data/cases.ts` and `src/data/capsules.ts`.

## Running locally

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type check and build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run catalog` | Re-download skins, cases, stickers and current prices |

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

Pages must be enabled once by hand: open **Settings → Pages** and set **Source** to **GitHub Actions**.

The build uses relative paths, so `dist/` also works on any other static host, such as Netlify, Vercel or Cloudflare Pages.

## Tech stack and structure

React 19, TypeScript, Vite, Tailwind CSS v4 and lucide-react. There is no backend: all state lives in LocalStorage.

```
src/
  data/        skin catalog, cases, stickers, legendary items, collections
  store/       game state: pure transitions and persistence
  utils/       upgrade, case, game and bot engines
  components/  UI: roulettes, games, cards
  pages/       app pages
  i18n/        EN / RU translations
scripts/
  build-catalog.mjs   catalog generator
public/
  sw.js, manifest     PWA
```

## Data sources

- Skins, cases and stickers: [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API).
- Prices: the public [Skinport](https://docs.skinport.com/) API.
- Images are loaded from the Steam CDN.

This is a fan project for entertainment only and is not affiliated with Valve or Steam. Counter-Strike and item names belong to their respective owners.
